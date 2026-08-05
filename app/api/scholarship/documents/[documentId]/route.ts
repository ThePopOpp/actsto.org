import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import {
  deleteStorageObjectIfOrphaned,
  logDocumentAccess,
  requestIp,
} from "@/lib/scholarship/documents";
import {
  getOwnedDocument,
  requireParentActor,
  ScopeError,
  writableState,
} from "@/lib/scholarship/scope";

/**
 * Parents delete their own files before submission. After submission, deletion
 * requests go through staff — the file is part of what was certified.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const parent = await requireParentActor();
    const { documentId } = await params;

    const document = await getOwnedDocument(documentId, parent.profileId);
    if (!document) throw new ScopeError("That file wasn't found.", 404);

    const application = await prisma.scholarshipApplication.findUniqueOrThrow({
      where: { id: document.applicationId },
      select: { status: true, lockedAt: true, fieldsRequested: true },
    });
    const state = writableState(application);
    if (!state.writable) {
      throw new ScopeError(
        "This application is locked. Contact our team to remove a file from it.",
        409,
      );
    }

    await logDocumentAccess({
      documentId,
      accessedBy: parent.profileId,
      accessorEmail: parent.email,
      action: "delete",
      ip: requestIp(request),
    });

    // Delete the row first so a shared object can never be orphaned by a
    // half-finished delete, then remove the object only if nothing else uses it.
    const storagePath = document.storagePath;
    await prisma.applicationDocument.delete({ where: { id: documentId } });
    await deleteStorageObjectIfOrphaned(storagePath, documentId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
