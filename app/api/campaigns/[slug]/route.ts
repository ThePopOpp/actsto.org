import { NextResponse } from "next/server";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { editableCampaignWhere } from "@/lib/dashboard/parent-scope";
import { getActSession } from "@/lib/auth/session-server";
import type { Campaign } from "@/lib/campaigns";
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { notifyIncompleteCampaignDraft } from "@/lib/campaigns/notifications";
import { campaignToFormValues, slugifyCampaignSlug } from "@/lib/dashboard/campaign-editor";
import { normalizeGradeInput } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { canCreateSchoolLevelCampaign } from "@/lib/schools/permissions";
import { parseSchoolDetails } from "@/lib/schools/details";
import { resolveSchool } from "@/lib/schools/resolve";
import {
  createFamilyStudent,
  filterOwnedStudentIds,
  findFamilyStudentByName,
} from "@/lib/students/parent-students";
import { normalizePhone } from "@/lib/sms/twilio";
import { campaignEndDateError } from "@/lib/campaign-dates";

function isCampaign(value: unknown): value is Campaign {
  return Boolean(
    value &&
      typeof value === "object" &&
      "slug" in value &&
      "title" in value &&
      "parent" in value,
  );
}

function money(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function date(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function profileForSession(email: string) {
  return prisma.profile.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, displayName: true, fullName: true, phone: true, isSuperAdmin: true },
  });
}


async function updateNormalizedCampaign({
  slug,
  campaign,
  sessionEmail,
}: {
  slug: string;
  campaign: Campaign;
  sessionEmail: string;
}) {
  const profile = await profileForSession(sessionEmail);
  if (!profile) return null;

  const existing = await prisma.campaign.findUnique({
    where: { slug },
    include: { campaignStudents: { include: { student: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return null;

  const isAdmin = profile.isSuperAdmin || canAccessSuperAdminDashboard(sessionEmail);
  // The creator, or an administrator of the school a school-level campaign is for.
  const canEdit =
    isAdmin ||
    existing.createdByUserId === profile.id ||
    Boolean(
      existing.isSchoolLevel &&
        (await prisma.campaign.count({ where: { id: existing.id, ...editableCampaignWhere(profile.id) } })),
    );
  if (!canEdit) {
    return NextResponse.json({ error: "You do not have access to edit this campaign." }, { status: 403 });
  }

  // Measured from the stored start date, which this editor does not change.
  const endDateError = campaignEndDateError(existing.startsAt ?? existing.createdAt, campaign.endDate);
  if (endDateError) return NextResponse.json({ error: endDateError }, { status: 400 });

  const formValues = campaignToFormValues(campaign);
  const completion = calculateCampaignCompletion(formValues);
  const nextSlug = slugifyCampaignSlug(campaign.slug, campaign.title);
  // The school picked from the list, or one matched or created (pending) from
  // a typed name. A shared school's details are never overwritten from here.
  const schoolId = await resolveSchool(prisma, {
    id: campaign.school.id ?? null,
    name: campaign.school.name,
    address: campaign.school.address,
    website: campaign.school.website,
    logo: campaign.school.logo,
    details: campaign.school.id ? null : parseSchoolDetails(campaign.school.details),
  });

  // Switching to or from a school-level campaign is a staff decision.
  const wantsSchoolLevel = typeof campaign.isSchoolLevel === "boolean" ? campaign.isSchoolLevel : existing.isSchoolLevel;
  if (wantsSchoolLevel !== existing.isSchoolLevel) {
    const session = await getActSession();
    const allowed = session ? await canCreateSchoolLevelCampaign(session, profile.id, schoolId) : false;
    if (!allowed) {
      return NextResponse.json(
        { error: "Only ACT staff or the school's administrators can change whether a campaign is school-level." },
        { status: 403 },
      );
    }
  }
  if (wantsSchoolLevel && !schoolId) {
    return NextResponse.json({ error: "A school-level campaign needs its school." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.campaign.update({
      where: { id: existing.id },
      data: {
        schoolId,
        isSchoolLevel: wantsSchoolLevel,
        title: campaign.title.trim() || "Untitled campaign",
        slug: nextSlug,
        tagline: campaign.tagline.trim() || null,
        shortExcerpt: campaign.excerpt.trim() || null,
        story: campaign.description.trim() || null,
        endsAt: date(campaign.endDate),
        goalAmount: money(campaign.goal) || 1000,
        featuredImageUrl: campaign.image || null,
        completionPercent: completion.percent,
        missingFields: completion.missingFields,
      },
      select: { id: true, slug: true, title: true },
    });

    await tx.campaignMedia.deleteMany({ where: { campaignId: existing.id } });
    if (campaign.image) {
      await tx.campaignMedia.create({
        data: {
          campaignId: existing.id,
          mediaType: "featured_image",
          fileUrl: campaign.image,
          uploadedBy: profile.id,
        },
      });
    }
    for (const [index, fileUrl] of campaign.gallery.filter(Boolean).entries()) {
      await tx.campaignMedia.create({
        data: {
          campaignId: existing.id,
          mediaType: "gallery_image",
          fileUrl,
          sortOrder: index,
          uploadedBy: profile.id,
        },
      });
    }

    // Reconcile the whole student list, not just the first one.
    //
    // Rows that carry an `id` are students already on the family's account —
    // they are re-linked and updated in place, so putting the same child on a
    // second campaign reuses one student record instead of duplicating them.
    // Rows without an id are new children. Links the parent removed are
    // detached from the campaign, but the student record itself stays on the
    // account so their history and any other campaign survive.
    const ownedIds = await filterOwnedStudentIds(
      tx,
      existing.createdByUserId,
      campaign.students.map((student) => student.id).filter((id): id is string => Boolean(id)),
    );
    const linkedIds = new Set(existing.campaignStudents.map((link) => link.studentId));
    const fallbackGoal = money(campaign.goal) || 1000;
    const keptStudentIds = new Set<string>();

    // A school-level campaign has no students of its own to reconcile.
    for (const [index, formStudent] of (wantsSchoolLevel ? [] : campaign.students).entries()) {
      const claimedId = formStudent.id?.trim();
      const matchedId = claimedId
        ? null
        : (
            await findFamilyStudentByName(
              tx,
              existing.createdByUserId,
              formStudent.firstName ?? "",
              formStudent.lastName,
            )
          )?.id ?? null;
      const resolvedId =
        claimedId && (ownedIds.has(claimedId) || linkedIds.has(claimedId)) ? claimedId : matchedId;

      // "Student" is the placeholder a blank row picks up on its way through
      // the form. Drop those, but never drop a row that resolves to a real
      // student — that would quietly detach a child the parent still has on
      // the campaign. Their saved name is kept instead of being overwritten.
      const typedName = formStudent.firstName?.trim();
      const firstName = typedName && typedName !== "Student" ? typedName : null;
      if (!firstName && !resolvedId) continue;
      const individualGoal = money(formStudent.individualGoal) || Math.round(fallbackGoal / Math.max(1, campaign.students.length));
      const photo = formStudent.photo || null;

      let studentId = resolvedId;
      if (studentId) {
        // The student may be linked here already, or may have been matched by
        // name from elsewhere on the account — either way read their own record
        // so their existing school and phone are preserved rather than replaced
        // with this campaign's.
        const current =
          existing.campaignStudents.find((link) => link.studentId === studentId)?.student ??
          (await tx.student.findUnique({
            where: { id: studentId },
            select: { schoolId: true, phone: true, phoneNormalized: true },
          }));
        await tx.student.update({
          where: { id: studentId },
          data: {
            // Only adopt the campaign's school when the child has none of their
            // own — siblings can attend different schools.
            schoolId: current?.schoolId ?? schoolId,
            ...(firstName ? { firstName } : {}),
            lastName: formStudent.lastName || null,
            nickname: formStudent.nickname || null,
            grade: normalizeGradeInput(formStudent.gradeDisplay),
            profilePhotoUrl: photo,
            phone: normalizePhone(campaign.parent.phone) || current?.phone || null,
            phoneNormalized: normalizePhone(campaign.parent.phone) || current?.phoneNormalized || null,
          },
        });
      } else {
        if (!firstName) continue;
        const created = await createFamilyStudent(tx, existing.createdByUserId, {
          firstName,
          lastName: formStudent.lastName || null,
          nickname: formStudent.nickname || null,
          grade: normalizeGradeInput(formStudent.gradeDisplay),
          profilePhotoUrl: photo,
          schoolId,
          phone: normalizePhone(campaign.parent.phone),
        });
        studentId = created.id;
      }

      keptStudentIds.add(studentId);
      await tx.campaignStudent.upsert({
        where: { campaignId_studentId: { campaignId: existing.id, studentId } },
        create: {
          campaignId: existing.id,
          studentId,
          individualGoal,
          amountAllocated: money(formStudent.individualRaised),
          sortOrder: index,
        },
        update: { individualGoal, sortOrder: index },
      });
    }

    // Detach students the parent removed — the child record is untouched.
    const removedIds = wantsSchoolLevel ? [] : [...linkedIds].filter((id) => !keptStudentIds.has(id));
    if (removedIds.length > 0) {
      await tx.campaignStudent.deleteMany({
        where: { campaignId: existing.id, studentId: { in: removedIds } },
      });
    }

    return updatedCampaign;
  });

  if (!completion.readyForReview) {
    await notifyIncompleteCampaignDraft({
      userId: existing.createdByUserId,
      campaignId: existing.id,
      campaignSlug: updated.slug,
      campaignTitle: updated.title,
      email: campaign.parent.email || profile.email,
      phone: campaign.parent.phone || profile.phone,
      missingFields: completion.missingFields,
    });
  }

  return NextResponse.json({ campaign: { ...campaign, slug: updated.slug }, completion });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as { campaign?: unknown } | null;
  if (!isCampaign(body?.campaign)) {
    return NextResponse.json({ error: "Body must include a campaign." }, { status: 400 });
  }

  const updated = await updateNormalizedCampaign({
    slug,
    campaign: body.campaign,
    sessionEmail: session.email,
  });
  if (updated) return updated;

  // Campaigns live in the campaigns table. There used to be a fallback here
  // that wrote unknown slugs into `admin_campaign_directory` as JSON, which is
  // how the sample campaigns became editable records that reached the public
  // site. A slug with no campaign row is simply not a campaign.
  return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
}
