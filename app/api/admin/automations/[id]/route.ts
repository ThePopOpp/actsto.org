import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StepInput = { channel?: string; emailTemplateId?: string | null; smsTemplateId?: string | null; subjectOverride?: string | null; delayMinutes?: number };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const b = (await request.json().catch(() => null)) as {
    name?: string; description?: string; triggerEvent?: string; enabled?: boolean; conditions?: unknown; steps?: StepInput[];
  } | null;
  if (!b) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.trim().slice(0, 160);
  if ("description" in b) data.description = typeof b.description === "string" ? b.description.slice(0, 500) : null;
  if (typeof b.triggerEvent === "string") data.triggerEvent = b.triggerEvent;
  if (typeof b.enabled === "boolean") data.enabled = b.enabled;
  if ("conditions" in b) data.conditions = (b.conditions ?? {}) as object;

  await prisma.automation.update({ where: { id }, data });

  // Replace steps if provided.
  if (Array.isArray(b.steps)) {
    await prisma.automationStep.deleteMany({ where: { automationId: id } });
    if (b.steps.length) {
      await prisma.automationStep.createMany({
        data: b.steps.map((s, i) => ({
          automationId: id,
          sortOrder: i,
          channel: s.channel === "sms" ? "sms" : "email",
          emailTemplateId: s.emailTemplateId || null,
          smsTemplateId: s.smsTemplateId || null,
          subjectOverride: s.subjectOverride || null,
          delayMinutes: Math.max(0, Number(s.delayMinutes) || 0),
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  await prisma.automation.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
