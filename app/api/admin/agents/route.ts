import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { AGENT_ROLES, cleanScopes, seedStarterAgents } from "@/lib/agents/identities";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

// POST /api/admin/agents
//   { action: "seed" }  adds the five starter agents (all off)
//   { slug, personaName, role, scopes, mailbox?, description? }  adds one
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (body.action === "seed") {
    const created = await seedStarterAgents(auth.email);
    await logAdminActivity({ actorEmail: auth.email, action: "agents_seeded", entityType: "agent_identity", after: { created } });
    return NextResponse.json({ ok: true, created });
  }

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const personaName = String(body.personaName ?? "").trim().slice(0, 60);
  const role = String(body.role ?? "");
  if (!SLUG.test(slug)) return NextResponse.json({ error: "Slug: 3-40 lowercase letters, numbers and dashes." }, { status: 400 });
  if (!personaName) return NextResponse.json({ error: "Give the agent a name." }, { status: 400 });
  if (!(AGENT_ROLES as readonly string[]).includes(role)) return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  if (await prisma.agentIdentity.findUnique({ where: { slug }, select: { id: true } })) {
    return NextResponse.json({ error: "An agent with that slug already exists." }, { status: 409 });
  }
  const mailbox = String(body.mailbox ?? "").trim().toLowerCase() || null;
  if (mailbox && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mailbox)) return NextResponse.json({ error: "Mailbox must be an email address." }, { status: 400 });

  const agent = await prisma.agentIdentity.create({
    data: {
      slug, personaName, role, mailbox, scopes: cleanScopes(body.scopes),
      description: String(body.description ?? "").slice(0, 500) || null, enabled: false, createdByEmail: auth.email,
    },
  });
  await logAdminActivity({ actorEmail: auth.email, action: "agent_created", entityType: "agent_identity", entityId: agent.id, after: { slug, role } });
  return NextResponse.json({ ok: true, id: agent.id });
}
