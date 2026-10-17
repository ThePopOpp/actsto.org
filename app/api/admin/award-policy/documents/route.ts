import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { prisma } from "@/lib/prisma";
import { uploadApplicationDocument } from "@/lib/scholarship/documents";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The full Scholarship Award Policy: Super Admins only. Files are private and
 * served only through a short-lived signed link after a Super Admin check.
 *
 * GET  — every version, newest first
 * POST — multipart { file (PDF), versionLabel, adoptedOn?, note?, makeCurrent? }
 * PATCH — { id, makeCurrent: true } marks one version current
 */
export async function GET() {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const docs = await prisma.awardPolicyDocument.findMany({ orderBy: { uploadedAt: "desc" } });
  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      versionLabel: d.versionLabel,
      fileName: d.fileName,
      sizeBytes: d.sizeBytes,
      adoptedOn: d.adoptedOn ? d.adoptedOn.toISOString().slice(0, 10) : null,
      isCurrent: d.isCurrent,
      note: d.note,
      uploadedByEmail: d.uploadedByEmail,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const versionLabel = String(form?.get("versionLabel") ?? "").trim().slice(0, 120);
  const adoptedOn = String(form?.get("adoptedOn") ?? "").trim();
  const note = String(form?.get("note") ?? "").trim().slice(0, 1000) || null;
  const makeCurrent = String(form?.get("makeCurrent") ?? "") === "true";
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose the policy PDF." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Upload the policy as a PDF." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The PDF must be 10 MB or smaller." }, { status: 400 });
  if (!versionLabel) return NextResponse.json({ error: "Give this version a name, e.g. \"Adopted October 2026\"." }, { status: 400 });
  if (adoptedOn && !/^\d{4}-\d{2}-\d{2}$/.test(adoptedOn)) return NextResponse.json({ error: "Enter the adoption date." }, { status: 400 });

  const uploaded = await uploadApplicationDocument("award-policy", file, "policy");
  if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 500 });

  const doc = await prisma.$transaction(async (tx) => {
    if (makeCurrent) await tx.awardPolicyDocument.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return tx.awardPolicyDocument.create({
      data: {
        versionLabel,
        fileName: file.name.slice(0, 200),
        storagePath: uploaded.storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        adoptedOn: adoptedOn ? new Date(`${adoptedOn}T00:00:00Z`) : null,
        isCurrent: makeCurrent,
        note,
        uploadedBy: auth.actor.id,
        uploadedByEmail: auth.actor.email,
      },
    });
  });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "award_policy.upload",
    entityType: "award_policy_document",
    entityId: doc.id,
    after: { versionLabel, adoptedOn, makeCurrent },
  });
  return NextResponse.json({ ok: true, id: doc.id });
}

export async function PATCH(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { id?: string; makeCurrent?: boolean } | null;
  const id = String(body?.id ?? "");
  const doc = id ? await prisma.awardPolicyDocument.findUnique({ where: { id } }) : null;
  if (!doc) return NextResponse.json({ error: "Version not found." }, { status: 404 });
  if (body?.makeCurrent) {
    await prisma.$transaction([
      prisma.awardPolicyDocument.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.awardPolicyDocument.update({ where: { id }, data: { isCurrent: true } }),
    ]);
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: "award_policy.make_current",
      entityType: "award_policy_document",
      entityId: id,
      after: { versionLabel: doc.versionLabel },
    });
  }
  return NextResponse.json({ ok: true });
}
