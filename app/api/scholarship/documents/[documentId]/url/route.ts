import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { authorizeDocumentAccess } from "@/lib/scholarship/document-access";
import {
  createSignedDocumentUrl,
  logDocumentAccess,
  requestIp,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/scholarship/documents";

/**
 * Mint a short-lived signed URL for one document, as JSON. Staff screens use
 * the one-click /view route instead; this stays for programmatic callers.
 * Authorization is shared with /view in authorizeDocumentAccess.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const ip = requestIp(request);

    const access = await authorizeDocumentAccess(documentId, ip);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const url = await createSignedDocumentUrl(access.storagePath);
    if (!url) {
      return NextResponse.json(
        { error: "That file could not be opened. It may have been removed under our retention policy." },
        { status: 410 },
      );
    }

    await logDocumentAccess({
      documentId,
      accessedBy: access.actorId,
      accessorEmail: access.actorEmail,
      action: "signed_url",
      ip,
    });

    return NextResponse.json({ url, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
