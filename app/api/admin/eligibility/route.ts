import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { isEligibilityFlag, isFlagStatus } from "@/lib/eligibility/flags";
import { evaluateLowIncomeFlag, setFlag } from "@/lib/eligibility/flags-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/eligibility
 *
 * { action: "override", studentId, flag, schoolYear, status, reason }
 *   Set a flag by hand. A reason is required and the change is audit logged.
 * { action: "recalculate_low_income", applicationId }
 *   Re-run the low-income calculation from the application's certified income.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.action === "recalculate_low_income") {
    const applicationId = String(body.applicationId ?? "");
    const result = await evaluateLowIncomeFlag(applicationId, { id: auth.actor.id, email: auth.actor.email });
    if (!result) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (!result.calculation) return NextResponse.json({ error: result.problem }, { status: 422 });
    return NextResponse.json({ ok: true, calculation: result.calculation });
  }

  if (body?.action === "override") {
    const studentId = String(body.studentId ?? "");
    const schoolYear = String(body.schoolYear ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!isEligibilityFlag(body.flag)) return NextResponse.json({ error: "Choose a flag." }, { status: 400 });
    if (!isFlagStatus(body.status)) return NextResponse.json({ error: "Choose a status." }, { status: 400 });
    if (body.flag !== "displaced" && !/^\d{4}\/\d{4}$/.test(schoolYear)) {
      return NextResponse.json({ error: "Choose a school year." }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: "Give a reason for the override." }, { status: 400 });
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    await setFlag({
      studentId,
      flag: body.flag,
      schoolYear,
      status: body.status,
      source: "admin_override",
      actor: { id: auth.actor.id, email: auth.actor.email },
      reason,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
