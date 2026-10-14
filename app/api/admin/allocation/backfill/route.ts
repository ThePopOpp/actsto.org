import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { backfillAwardCampaigns } from "@/lib/allocation/campaign-funds";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/backfill — { apply?: boolean }
 *
 * Attaches a campaign to every active award made before campaigns were
 * required. Without `apply` it only returns the plan; with it, the plan is
 * saved and audit logged.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { apply?: boolean } | null;
  try {
    return NextResponse.json({ proposals: await backfillAwardCampaigns(auth.actor, body?.apply === true) });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
