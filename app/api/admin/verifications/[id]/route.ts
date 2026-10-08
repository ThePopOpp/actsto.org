import { NextResponse } from "next/server";

import { decideVerification, type VerificationDecision } from "@/lib/eligibility/verifications-server";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { requireCapability } from "@/lib/scholarship/scope";

export const dynamic = "force-dynamic";

const DECIDING = ["approve", "deny", "request_info", "send_to_dcs"];

/**
 * POST /api/admin/verifications/:id
 * Body: { action: "claim" | "note" | "send_to_dcs" | "request_info" | "approve" | "deny", ... }
 *
 * The same reviewer actions as applications, on the same capabilities.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as (VerificationDecision & Record<string, unknown>) | null;
    if (!body?.action) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
    const actor = await requireCapability(DECIDING.includes(body.action) ? "review.decide" : "review.claim");
    await decideVerification(actor, id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
