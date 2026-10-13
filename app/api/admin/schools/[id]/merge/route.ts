import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { recomputeCampaignAwarded } from "@/lib/allocation/server";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { fillMissingStudentSchools } from "@/lib/schools/student-school";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/schools/:id/merge — { intoId }
 *
 * Folds a duplicate school into the one to keep: every student, campaign,
 * application, award, payment, allocation, recommendation and school admin
 * pointing at the duplicate moves to the kept school, and the duplicate is
 * archived (kept, not deleted, so its history is traceable). Students with no
 * school recorded take one from their application or campaign. Allocation and
 * reporting group by school id, so this is what makes them count correctly.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { intoId?: string } | null;
  const intoId = body?.intoId ?? "";
  if (!intoId || intoId === id) return NextResponse.json({ error: "Choose a different school to keep." }, { status: 400 });

  const [from, into] = await Promise.all([
    prisma.school.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.school.findUnique({ where: { id: intoId }, select: { id: true, name: true, status: true } }),
  ]);
  if (!from || !into) return NextResponse.json({ error: "School not found." }, { status: 404 });
  if (into.status === "archived") return NextResponse.json({ error: "Can't merge into an archived school." }, { status: 400 });

  const moved = await prisma.$transaction(async (tx) => {
    const counts = {
      students: (await tx.student.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      campaigns: (await tx.campaign.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      applications: (await tx.scholarshipApplication.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      awards: (await tx.scholarshipAward.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      payments: (await tx.scholarshipPayment.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      allocations: (await tx.donationAllocation.updateMany({ where: { schoolId: id }, data: { schoolId: intoId } })).count,
      recommendations: (await tx.donorRecommendation.updateMany({ where: { recommendedSchoolId: id }, data: { recommendedSchoolId: intoId } })).count,
    };
    // School admins are unique per school and user: move only those not already on the kept school.
    const admins = await tx.schoolAdmin.findMany({ where: { schoolId: id } });
    for (const admin of admins) {
      const exists = await tx.schoolAdmin.findUnique({ where: { schoolId_userId: { schoolId: intoId, userId: admin.userId } } });
      if (exists) await tx.schoolAdmin.delete({ where: { id: admin.id } });
      else await tx.schoolAdmin.update({ where: { id: admin.id }, data: { schoolId: intoId } });
    }
    await tx.school.update({ where: { id }, data: { status: "archived" } });
    // Students with no school of their own take it from their application or
    // campaign, now that those point at the kept school.
    return { ...counts, studentsGivenSchool: await fillMissingStudentSchools(tx) };
  });

  // School-level campaigns count awards to students at their school.
  const schoolCampaigns = await prisma.campaign.findMany({ where: { schoolId: intoId, isSchoolLevel: true }, select: { id: true } });
  for (const c of schoolCampaigns) await recomputeCampaignAwarded(c.id);

  await logAdminActivity({
    actorEmail: auth.email,
    action: "school.merge",
    entityType: "school",
    entityId: id,
    before: { name: from.name },
    after: { mergedInto: intoId, intoName: into.name, moved },
  });
  return NextResponse.json({ ok: true, moved });
}
