import { NextResponse } from "next/server";

import { recomputeCampaignCompletion } from "@/lib/campaigns/recompute-completion";
import { prisma } from "@/lib/prisma";
import { getStudentActor } from "@/lib/students/parent-session";
import { familyStudentWhere } from "@/lib/students/parent-students";

function money(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Load the campaign and check the caller may change who is on it.
 *
 * Students are always validated against the campaign owner's family, not the
 * caller's — that keeps a Super Admin helping a family from attaching an
 * unrelated child by id.
 */
async function loadEditableCampaign(slug: string, actorId: string, isSuperAdmin: boolean) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: { id: true, createdByUserId: true, goalAmount: true },
  });
  if (!campaign) {
    return { campaign: null, error: NextResponse.json({ error: "Campaign not found." }, { status: 404 }) };
  }
  if (!isSuperAdmin && campaign.createdByUserId !== actorId) {
    return {
      campaign: null,
      error: NextResponse.json({ error: "You do not have access to this campaign." }, { status: 403 }),
    };
  }
  return { campaign, error: null };
}

/** Connect one of the family's existing students to this campaign. */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { campaign, error } = await loadEditableCampaign(decodeURIComponent(slug), actor.id, actor.isSuperAdmin);
  if (!campaign) return error ?? NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as
    | { studentId?: string; individualGoal?: string | number }
    | null;
  const studentId = (body?.studentId ?? "").trim();
  if (!studentId) return NextResponse.json({ error: "Pick a student to add." }, { status: 400 });

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...familyStudentWhere(campaign.createdByUserId) },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found on this account." }, { status: 404 });

  const linkCount = await prisma.campaignStudent.count({ where: { campaignId: campaign.id } });
  const individualGoal =
    money(body?.individualGoal) || Math.round(Number(campaign.goalAmount ?? 0) / Math.max(1, linkCount + 1));

  await prisma.campaignStudent.upsert({
    where: { campaignId_studentId: { campaignId: campaign.id, studentId: student.id } },
    create: {
      campaignId: campaign.id,
      studentId: student.id,
      individualGoal,
      amountAllocated: 0,
      sortOrder: linkCount,
    },
    update: { individualGoal },
  });

  const completion = await recomputeCampaignCompletion(campaign.id);
  return NextResponse.json({ ok: true, completion });
}

/** Remove a student from this campaign. The student record itself is kept. */
export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { campaign, error } = await loadEditableCampaign(decodeURIComponent(slug), actor.id, actor.isSuperAdmin);
  if (!campaign) return error ?? NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { studentId?: string } | null;
  const studentId = (body?.studentId ?? url.searchParams.get("studentId") ?? "").trim();
  if (!studentId) return NextResponse.json({ error: "Pick a student to remove." }, { status: 400 });

  await prisma.campaignStudent.deleteMany({ where: { campaignId: campaign.id, studentId } });

  const completion = await recomputeCampaignCompletion(campaign.id);
  return NextResponse.json({ ok: true, completion });
}
