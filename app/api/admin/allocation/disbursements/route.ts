import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { recordDisbursement, type DisbursementInput } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/disbursements
 * Body: { awardId, amount, paidAt, reference?, method?, note?, tuitionOverrideReason? }
 *
 * Marks money as sent to the school. Refused, with the figures, when it would
 * exceed tuition (ACTSTO's own payments), a cap, or what is left on the award,
 * while the student has an active ESA, before the committee approves the
 * award, or (disabled/displaced) before the year's state aid matrix is in.
 * Going over tuition once other STOs' reported scholarships are counted needs
 * a reason (409 with needsReason) rather than being refused.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as DisbursementInput | null;
  if (!body?.awardId) return NextResponse.json({ error: "Choose an award." }, { status: 400 });
  try {
    const payment = await recordDisbursement(auth.actor, body);
    return NextResponse.json({ ok: true, paymentId: payment.id });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
