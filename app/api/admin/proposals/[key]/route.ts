import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireProposalAdmin } from "@/lib/proposals/admin-api";
import { newProposalToken, signerOf } from "@/lib/proposals/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

/**
 * PATCH /api/admin/proposals/:key — { enabled?, signer?: { name, title, phone, email }, regenerateToken? }.
 * Regenerating the token kills the old link immediately. Every change is audit logged.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const auth = await requireProposalAdmin(key);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as {
    enabled?: unknown;
    signer?: { name?: unknown; title?: unknown; phone?: unknown; email?: unknown };
    regenerateToken?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const data: Record<string, unknown> = { updatedByEmail: auth.actor.email };
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (body.regenerateToken === true) data.token = newProposalToken();
  if (body.signer) {
    const email = field(body.signer.email, 160);
    if (email && !EMAIL.test(email)) return NextResponse.json({ error: "That signer email doesn't look right." }, { status: 400 });
    data.signerName = field(body.signer.name, 120);
    data.signerTitle = field(body.signer.title, 120);
    data.signerPhone = field(body.signer.phone, 40);
    data.signerEmail = email?.toLowerCase() ?? null;
  }

  const before = auth.proposal;
  const after = await prisma.donorProposal.update({ where: { id: before.id }, data });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: body.regenerateToken === true ? "proposal.link_regenerate" : "proposal.update",
    entityType: "donor_proposal",
    entityId: before.id,
    // Tokens are secrets: log that one changed, never the value.
    before: { key, enabled: before.enabled, signer: signerOf(before) },
    after: { key, enabled: after.enabled, signer: signerOf(after), tokenChanged: before.token !== after.token },
  });
  return NextResponse.json({ ok: true, enabled: after.enabled, token: after.token });
}
