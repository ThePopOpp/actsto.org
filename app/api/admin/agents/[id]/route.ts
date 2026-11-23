import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { cleanScopes, issueAgentToken } from "@/lib/agents/identities";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/agents/:id
//   { enabled?, personaName?, mailbox?, dailySendCap?, scopes?, description?, managedAgentId?, paperclipAgentId? }
//   { action: "rotate_token" }   returns { token } once; the old token stops working
//   { action: "revoke_token" }   the agent can no longer connect
export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const agent = await prisma.agentIdentity.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (body.action === "rotate_token") {
    const token = await issueAgentToken(id);
    await logAdminActivity({ actorEmail: auth.email, action: "agent_token_rotated", entityType: "agent_identity", entityId: id, after: { slug: agent.slug } });
    return NextResponse.json({ ok: true, token });
  }
  if (body.action === "revoke_token") {
    await prisma.agentIdentity.update({ where: { id }, data: { tokenHash: null, tokenHint: null } });
    await logAdminActivity({ actorEmail: auth.email, action: "agent_token_revoked", entityType: "agent_identity", entityId: id, after: { slug: agent.slug } });
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.personaName === "string" && body.personaName.trim()) data.personaName = body.personaName.trim().slice(0, 60);
  if (typeof body.description === "string") data.description = body.description.slice(0, 500) || null;
  if (typeof body.mailbox === "string") {
    const m = body.mailbox.trim().toLowerCase();
    if (m && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) return NextResponse.json({ error: "Mailbox must be an email address." }, { status: 400 });
    data.mailbox = m || null;
  }
  if (body.dailySendCap !== undefined) {
    const cap = Number(body.dailySendCap);
    if (!Number.isInteger(cap) || cap < 0 || cap > 500) return NextResponse.json({ error: "Daily cap must be 0 to 500." }, { status: 400 });
    data.dailySendCap = cap;
  }
  if (body.scopes !== undefined) data.scopes = cleanScopes(body.scopes);
  for (const k of ["managedAgentId", "paperclipAgentId"] as const) {
    if (typeof body[k] === "string") data[k] = (body[k] as string).trim().slice(0, 120) || null;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const updated = await prisma.agentIdentity.update({ where: { id }, data });
  await logAdminActivity({
    actorEmail: auth.email, action: "agent_updated", entityType: "agent_identity", entityId: id,
    before: { enabled: agent.enabled, mailbox: agent.mailbox, dailySendCap: agent.dailySendCap, scopes: agent.scopes },
    after: { enabled: updated.enabled, mailbox: updated.mailbox, dailySendCap: updated.dailySendCap, scopes: updated.scopes },
  });
  return NextResponse.json({ ok: true });
}
