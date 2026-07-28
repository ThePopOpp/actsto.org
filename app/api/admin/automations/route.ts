import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [automations, emailTemplates, smsTemplates, campaigns] = await Promise.all([
    prisma.automation.findMany({ orderBy: { updatedAt: "desc" }, include: { steps: { orderBy: { sortOrder: "asc" } } } }),
    prisma.emailTemplate.findMany({ where: { status: { not: "archived" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.smsTemplate.findMany({ where: { active: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" }, take: 300 }),
  ]);

  return NextResponse.json({
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      triggerEvent: a.triggerEvent,
      enabled: a.enabled,
      conditions: a.conditions,
      steps: a.steps.map((s) => ({ id: s.id, sortOrder: s.sortOrder, channel: s.channel, emailTemplateId: s.emailTemplateId, smsTemplateId: s.smsTemplateId, subjectOverride: s.subjectOverride, delayMinutes: s.delayMinutes })),
      updatedAt: a.updatedAt.toISOString(),
    })),
    emailTemplates,
    smsTemplates,
    campaigns,
  });
}

type StepInput = { channel?: string; emailTemplateId?: string | null; smsTemplateId?: string | null; subjectOverride?: string | null; delayMinutes?: number };

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const b = (await request.json().catch(() => null)) as {
    name?: string; description?: string; triggerEvent?: string; enabled?: boolean; conditions?: unknown; steps?: StepInput[];
  } | null;
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim().slice(0, 160) : "";
  if (!name || !b?.triggerEvent) return NextResponse.json({ error: "Name and trigger are required." }, { status: 400 });

  const automation = await prisma.automation.create({
    data: {
      name,
      description: typeof b.description === "string" ? b.description.slice(0, 500) : null,
      triggerEvent: b.triggerEvent,
      enabled: b.enabled ?? true,
      conditions: (b.conditions ?? {}) as object,
      createdBy: auth.email,
      steps: {
        create: (Array.isArray(b.steps) ? b.steps : []).map((s, i) => ({
          sortOrder: i,
          channel: s.channel === "sms" ? "sms" : "email",
          emailTemplateId: s.emailTemplateId || null,
          smsTemplateId: s.smsTemplateId || null,
          subjectOverride: s.subjectOverride || null,
          delayMinutes: Math.max(0, Number(s.delayMinutes) || 0),
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: automation.id });
}
