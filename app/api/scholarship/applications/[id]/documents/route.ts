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
    assertWritable(application, "overflow");

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }

    const kindRaw = String(formData?.get("documentKind") ?? "other");
    const documentKind = VALID_KINDS.includes(kindRaw) ? kindRaw : "other";

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
        // Retention starts at upload. A job purges the object later and keeps
        // the row as the audit trail.
        purgeAfter: purgeAfterFor(),
      },
    });

    await logDocumentAccess({
      documentId: document.id,
      accessedBy: parent.profileId,
      accessorEmail: parent.email,
      action: "download",
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
