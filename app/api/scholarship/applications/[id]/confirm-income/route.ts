import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { confirmIncome } from "@/lib/scholarship/applications";
import { requireParentActor } from "@/lib/scholarship/scope";

/**
 * The per-year income confirmation. Writes to *this* year's application, so a
 * confirmation from a prior year can never satisfy the current one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { confirmed?: boolean } | null;

    const application = await confirmIncome(id, parent, body?.confirmed === true);

    return NextResponse.json({
      ok: true,
      incomeConfirmedAt: application.incomeConfirmedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
