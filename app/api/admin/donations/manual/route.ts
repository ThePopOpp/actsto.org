import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { recordManualCheck } from "@/lib/donations/manual-check";
import { manualCheckErrorResponse } from "@/lib/donations/manual-check-api";
import type { ManualCheckInput } from "@/lib/donations/manual-check-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/manual — record a check, cashier's check or money
 * order as a paid donation. Super Admin only.
 *
 * 409 with `needsConfirm: "duplicate"` when the same donor's check number is
 * already on file; 400 with `needsConfirm: "large_amount"` over $100,000.
 * Resend with `confirmDuplicate` / `confirmLargeAmount` to go ahead.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as ManualCheckInput | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await recordManualCheck(body, auth.actor)) });
  } catch (error) {
    return manualCheckErrorResponse(error);
  }
}
