import "server-only";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import { logDocumentAccess } from "@/lib/scholarship/documents";
import { getOwnedDocument, getParentActor, getStaffActor } from "@/lib/scholarship/scope";

export type DocumentAccessGrant = {
  ok: true;
  storagePath: string;
  fileName: string;
  actorId: string | null;
  actorEmail: string | null;
};

export type DocumentAccessRefusal = { ok: false; status: 403 | 404; message: string };

/**
 * Who may open one application document. Shared by the signed-URL and the
 * one-click view routes so they cannot drift apart.
 *
 * Two authorized paths, and nothing else:
 *   - the parent who owns the application, and
 *   - a staff member holding `documents.view`.
 *
 * Refusals are logged here, including by name for staff without the
 * capability. A successful open is logged by the caller, with the action it
 * actually took.
 */
export async function authorizeDocumentAccess(
  documentId: string,
  ip: string | null,
): Promise<DocumentAccessGrant | DocumentAccessRefusal> {
  const parent = await getParentActor();
  if (parent) {
    const owned = await getOwnedDocument(documentId, parent.profileId);
    if (owned) {
      return {
        ok: true,
        storagePath: owned.storagePath,
        fileName: owned.fileName,
        actorId: parent.profileId,
        actorEmail: parent.email,
      };
    }
  }

  const staff = await getStaffActor();
  if (staff && can(staff.staffRole, "documents.view")) {
    const document = await prisma.applicationDocument.findUnique({
      where: { id: documentId },
      select: { storagePath: true, fileName: true, purgedAt: true },
    });
    if (document && !document.purgedAt) {
      return {
        ok: true,
        storagePath: document.storagePath,
        fileName: document.fileName,
        actorId: staff.profileId,
        actorEmail: staff.email,
      };
    }
  } else if (staff) {
    // A staff account without the capability. Log the refusal by name.
    await logDocumentAccess({
      documentId,
      accessedBy: staff.profileId,
      accessorEmail: staff.email,
      action: "denied",
      ip,
    });
    return { ok: false, status: 403, message: "Your account can't open application documents." };
  }

  await logDocumentAccess({ documentId, action: "denied", ip });
  return { ok: false, status: 404, message: "That file wasn't found." };
}
