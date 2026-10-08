import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { campaignEndDateError } from "@/lib/campaign-dates";
import { logAdminActivity } from "@/lib/admin/audit";
import { recomputeCampaignAwarded } from "@/lib/allocation/server";

const ALLOWED_STATUS = ["draft", "pending_review", "active", "paused", "completed", "rejected", "archived"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        status?: string;
        isFeatured?: boolean;
        isPublic?: boolean;
        startsAt?: string | null;
        endsAt?: string | null;
        featuredRank?: number | null;
        isSchoolLevel?: boolean;
        schoolId?: string | null;
      }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  if (body.status && !ALLOWED_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "active") {
      data.approvedAt = new Date();
      data.isPublic = true;
    } else if (body.status === "rejected") {
      data.rejectedAt = new Date();
    }
  }
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
  if (body.featuredRank !== undefined) {
    const rank = body.featuredRank === null ? null : Number(body.featuredRank);
    if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 999)) {
      return NextResponse.json({ error: "Featured rank must be a whole number from 1 to 999, or blank." }, { status: 400 });
    }
    data.featuredRank = rank;
  }
  if (body.schoolId !== undefined) {
    if (body.schoolId) {
      const school = await prisma.school.findUnique({ where: { id: body.schoolId }, select: { id: true } });
      if (!school) return NextResponse.json({ error: "School not found." }, { status: 400 });
    }
    data.schoolId = body.schoolId || null;
  }
  if (body.isSchoolLevel !== undefined) {
    // A school-level campaign raises money for students at one school, so it
    // needs that school, and it has no students of its own.
    const schoolId = body.schoolId !== undefined ? body.schoolId : (await prisma.campaign.findUnique({ where: { id }, select: { schoolId: true } }))?.schoolId;
    if (body.isSchoolLevel && !schoolId) {
      return NextResponse.json({ error: "Choose the school for a school-level campaign." }, { status: 400 });
    }
    data.isSchoolLevel = body.isSchoolLevel;
  }
  if (body.isPublic !== undefined) data.isPublic = body.isPublic;
  if (body.startsAt !== undefined || body.endsAt !== undefined) {
    const current = await prisma.campaign.findUnique({ where: { id }, select: { startsAt: true, endsAt: true, createdAt: true } });
    if (!current) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    const start = body.startsAt !== undefined ? body.startsAt : current.startsAt ?? current.createdAt;
    const end = body.endsAt !== undefined ? body.endsAt : current.endsAt;
    const endDateError = campaignEndDateError(start, end);
    if (endDateError) return NextResponse.json({ error: endDateError }, { status: 400 });
  }
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;

  try {
    await prisma.campaign.update({ where: { id }, data });
    if (body.isSchoolLevel !== undefined || body.schoolId !== undefined) {
      await recomputeCampaignAwarded(id);
    }
    await logAdminActivity({
      actorEmail: auth.email,
      action: "campaign.update",
      entityType: "campaign",
      entityId: id,
      after: data,
    });

    if (body.status === "active") {
      try {
        const { fireAutomationEvent } = await import("@/lib/automations/fire");
        const camp = await prisma.campaign.findUnique({ where: { id }, select: { title: true, slug: true, createdByUserId: true } });
        const creator = camp ? await prisma.profile.findUnique({ where: { id: camp.createdByUserId }, select: { firstName: true, fullName: true, displayName: true, email: true } }).catch(() => null) : null;
        const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://actsto.org").replace(/\/$/, "");
        if (camp && creator?.email) {
          await fireAutomationEvent("campaign_approved", {
            userId: camp.createdByUserId,
            email: creator.email,
            campaignId: id,
            fields: {
              first_name: creator.firstName ?? "",
              full_name: creator.fullName ?? creator.displayName ?? "",
              email: creator.email,
              campaign_title: camp.title,
              campaign_url: camp.slug ? `${site}/campaigns/${camp.slug}` : site,
            },
          });
        }
      } catch {
        /* non-blocking */
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed." }, { status: 400 });
  }
}
