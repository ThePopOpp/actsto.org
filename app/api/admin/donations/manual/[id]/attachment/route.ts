import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import {
  checkPurgeAfter,
  removeCheckFile,
  signedCheckFileUrl,
  uploadCheckFile,
  validateCheckFile,
} from "@/lib/donations/check-attachments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadCheck(id: string) {
  return prisma.donationOfflinePayment.findUnique({
    where: { donationId: id },
    select: { id: true, attachmentPath: true, attachmentName: true, attachmentHold: true, donation: { select: { taxYear: true } } },
  });
}

/**
 * GET — open the check image: a 10-minute signed URL, minted only for a
 * Super Admin, and logged. The file is never reachable by a plain URL.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const row = await loadCheck(id);
  if (!row?.attachmentPath) return NextResponse.json({ error: "No attachment." }, { status: 404 });
  try {
    const url = await signedCheckFileUrl(row.attachmentPath);
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: "donation.manual_check_attachment_view",
      entityType: "donation",
      entityId: id,
    });
    return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open the file." }, { status: 500 });
  }
}

/** POST multipart { file } — attach or replace the scan. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const row = await loadCheck(id);
  if (!row) return NextResponse.json({ error: "Recorded check not found." }, { status: 404 });
  if (row.attachmentHold && row.attachmentPath) {
    return NextResponse.json({ error: "This attachment is on audit hold and can't be replaced." }, { status: 409 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const invalid = validateCheckFile(file);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const path = await uploadCheckFile(id, file);
    const taxYear = row.donation.taxYear ?? new Date().getFullYear();
    await prisma.donationOfflinePayment.update({
      where: { donationId: id },
      data: {
        attachmentPath: path,
        attachmentName: file.name.slice(0, 200),
        attachmentMime: file.type,
        attachmentSize: file.size,
        attachmentPurgeAfter: checkPurgeAfter(taxYear),
      },
    });
    if (row.attachmentPath) await removeCheckFile(row.attachmentPath).catch(() => null);
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: row.attachmentPath ? "donation.manual_check_attachment_replace" : "donation.manual_check_attachment_add",
      entityType: "donation",
      entityId: id,
      before: row.attachmentName ? { name: row.attachmentName } : undefined,
      after: { name: file.name, size: file.size, type: file.type },
    });
    return NextResponse.json({ ok: true, name: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}

/** PATCH { hold: boolean } — set or clear the audit hold. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { hold?: unknown } | null;
  if (typeof body?.hold !== "boolean") return NextResponse.json({ error: "Say whether to hold." }, { status: 400 });
  const row = await loadCheck(id);
  if (!row) return NextResponse.json({ error: "Recorded check not found." }, { status: 404 });
  await prisma.donationOfflinePayment.update({ where: { donationId: id }, data: { attachmentHold: body.hold } });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "donation.manual_check_attachment_hold",
    entityType: "donation",
    entityId: id,
    before: { hold: row.attachmentHold },
    after: { hold: body.hold },
  });
  return NextResponse.json({ ok: true });
}
