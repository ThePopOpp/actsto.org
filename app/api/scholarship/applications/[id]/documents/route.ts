import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { DOCUMENT_KINDS } from "@/lib/scholarship/constants";
import {
  logDocumentAccess,
  purgeAfterFor,
  requestIp,
  uploadApplicationDocument,
} from "@/lib/scholarship/documents";
import { assertWritable, requireOwnedApplication, requireParentActor } from "@/lib/scholarship/scope";

const VALID_KINDS = DOCUMENT_KINDS.map((k) => k.value);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;

    const application = await requireOwnedApplication(id, parent.profileId);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }

    const kindRaw = String(formData?.get("documentKind") ?? "other");
    const documentKind = VALID_KINDS.includes(kindRaw) ? kindRaw : "other";
    // Income proof is part of the financial step; everything else, of the
    // overflow step (qualification, disability and displacement).
    assertWritable(application, documentKind === "income_proof" ? "financial" : "overflow");
    const displacedForm = documentKind === "displaced_form";

    const uploaded = await uploadApplicationDocument(id, file);
    if (!uploaded.ok) {
      return NextResponse.json({ error: uploaded.error }, { status: 400 });
    }

    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: id,
        storagePath: uploaded.storagePath,
        fileName: file.name.slice(0, 200),
        fileSize: file.size,
        mimeType: file.type,
        documentKind,
        uploadedBy: parent.profileId,
        // Retention: four years after the award year's annual report is due.
        // A displaced-student form is kept four years after the student's final
        // payout year instead, which isn't known yet, so it has no date.
        purgeAfter: displacedForm ? null : purgeAfterFor(application.schoolYear),
        retentionRule: displacedForm ? "displaced_final_payout_4y" : "award_year_4y",
      },
    });

    if (documentKind === "income_proof" && application.incomeProofStatus !== "accepted") {
      await prisma.scholarshipApplication.update({
        where: { id },
        data: { incomeProofStatus: "submitted" },
      });
    }

    await logDocumentAccess({
      documentId: document.id,
      accessedBy: parent.profileId,
      accessorEmail: parent.email,
      action: "upload",
      ip: requestIp(request),
    });

    return NextResponse.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        documentKind: document.documentKind,
        uploadedAt: document.uploadedAt.toISOString(),
      },
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
