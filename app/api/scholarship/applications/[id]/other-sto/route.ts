import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { saveOtherStoRows, type OtherStoRowInput } from "@/lib/scholarship/applications";
import { requireParentActor } from "@/lib/scholarship/scope";

/**
 * PUT /api/scholarship/applications/:id/other-sto — { rows: [{ stoName, program, amount }] }
 *
 * The family's scholarships from other STOs this school year. Replaces what
 * the family listed before; staff corrections are kept.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { rows?: OtherStoRowInput[] } | null;
    const rows = await saveOtherStoRows(id, parent, Array.isArray(body?.rows) ? body!.rows : []);
    return NextResponse.json({ ok: true, rows: rows.map((r) => ({ stoName: r.stoName, program: r.program, amount: Number(r.amount) })) });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
