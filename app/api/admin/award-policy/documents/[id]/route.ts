import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { prisma } from "@/lib/prisma";
import { createSignedDocumentUrl } from "@/lib/scholarship/documents";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/award-policy/documents/:id — Super Admins only. Redirects to a
 * short-lived signed link for the private PDF; the file has no public address.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const doc = await prisma.awardPolicyDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Version not found." }, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const url = await createSignedDocumentUrl(doc.storagePath, download ? { downloadAs: doc.fileName } : {});
  if (!url) return NextResponse.json({ error: "The file couldn't be opened." }, { status: 500 });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "award_policy.open",
    entityType: "award_policy_document",
    entityId: id,
  });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
