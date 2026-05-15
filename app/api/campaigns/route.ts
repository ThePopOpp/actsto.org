import { NextResponse } from "next/server";

import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { notifyIncompleteCampaignDraft } from "@/lib/campaigns/notifications";
import { getActSession } from "@/lib/auth/session-server";
import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { slugifyCampaignSlug } from "@/lib/dashboard/campaign-editor";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function date(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function uniqueCampaignSlug(base: string) {
  let slug = base;
  let suffix = 2;
  while (await prisma.campaign.findUnique({ where: { slug }, select: { id: true } }).catch(() => null)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function profileForSession(email: string) {
  return prisma.profile.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, displayName: true, fullName: true, phone: true },
  });
}

export async function POST(request: Request) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Please sign in before creating a campaign." }, { status: 401 });

  const profile = await profileForSession(session.email);
  if (!profile) return NextResponse.json({ error: "Profile record could not be loaded." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { values?: Partial<CampaignFormValues> } | null;
  const raw = body?.values ?? {};
  const values: CampaignFormValues = {
    slug: text(raw.slug),
    title: text(raw.title),
    description: text(raw.description),
    tagline: text(raw.tagline),
    excerpt: text(raw.excerpt),
    startDate: text(raw.startDate),
    endDate: text(raw.endDate),
    goal: text(raw.goal),
    image: text(raw.image),
    galleryText: text(raw.galleryText),
    parentName: text(raw.parentName) || profile.displayName || profile.fullName || session.name,
    parentEmail: text(raw.parentEmail) || profile.email,
    parentPhone: text(raw.parentPhone) || profile.phone || "",
    parentPhoto: text(raw.parentPhoto),
    studentFirstName: text(raw.studentFirstName),
    studentLastName: text(raw.studentLastName),
    studentNickname: text(raw.studentNickname),
    studentGrade: text(raw.studentGrade),
    studentSchool: text(raw.studentSchool),
    studentIndividualGoal: text(raw.studentIndividualGoal),
    studentIndividualRaised: text(raw.studentIndividualRaised),
    studentPhoto: text(raw.studentPhoto),
    schoolName: text(raw.schoolName),
    schoolAddress: text(raw.schoolAddress),
    schoolWebsite: text(raw.schoolWebsite),
    schoolLogo: text(raw.schoolLogo),
  };

  const completion = calculateCampaignCompletion(values);
  const baseSlug = slugifyCampaignSlug(values.slug, values.title || `${values.parentName || "family"} campaign`);
  const slug = await uniqueCampaignSlug(baseSlug);
  const schoolName = values.schoolName || values.studentSchool;

  const campaign = await prisma.$transaction(async (tx) => {
    await tx.userRoleRecord.upsert({
      where: { userId_role: { userId: profile.id, role: "parent" } },
      create: {
        userId: profile.id,
        role: "parent",
        status: "active",
        completionPercent: completion.percent,
        isComplete: completion.readyForReview,
      },
      update: {
        status: "active",
        completionPercent: Math.max(completion.percent, 1),
        isComplete: completion.readyForReview,
      },
    });

    await tx.accountSetupProgress.upsert({
      where: { userId_role: { userId: profile.id, role: "parent" } },
      create: {
        userId: profile.id,
        role: "parent",
        requiredFields: ["Campaign draft"],
        completedFields: completion.percent > 0 ? ["Campaign draft"] : [],
        missingFields: completion.missingFields,
        completionPercent: completion.percent,
        lastCheckedAt: new Date(),
      },
      update: {
        missingFields: completion.missingFields,
        completionPercent: completion.percent,
        lastCheckedAt: new Date(),
      },
    });

    let schoolId: string | null = null;
    if (schoolName) {
      const schoolSlug = slugifyCampaignSlug("", schoolName);
      const school = await tx.school.upsert({
        where: { slug: schoolSlug },
        create: {
          name: schoolName,
          slug: schoolSlug,
          addressLine1: values.schoolAddress || null,
          website: values.schoolWebsite || null,
          logoUrl: values.schoolLogo || null,
          status: "pending",
        },
        update: {
          name: schoolName,
          addressLine1: values.schoolAddress || null,
          website: values.schoolWebsite || null,
          logoUrl: values.schoolLogo || null,
        },
        select: { id: true },
      });
      schoolId = school.id;
    }

    const created = await tx.campaign.create({
      data: {
        createdByUserId: profile.id,
        schoolId,
        title: values.title || "Untitled campaign",
        slug,
        tagline: values.tagline || null,
        shortExcerpt: values.excerpt || null,
        story: values.description || null,
        status: "draft",
        startsAt: date(values.startDate),
        endsAt: date(values.endDate),
        goalAmount: money(values.goal) || 1000,
        featuredImageUrl: values.image || null,
        isPublic: false,
        completionPercent: completion.percent,
        missingFields: completion.missingFields,
      },
      select: { id: true, slug: true, title: true },
    });

    if (values.image) {
      await tx.campaignMedia.create({
        data: {
          campaignId: created.id,
          mediaType: "featured_image",
          fileUrl: values.image,
          uploadedBy: profile.id,
        },
      });
    }

    const gallery = values.galleryText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const [index, fileUrl] of gallery.entries()) {
      await tx.campaignMedia.create({
        data: {
          campaignId: created.id,
          mediaType: "gallery_image",
          fileUrl,
          sortOrder: index,
          uploadedBy: profile.id,
        },
      });
    }

    if (values.studentFirstName) {
      const student = await tx.student.create({
        data: {
          parentUserId: profile.id,
          schoolId,
          firstName: values.studentFirstName,
          lastName: values.studentLastName || null,
          nickname: values.studentNickname || null,
          grade: values.studentGrade || null,
          profilePhotoUrl: values.studentPhoto || null,
          phone: normalizePhone(values.parentPhone) || null,
          phoneNormalized: normalizePhone(values.parentPhone) || null,
          createdBy: profile.id,
          status: "draft",
        },
        select: { id: true },
      });
      await tx.campaignStudent.create({
        data: {
          campaignId: created.id,
          studentId: student.id,
          individualGoal: money(values.studentIndividualGoal) || money(values.goal) || 1000,
          amountAllocated: money(values.studentIndividualRaised),
        },
      });
    }

    return created;
  });

  if (!completion.readyForReview) {
    await notifyIncompleteCampaignDraft({
      userId: profile.id,
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      campaignTitle: campaign.title,
      email: values.parentEmail || profile.email,
      phone: values.parentPhone || profile.phone,
      missingFields: completion.missingFields,
    });
  }

  return NextResponse.json({
    ok: true,
    campaign,
    completion,
    redirect: `/dashboard/parent/campaigns/${campaign.slug}/edit`,
  });
}
