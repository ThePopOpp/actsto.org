import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

type CampaignMatch = { id: string; title: string } | null;

export type SmsContactMatch = {
  userId: string | null;
  profileId: string | null;
  roleType: string | null;
  campaignId: string | null;
  campaignTitle: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactSource: string | null;
  matchedPhone: string | null;
};

function displayName(profile: {
  displayName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    profile.displayName?.trim() ||
    profile.fullName?.trim() ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    null
  );
}

function preferredRole(profile: {
  activeAccountType?: string | null;
  primaryAccountType?: string | null;
  userRoles?: { role: string; status: string }[];
}) {
  const activeRoles = profile.userRoles?.filter((role) => role.status === "active") ?? [];
  const preferredOrder = ["parent", "student", "individual_donor", "donor_individual", "business_donor", "donor_business", "super_admin"];
  return (
    activeRoles.sort((a, b) => preferredOrder.indexOf(a.role) - preferredOrder.indexOf(b.role))[0]?.role ||
    profile.activeAccountType ||
    profile.primaryAccountType ||
    null
  );
}

async function campaignForProfile(profileId: string): Promise<CampaignMatch> {
  const directCampaign = await prisma.campaign.findFirst({
    where: { createdByUserId: profileId, status: { in: ["active", "pending_review", "draft"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
  if (directCampaign) return directCampaign;

  const student = await prisma.student.findFirst({
    where: { studentUserId: profileId },
    select: { id: true },
  });
  if (!student) return null;

  const campaignStudent = await prisma.campaignStudent.findFirst({
    where: {
      studentId: student.id,
      campaign: { status: { in: ["active", "pending_review", "draft"] } },
    },
    orderBy: { updatedAt: "desc" },
    select: { campaign: { select: { id: true, title: true } } },
  });
  return campaignStudent?.campaign ?? null;
}

async function campaignForSchool(schoolId: string): Promise<CampaignMatch> {
  return prisma.campaign.findFirst({
    where: { schoolId, status: { in: ["active", "pending_review", "draft"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
}

function profileMatch({
  profile,
  matchedPhone,
  contactSource,
  campaign,
}: {
  profile: {
    id: string;
    email: string;
    displayName: string | null;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    activeAccountType: string | null;
    primaryAccountType: string | null;
    userRoles: { role: string; status: string }[];
  };
  matchedPhone: string;
  contactSource: string;
  campaign: CampaignMatch;
}): SmsContactMatch {
  return {
    userId: profile.id,
    profileId: profile.id,
    roleType: preferredRole(profile),
    campaignId: campaign?.id ?? null,
    campaignTitle: campaign?.title ?? null,
    contactName: displayName(profile),
    contactEmail: profile.email,
    contactSource,
    matchedPhone,
  };
}

export async function resolveSmsContact(phone: string): Promise<SmsContactMatch> {
  const matchedPhone = normalizePhone(phone);
  const empty: SmsContactMatch = {
    userId: null,
    profileId: null,
    roleType: null,
    campaignId: null,
    campaignTitle: null,
    contactName: null,
    contactEmail: null,
    contactSource: null,
    matchedPhone: matchedPhone || null,
  };
  if (!matchedPhone) return empty;

  const profile = await prisma.profile.findFirst({
    where: { phoneNormalized: matchedPhone },
    orderBy: { updatedAt: "desc" },
    include: { userRoles: true },
  });
  if (profile) {
    return profileMatch({
      profile,
      matchedPhone,
      contactSource: "profiles.phone",
      campaign: await campaignForProfile(profile.id),
    });
  }

  const business = await prisma.businessDonorProfile.findFirst({
    where: { businessPhoneNormalized: matchedPhone },
    orderBy: { updatedAt: "desc" },
    include: { profile: { include: { userRoles: true } } },
  });
  if (business) {
    return profileMatch({
      profile: business.profile,
      matchedPhone,
      contactSource: "business_donor_profiles.business_phone",
      campaign: await campaignForProfile(business.userId),
    });
  }

  const billing = await prisma.donorBillingProfile.findFirst({
    where: { phoneNormalized: matchedPhone },
    orderBy: { updatedAt: "desc" },
  });
  if (billing) {
    const billingProfile = await prisma.profile.findUnique({
      where: { id: billing.userId },
      include: { userRoles: true },
    });
    if (billingProfile) {
      return profileMatch({
        profile: billingProfile,
        matchedPhone,
        contactSource: "donor_billing_profiles.phone",
        campaign: await campaignForProfile(billingProfile.id),
      });
    }
  }

  const student = await prisma.student.findFirst({
    where: { phoneNormalized: matchedPhone, studentUserId: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, firstName: true, lastName: true, studentUserId: true },
  });
  if (student?.studentUserId) {
    const studentProfile = await prisma.profile.findUnique({
      where: { id: student.studentUserId },
      include: { userRoles: true },
    });
    if (studentProfile) {
      return profileMatch({
        profile: studentProfile,
        matchedPhone,
        contactSource: "students.phone",
        campaign: await campaignForProfile(studentProfile.id),
      });
    }
  }

  const school = await prisma.school.findFirst({
    where: { phoneNormalized: matchedPhone },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, email: true },
  });
  if (school) {
    const campaign = await campaignForSchool(school.id);
    return {
      ...empty,
      roleType: "school",
      campaignId: campaign?.id ?? null,
      campaignTitle: campaign?.title ?? null,
      contactName: school.name,
      contactEmail: school.email,
      contactSource: "schools.phone",
    };
  }

  return empty;
}
