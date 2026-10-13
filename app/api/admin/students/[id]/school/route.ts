import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { recomputeCampaignAwarded } from "@/lib/allocation/server";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/students/:id/school — { schoolId }
 *
 * Staff set or correct the school a student attends. Allocation, caps and
 * school-level campaigns read the student's school, so it can't be left to
 * whatever a campaign or application happened to say.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { schoolId?: string | null } | null;
  const schoolId = body?.schoolId?.trim() || null;

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, schoolId: true, firstName: true, lastName: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  if (schoolId) {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { status: true } });
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
    if (school.status === "archived") {
      return NextResponse.json({ error: "That school was merged into another. Choose the school it was merged into." }, { status: 400 });
    }
  }

  await prisma.student.update({ where: { id }, data: { schoolId } });

  // School-level campaigns count awards to students at their school.
  const affected = await prisma.campaign.findMany({
    where: { isSchoolLevel: true, schoolId: { in: [student.schoolId, schoolId].filter((v): v is string => Boolean(v)) } },
    select: { id: true },
  });
  for (const campaign of affected) await recomputeCampaignAwarded(campaign.id);

  await logAdminActivity({
    actorEmail: auth.email,
    action: "student.school_change",
    entityType: "student",
    entityId: id,
    before: { schoolId: student.schoolId },
    after: { schoolId },
  });
  return NextResponse.json({ ok: true });
}
