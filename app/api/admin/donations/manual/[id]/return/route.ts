import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { manualCheckErrorResponse } from "@/lib/donations/manual-check-api";
import { returnManualCheck } from "@/lib/donations/manual-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/manual/:id/return — { kind: "returned" | "void", reason }.
 * Removes the check from every total and voids its receipt. Refused (409) if
 * its money has been awarded: reverse those awards on Allocation first.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { kind?: unknown; reason?: unknown } | null;
  try {
    return NextResponse.json({ ok: true, ...(await returnManualCheck(id, body ?? {}, auth.actor)) });
  } catch (error) {
    return manualCheckErrorResponse(error);
  }
}
