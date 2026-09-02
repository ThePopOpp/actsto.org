import { NextResponse } from "next/server";

import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { getActSession } from "@/lib/auth/session-server";
import type { Campaign } from "@/lib/campaigns";
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { notifyIncompleteCampaignDraft } from "@/lib/campaigns/notifications";
import { campaignToFormValues, slugifyCampaignSlug } from "@/lib/dashboard/campaign-editor";
import { prisma } from "@/lib/prisma";
import {
  createFamilyStudent,
  filterOwnedStudentIds,
  findFamilyStudentByName,
} from "@/lib/students/parent-students";
import { normalizePhone } from "@/lib/sms/twilio";

const DIRECTORY_ID = "default";

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

async function loadRows(): Promise<AdminCampaignRow[]> {
  const row = await prisma.adminCampaignDirectory.findUnique({ where: { id: DIRECTORY_ID } });
  if (!row) return seedAdminCampaignRows();
  return Array.isArray(row.rows) ? (row.rows as AdminCampaignRow[]) : [];
}

function canEditCampaign(sessionEmail: string, campaign: Campaign) {
  if (canAccessSuperAdminDashboard(sessionEmail)) return true;
  return campaign.parent.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase();
}

async function profileForSession(email: string) {
  return prisma.profile.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, displayName: true, fullName: true, phone: true, isSuperAdmin: true },
  });
}

async function upsertSchoolForCampaign(campaign: Campaign) {
  const name = campaign.school.name.trim();
  if (!name || name === "School") return null;
  const slug = slugifyCampaignSlug("", name);
  const school = await prisma.school.upsert({
    where: { slug },
    create: {
      name,
      slug,
      addressLine1: campaign.school.address || null,
      website: campaign.school.website || null,
      logoUrl: campaign.school.logo || null,
      status: "pending",
    },
    update: {
      name,
      addressLine1: campaign.school.address || null,
      website: campaign.school.website || null,
      logoUrl: campaign.school.logo || null,
    },
    select: { id: true },
  });
  return school.id;
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
  if (!isAdmin && existing.createdByUserId !== profile.id) {
    return NextResponse.json({ error: "You do not have access to edit this campaign." }, { status: 403 });
  }

  const formValues = campaignToFormValues(campaign);
  const completion = calculateCampaignCompletion(formValues);
  const nextSlug = slugifyCampaignSlug(campaign.slug, campaign.title);
  const schoolId = await upsertSchoolForCampaign(campaign);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.campaign.update({
      where: { id: existing.id },
      data: {
        schoolId,
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

    for (const [index, formStudent] of campaign.students.entries()) {
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
            grade: formStudent.gradeDisplay === "-" ? null : formStudent.gradeDisplay || null,
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
          grade: formStudent.gradeDisplay === "-" ? null : formStudent.gradeDisplay || null,
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
    const removedIds = [...linkedIds].filter((id) => !keptStudentIds.has(id));
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

  const normalizedResponse = await updateNormalizedCampaign({
    slug,
    campaign: body.campaign,
    sessionEmail: session.email,
  });
  if (normalizedResponse) return normalizedResponse;

  const rows = await loadRows();
  const previous = rows.find((row) => row.slug === slug);
  const campaign = body.campaign;
  const authCampaign = previous ?? campaign;

  if (!canEditCampaign(session.email, authCampaign)) {
    return NextResponse.json({ error: "You do not have access to edit this campaign." }, { status: 403 });
  }

  const nextRow: AdminCampaignRow = {
    ...campaign,
    moderationStatus: previous?.moderationStatus ?? "pending",
    reviewer: previous?.reviewer ?? "Unassigned",
  };
  const nextRows = rows.filter((row) => row.slug !== slug && row.slug !== campaign.slug);
  nextRows.push(nextRow);

  await prisma.adminCampaignDirectory.upsert({
    where: { id: DIRECTORY_ID },
    create: { id: DIRECTORY_ID, rows: nextRows },
    update: { rows: nextRows },
  });

  return NextResponse.json({ campaign: nextRow });
}
