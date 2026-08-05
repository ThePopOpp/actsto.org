import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import {
  createSignedDocumentUrl,
  logDocumentAccess,
  requestIp,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/scholarship/documents";
import { getOwnedDocument, getParentActor, getStaffActor } from "@/lib/scholarship/scope";

/**
 * Mint a short-lived signed URL for one document.
 *
 * Two authorized paths, and nothing else:
 *   - the parent who owns the application, and
 *   - a staff member holding `documents.view`.
 *
 * Every outcome is logged, including refusals — a denied attempt on a child's
 * IEP is exactly the kind of thing that should leave a trace.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const ip = requestIp(request);

    let storagePath: string | null = null;
    let actorId: string | null = null;
    let actorEmail: string | null = null;

    const parent = await getParentActor();
    if (parent) {
      const owned = await getOwnedDocument(documentId, parent.profileId);
      if (owned) {
        storagePath = owned.storagePath;
        actorId = parent.profileId;
        actorEmail = parent.email;
      }
    }

    if (!storagePath) {
      const staff = await getStaffActor();
      if (staff && can(staff.staffRole, "documents.view")) {
        const document = await prisma.applicationDocument.findUnique({
          where: { id: documentId },
          select: { storagePath: true, purgedAt: true },
        });
        if (document && !document.purgedAt) {
          storagePath = document.storagePath;
          actorId = staff.profileId;
          actorEmail = staff.email;
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
        return NextResponse.json(
          { error: "Your account can't open application documents." },
          { status: 403 },
        );
      }
    }

    if (!storagePath) {
      await logDocumentAccess({ documentId, action: "denied", ip });
      return NextResponse.json({ error: "That file wasn't found." }, { status: 404 });
    }

    const url = await createSignedDocumentUrl(storagePath);
    if (!url) {
      return NextResponse.json(
        { error: "That file could not be opened. It may have been removed under our retention policy." },
        { status: 410 },
      );
    }

    await logDocumentAccess({
      documentId,
      accessedBy: actorId,
      accessorEmail: actorEmail,
      action: "signed_url",
      ip,
    });

    return NextResponse.json({ url, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
