import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { activityDay, visitorHash } from "@/lib/dashboard/campaign-activity";
import { findEnabledByToken, recordProposalView } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/p/:token/view — count a visit to a link-only proposal page.
 * Super Admin previews aren't counted, so the number reflects the recipient.
 * Always 204: the response never says whether a token is real.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await findEnabledByToken(token);
  if (proposal) {
    const session = await getActSession().catch(() => null);
    if (session?.role !== "super_admin") {
      const body = (await request.json().catch(() => null)) as { referrer?: unknown } | null;
      const referrer = typeof body?.referrer === "string" ? body.referrer : null;
      const day = activityDay();
      await recordProposalView(proposal.id, visitorHash(request, day), day, referrer);
    }
  }
  return new NextResponse(null, { status: 204 });
}
