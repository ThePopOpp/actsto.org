import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

/**
 * PUT /api/admin/allocation/limits
 * Body: { studentId, schoolYear, tuitionCeiling?, tuitionReason?, ddCap?, ddCapReason? }
 *
 * The tuition ceiling overrides the application's tuition after discounts. The
 * disabled/displaced cap normally comes from the state aid matrix; a cap sent
 * here overrides it. Both need a reason, and both are audit logged.
 */
export async function PUT(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const studentId = String(body?.studentId ?? "");
    const schoolYear = String(body?.schoolYear ?? "");
    if (!studentId || !/^\d{4}\/\d{4}$/.test(schoolYear)) {
      return NextResponse.json({ error: "Choose a student and school year." }, { status: 400 });
    }
    const tuitionCeiling = money(body?.tuitionCeiling);
    const ddCap = money(body?.ddCap);
    const tuitionReason = typeof body?.tuitionReason === "string" ? body.tuitionReason.trim() : undefined;
    const ddCapReason = typeof body?.ddCapReason === "string" ? body.ddCapReason.trim() : undefined;

    if (tuitionCeiling !== undefined && tuitionCeiling !== null && !tuitionReason) {
      return NextResponse.json({ error: "Give a reason for changing the tuition ceiling." }, { status: 400 });
    }
    if (ddCap !== undefined && ddCap !== null && !ddCapReason) {
      return NextResponse.json({ error: "Note how the disabled/displaced cap was worked out." }, { status: 400 });
    }

    const before = await prisma.studentYearLimit.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } });
    const data = {
      ...(tuitionCeiling !== undefined ? { tuitionCeiling, tuitionReason: tuitionReason || null } : {}),
      // A cap typed here overrides the state aid matrix, with its reason.
      ...(ddCap !== undefined ? { ddCap, ddCapReason: ddCap === null ? null : ddCapReason || null, ddCapIsOverride: ddCap !== null } : {}),
      updatedBy: auth.actor.id,
      updatedByEmail: auth.actor.email,
    };
    const row = await prisma.studentYearLimit.upsert({
      where: { studentId_schoolYear: { studentId, schoolYear } },
      create: { studentId, schoolYear, ...data },
      update: data,
    });
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: "student_limits.update",
      entityType: "student_year_limit",
      entityId: row.id,
      before: before
        ? { tuitionCeiling: before.tuitionCeiling, ddCap: before.ddCap }
        : null,
      after: { studentId, schoolYear, ...data },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
