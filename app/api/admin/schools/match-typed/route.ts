import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { fillMissingStudentSchools } from "@/lib/schools/student-school";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/schools/match-typed — { name, schoolId }
 *
 * Links every application whose family typed `name` under "Other" to a school
 * on the list, and clears the typed name, so the application counts toward
 * that school in allocation and reporting. Students on those applications
 * with no school recorded get it as well.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { name?: string; schoolId?: string } | null;
  const name = body?.name?.trim();
  const schoolId = body?.schoolId ?? "";
  if (!name || !schoolId) return NextResponse.json({ error: "Choose the school." }, { status: 400 });
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const where = { schoolId: null, schoolNameOther: { equals: name, mode: "insensitive" as const } };
  const studentIds = (await prisma.scholarshipApplication.findMany({ where, select: { studentId: true } })).map((a) => a.studentId);
  const result = await prisma.scholarshipApplication.updateMany({ where, data: { schoolId, schoolNameOther: null } });
  // The students on those applications get the school too, if they had none.
  const studentsGivenSchool = await fillMissingStudentSchools(prisma, studentIds);
  await logAdminActivity({
    actorEmail: auth.email,
    action: "school.match_typed",
    entityType: "school",
    entityId: schoolId,
    after: { typedName: name, schoolName: school.name, applications: result.count, studentsGivenSchool },
  });
  return NextResponse.json({ ok: true, matched: result.count, studentsGivenSchool });
}
