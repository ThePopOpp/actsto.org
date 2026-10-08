import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { recordDisbursement, type DisbursementInput } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/disbursements
 * Body: { awardId, amount, paidAt, reference?, method?, note? }
 *
 * Marks money as sent to the school. Refused, with the figures, when it would
 * exceed tuition, a cap, or what is left on the award, or while an ESA hold is on.
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
