import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/documents/:id/hold — { hold: boolean, reason }
 *
 * A legal hold stops the scheduled purge for one file during an audit or
 * dispute, whatever its retention date. Placing or lifting one is logged.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { hold?: boolean; reason?: string } | null;
  const hold = body?.hold === true;
  const reason = (body?.reason ?? "").trim();
  if (hold && !reason) return NextResponse.json({ error: "Say why the file is on hold." }, { status: 400 });

  const doc = await prisma.applicationDocument.findUnique({ where: { id }, select: { id: true, purgedAt: true, legalHold: true } });
  if (!doc) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (doc.purgedAt) return NextResponse.json({ error: "This file was already deleted under the retention policy." }, { status: 409 });

  await prisma.applicationDocument.update({
    where: { id },
    data: { legalHold: hold, legalHoldReason: hold ? reason : null },
  });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: hold ? "document.hold" : "document.release_hold",
    entityType: "application_document",
    entityId: id,
    before: { legalHold: doc.legalHold },
    after: { legalHold: hold, reason },
  });
  return NextResponse.json({ ok: true });
}
