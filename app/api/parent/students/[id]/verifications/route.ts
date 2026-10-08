import { NextResponse } from "next/server";

import { requestVerification } from "@/lib/eligibility/verifications-server";
import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { parentStudentWhere, requireParentActor, ScopeError } from "@/lib/scholarship/scope";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent/students/:id/verifications — { kind: "disability" | "displacement", note? }
 *
 * A parent marks their own child disabled or displaced. This opens a
 * verification for review; it does not make the student eligible until staff
 * approve it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { kind?: string; note?: string } | null;
    if (body?.kind !== "disability" && body?.kind !== "displacement") {
      throw new ScopeError("Choose disability or displacement.", 400);
    }
    // Parents can only act on their own children.
    const student = await prisma.student.findFirst({
      where: { id, ...parentStudentWhere(parent.profileId) },
      select: { id: true },
    });
    if (!student) throw new ScopeError("Student not found.", 404);

    const verification = await requestVerification({
      parentId: parent.profileId,
      parentEmail: parent.email,
      studentId: student.id,
      kind: body.kind,
      note: body.note,
    });
    return NextResponse.json({ ok: true, verificationId: verification.id });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
