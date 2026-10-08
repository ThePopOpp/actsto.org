import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { voidDisbursement } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/** POST /api/admin/allocation/disbursements/:id — { action: "void", reason } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { action?: string; reason?: string } | null;
  if (body?.action !== "void") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  try {
    await voidDisbursement(auth.actor, id, body.reason ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
