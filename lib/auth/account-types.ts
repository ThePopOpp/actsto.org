import { Prisma } from "@prisma/client";

import { dashboardPathForRole } from "@/lib/auth/paths";
import {
  PORTAL_ROLES,
  PORTAL_SWITCHER_LABEL,
  type PortalRole,
} from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export type AccountTypeStatus = "active" | "available";

export type AccountTypeSummary = {
  role: PortalRole;
  label: string;
  status: AccountTypeStatus;
  isActive: boolean;
  isComplete: boolean;
  completionPercent: number;
  requiredFields: string[];
  completedFields: string[];
  missingFields: string[];
  dashboardHref: string;
};

type ProfileForCompletion = Prisma.ProfileGetPayload<{
  include: {
    userRoles: true;
    accountSetupProgress: true;
    parentGuardianProfile: true;
    individualDonorProfile: true;
    businessDonorProfile: true;
  };
}>;

const FIELD_LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  relationship: "Relationship to student",
  student: "Linked student",
  school: "School",
  grade: "Grade level",
  billing: "Billing profile",
  arizona: "Arizona resident confirmation",
  filing: "Filing status",
  business: "Business name",
  authorized: "Authorized contact",
  ein: "EIN / Tax ID",
} as const;

const REQUIRED_FIELDS: Record<PortalRole, (keyof typeof FIELD_LABELS)[]> = {
  parent: ["name", "email", "phone", "address", "relationship", "student"],
  student: ["name", "email", "school", "grade"],
  donor_individual: ["name", "email", "phone", "billing", "arizona", "filing"],
  donor_business: ["business", "authorized", "email", "phone", "address", "ein"],
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAddress(value?: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null): boolean {
  return !!value && hasText(value.addressLine1) && hasText(value.city) && hasText(value.state) && hasText(value.zip);
}

function fieldIsComplete(profile: ProfileForCompletion, role: PortalRole, field: keyof typeof FIELD_LABELS): boolean {
  const parent = profile.parentGuardianProfile;
  const individual = profile.individualDonorProfile;
  const business = profile.businessDonorProfile;

  switch (field) {
    case "name":
      return hasText(profile.fullName) || hasText(profile.displayName) || hasText(profile.firstName);
    case "email":
      return hasText(profile.email);
    case "phone":
      return role === "donor_business" ? hasText(business?.businessPhone) || hasText(profile.phone) : hasText(profile.phone);
    case "address":
      return role === "donor_business" ? hasAddress(business) : hasAddress(parent);
    case "relationship":
      return hasText(parent?.relationshipToStudent);
    case "student":
      return false;
    case "school":
      return false;
    case "grade":
      return false;
    case "billing":
      return hasText(profile.firstName) && hasText(profile.lastName);
    case "arizona":
      return individual?.azResident === true;
    case "filing":
      return hasText(individual?.filingStatus);
    case "business":
      return hasText(business?.businessName);
    case "authorized":
      return hasText(business?.businessTitle) || hasText(profile.fullName) || hasText(profile.firstName);
    case "ein":
      return hasText(business?.ein);
    default:
      return false;
  }
}

export function calculateAccountTypeProgress(profile: ProfileForCompletion, role: PortalRole) {
  const required = REQUIRED_FIELDS[role];
  const completed = required.filter((field) => fieldIsComplete(profile, role, field));
  const missing = required.filter((field) => !completed.includes(field));
  const completionPercent = required.length === 0 ? 0 : Math.round((completed.length / required.length) * 100);

  return {
    completionPercent,
    isComplete: missing.length === 0,
    requiredFields: required.map((field) => FIELD_LABELS[field]),
    completedFields: completed.map((field) => FIELD_LABELS[field]),
    missingFields: missing.map((field) => FIELD_LABELS[field]),
  };
}

export async function ensureRoleScaffold(userId: string, role: PortalRole) {
  await prisma.userRoleRecord.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role, status: "active" },
    update: { status: "active" },
  });

  if (role === "parent") {
    await prisma.parentGuardianProfile.upsert({
      where: { userId },
      create: { userId, profileStatus: "incomplete" },
      update: {},
    });
  } else if (role === "donor_individual") {
    await prisma.individualDonorProfile.upsert({
      where: { userId },
      create: { userId, profileStatus: "incomplete" },
      update: {},
    });
  } else if (role === "donor_business") {
    await prisma.businessDonorProfile.upsert({
      where: { userId },
      create: { userId, profileStatus: "incomplete" },
      update: {},
    });
  }
}

export async function syncAccountSetupProgress(userId: string, role: PortalRole) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      userRoles: true,
      accountSetupProgress: true,
      parentGuardianProfile: true,
      individualDonorProfile: true,
      businessDonorProfile: true,
    },
  });

  if (!profile) return null;

  const progress = calculateAccountTypeProgress(profile, role);

  await prisma.accountSetupProgress.upsert({
    where: { userId_role: { userId, role } },
    create: {
      userId,
      role,
      requiredFields: progress.requiredFields,
      completedFields: progress.completedFields,
      missingFields: progress.missingFields,
      completionPercent: progress.completionPercent,
      lastCheckedAt: new Date(),
    },
    update: {
      requiredFields: progress.requiredFields,
      completedFields: progress.completedFields,
      missingFields: progress.missingFields,
      completionPercent: progress.completionPercent,
      lastCheckedAt: new Date(),
    },
  });

  await prisma.userRoleRecord.update({
    where: { userId_role: { userId, role } },
    data: {
      completionPercent: progress.completionPercent,
      isComplete: progress.isComplete,
    },
  }).catch(() => {});

  return progress;
}

export async function getAccountTypeSummaries(userId: string): Promise<AccountTypeSummary[]> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      userRoles: { where: { status: "active" } },
      accountSetupProgress: true,
      parentGuardianProfile: true,
      individualDonorProfile: true,
      businessDonorProfile: true,
    },
  });

  if (!profile) return [];

  const assigned = new Set(profile.userRoles.map((row) => row.role).filter((role): role is PortalRole => {
    return (PORTAL_ROLES as readonly string[]).includes(role);
  }));

  return PORTAL_ROLES.map((role) => {
    const fresh = calculateAccountTypeProgress(profile, role);
    const isActive = assigned.has(role);
    const completionPercent = isActive ? fresh.completionPercent : 0;
    const missingFields = isActive ? fresh.missingFields : fresh.requiredFields;

    return {
      role,
      label: PORTAL_SWITCHER_LABEL[role],
      status: isActive ? "active" : "available",
      isActive,
      isComplete: isActive ? fresh.isComplete : false,
      completionPercent,
      requiredFields: fresh.requiredFields,
      completedFields: isActive ? fresh.completedFields : [],
      missingFields,
      dashboardHref: dashboardPathForRole(role),
    };
  });
}
