import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { logDocumentAccess, requestIp, uploadApplicationDocument } from "@/lib/scholarship/documents";
import { retainUntilForSchoolYear } from "@/lib/scholarship/retention-copy";
import { parentStudentWhere, requireParentActor, ScopeError } from "@/lib/scholarship/scope";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent/verifications/:id/documents — multipart { file }
 *
 * The parent's evidence for a disability (MET, IEP or 504 plan) or
 * displacement (the signed DCS verification form only). Same private bucket,
 * access log and retention as application documents.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const verification = await prisma.studentVerification.findFirst({
      where: { id, student: parentStudentWhere(parent.profileId) },
      select: { id: true, kind: true, status: true, schoolYear: true },
    });
    if (!verification) throw new ScopeError("Verification not found.", 404);
    if (verification.status === "approved" || verification.status === "denied" || verification.status === "withdrawn") {
      throw new ScopeError("This verification is already decided. Contact us to add a file.", 409);
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) throw new ScopeError("Choose a file to upload.", 400);

    const uploaded = await uploadApplicationDocument(verification.id, file, "verifications");
    if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 400 });

    const displaced = verification.kind === "displacement";
    const document = await prisma.applicationDocument.create({
      data: {
        verificationId: verification.id,
        storagePath: uploaded.storagePath,
        fileName: file.name.slice(0, 200),
        fileSize: file.size,
        mimeType: file.type,
        documentKind: displaced ? "displaced_form" : "iep",
        uploadedBy: parent.profileId,
        // Displaced forms: four years after the final payout year (not known
        // yet). Disability files: four years after the award year's report.
        purgeAfter: displaced ? null : retainUntilForSchoolYear(verification.schoolYear),
        retentionRule: displaced ? "displaced_final_payout_4y" : "award_year_4y",
      },
    });
    await logDocumentAccess({
      documentId: document.id,
      accessedBy: parent.profileId,
      accessorEmail: parent.email,
      action: "upload",
      ip: requestIp(request),
    });
    await prisma.verificationReview.create({
      data: {
        verificationId: verification.id,
        reviewerId: parent.profileId,
        reviewerEmail: parent.email,
        action: "parent_upload",
        internalNote: `Uploaded ${file.name.slice(0, 120)}`,
      },
    });
    // A reply to a request for information goes back to review.
    if (verification.status === "info_requested") {
      await prisma.studentVerification.update({ where: { id: verification.id }, data: { status: "pending_review" } });
    }
    return NextResponse.json({ ok: true, documentId: document.id });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
