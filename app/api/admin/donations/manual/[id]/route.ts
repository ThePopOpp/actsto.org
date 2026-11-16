import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { manualCheckErrorResponse } from "@/lib/donations/manual-check-api";
import { getManualCheck, updateManualCheck } from "@/lib/donations/manual-check";
import type { ManualCheckInput } from "@/lib/donations/manual-check-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/donations/manual/:id — the recorded check, shaped for the edit form. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const check = await getManualCheck(id).catch(() => null);
  if (!check) return NextResponse.json({ error: "Recorded check not found." }, { status: 404 });
  return NextResponse.json(check);
}

/**
 * PATCH /api/admin/donations/manual/:id — edit a recorded check. Changes to what the
 * receipt shows need `reason` once a receipt exists; the receipt is then
 * voided and re-issued. Refused when the change would take awarded money back.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as (ManualCheckInput & { reason?: unknown }) | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await updateManualCheck(id, body, auth.actor)) });
  } catch (error) {
    return manualCheckErrorResponse(error);
  }
}
