import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { setAwardCampaign } from "@/lib/allocation/campaign-funds";
import { releaseEsaHold, reverseAward } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/awards/:id
 * Body: { action: "reverse", reason } | { action: "release_hold", note }
 *     | { action: "set_campaign", campaignId, reason? } (campaignId may be "general")
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; reason?: string; note?: string; campaignId?: string }
    | null;

  try {
    if (body?.action === "reverse") {
      await reverseAward(auth.actor, id, body.reason ?? "");
    } else if (body?.action === "set_campaign") {
      if (!body.campaignId) return NextResponse.json({ error: "Choose a campaign." }, { status: 400 });
      await setAwardCampaign(auth.actor, id, body.campaignId, body.reason ?? "");
    } else if (body?.action === "release_hold") {
      await releaseEsaHold(auth.actor, id, body.note ?? "");
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
