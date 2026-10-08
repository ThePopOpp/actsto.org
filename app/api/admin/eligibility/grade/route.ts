import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { isGradeLabel } from "@/lib/grades";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST /api/admin/eligibility/grade — { kind: "student" | "application", id, grade } */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string; grade?: string } | null;
  if (!body?.id || !isGradeLabel(body.grade)) {
    return NextResponse.json({ error: "Choose a grade from the list." }, { status: 400 });
  }
  if (body.kind === "student") {
    const before = await prisma.student.findUnique({ where: { id: body.id }, select: { grade: true } });
    await prisma.student.update({ where: { id: body.id }, data: { grade: body.grade } });
    await logAdminActivity({ actorId: auth.actor.id, actorEmail: auth.actor.email, action: "grade.fix", entityType: "student", entityId: body.id, before, after: { grade: body.grade } });
  } else if (body.kind === "application") {
    const before = await prisma.scholarshipApplication.findUnique({ where: { id: body.id }, select: { grade: true } });
    await prisma.scholarshipApplication.update({ where: { id: body.id }, data: { grade: body.grade } });
    await logAdminActivity({ actorId: auth.actor.id, actorEmail: auth.actor.email, action: "grade.fix", entityType: "scholarship_application", entityId: body.id, before, after: { grade: body.grade } });
  } else {
    return NextResponse.json({ error: "Unknown record." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
