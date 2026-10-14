import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { planAwards, spreadCampaign } from "@/lib/allocation/campaign-funds";
import { isFundingSource } from "@/lib/funding-sources";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/plan — a preview, nothing is saved.
 *
 * { fundingSource, entries: [{ studentId, amount }], preferCampaignId? }
 *   Funds each amount from campaigns in order: the chosen campaign, the
 *   student's own, those whose donors recommended the student, then others
 *   with money left (oldest gift first), then gifts made without a campaign.
 *
 * { fundingSource, spreadCampaignId, studentIds }
 *   Spreads everything that campaign has left evenly across the students.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as {
    fundingSource?: string;
    entries?: { studentId?: string; amount?: number }[];
    preferCampaignId?: string | null;
    spreadCampaignId?: string;
    studentIds?: string[];
  } | null;
  if (!body || !isFundingSource(body.fundingSource)) return NextResponse.json({ error: "Choose a fund." }, { status: 400 });

  try {
    if (body.spreadCampaignId) {
      const ids = (body.studentIds ?? []).filter((id): id is string => typeof id === "string").slice(0, 200);
      if (!ids.length) return NextResponse.json({ error: "Choose the students to share it between." }, { status: 400 });
      return NextResponse.json({ plan: await spreadCampaign(body.fundingSource, body.spreadCampaignId, ids) });
    }
    const entries = (body.entries ?? [])
      .map((e) => ({ studentId: String(e.studentId ?? ""), amount: Math.round(Number(e.amount) * 100) / 100 }))
      .filter((e) => e.studentId && e.amount > 0)
      .slice(0, 200);
    if (!entries.length) return NextResponse.json({ error: "Enter an amount for at least one student." }, { status: 400 });
    return NextResponse.json({ plan: await planAwards(body.fundingSource, entries, { preferKey: body.preferCampaignId }) });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
