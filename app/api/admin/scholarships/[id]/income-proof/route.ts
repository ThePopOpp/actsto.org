import { NextResponse } from "next/server";

import { evaluateLowIncomeFlag } from "@/lib/eligibility/flags-server";
import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { notify } from "@/lib/scholarship/notifications";
import { requireCapability, ScopeError } from "@/lib/scholarship/scope";

export const dynamic = "force-dynamic";

const DECISIONS = ["accepted", "rejected", "needs_more"] as const;
type Decision = (typeof DECISIONS)[number];

/**
 * POST /api/admin/scholarships/:id/income-proof — { decision, note }
 *
 * The reviewer's decision on the family's income proof. The low-income flag
 * can only be approved once proof is accepted, so the flag is re-evaluated
 * here. The decision is recorded in the application's decision history.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCapability("review.decide");
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { decision?: string; note?: string } | null;
    const decision = body?.decision as Decision;
    const note = (body?.note ?? "").trim();
    if (!DECISIONS.includes(decision)) throw new ScopeError("Choose accepted, rejected or needs more.", 400);
    if (decision !== "accepted" && !note) throw new ScopeError("Tell the family what's wrong or what's missing.", 400);
    if (!actor.profileId) throw new ScopeError("Your staff account isn't linked to a profile.", 409);

    const application = await prisma.scholarshipApplication.findUnique({
      where: { id },
      select: { id: true, guardianUserId: true, schoolYear: true, student: { select: { firstName: true } } },
    });
    if (!application) throw new ScopeError("Application not found.", 404);

    await prisma.scholarshipApplication.update({
      where: { id },
      data: {
        incomeProofStatus: decision,
        incomeProofDecidedBy: actor.profileId,
        incomeProofDecidedAt: new Date(),
        incomeProofNote: note || null,
      },
    });
    await prisma.applicationReview.create({
      data: {
        applicationId: id,
        reviewerId: actor.profileId,
        action: "note",
        internalNote: `Income proof ${decision === "needs_more" ? "needs more" : decision}.${note ? ` ${note}` : ""}`,
        parentMessage: decision === "accepted" ? null : note,
      },
    });

    const result = await evaluateLowIncomeFlag(id, { id: actor.profileId, email: actor.email });

    if (decision !== "accepted" && application.guardianUserId) {
      const parent = await prisma.profile.findUnique({
        where: { id: application.guardianUserId },
        select: { id: true, email: true, displayName: true, fullName: true },
      });
      if (parent?.email) {
        await notify({
          to: { profileId: parent.id, email: parent.email, name: parent.displayName ?? parent.fullName },
          subject: "We need different proof of income",
          body: [
            `We reviewed the proof of income for ${application.student.firstName}'s ${application.schoolYear ?? ""} application.`,
            note,
            "Reply to this email with the document, or upload it when we reopen the financial section.",
          ],
          cta: { label: "View your application", path: `/dashboard/parent/apply/${id}` },
          templateKey: "scholarship_income_proof",
          dashboardTitle: "Proof of income needed",
          dashboardType: "scholarship_application",
        });
      }
    }

    return NextResponse.json({ ok: true, calculation: result?.calculation ?? null, problem: result?.problem ?? null });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
