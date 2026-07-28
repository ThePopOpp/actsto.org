import "server-only";

import { prisma } from "@/lib/prisma";
import type { AutomationConditions, AutomationPayload } from "@/lib/automations/events";

export type AutomationContext = {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  roles?: string[];
  campaignId?: string | null;
  amount?: number | null;
  /** Merge-field values available to templates. */
  fields: AutomationPayload;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://actsto.org").replace(/\/$/, "");
}

async function conditionsMatch(conditions: AutomationConditions, ctx: AutomationContext): Promise<boolean> {
  if (typeof conditions.minAmount === "number" && conditions.minAmount > 0) {
    if ((ctx.amount ?? 0) < conditions.minAmount) return false;
  }
  if (conditions.campaignId) {
    if (ctx.campaignId !== conditions.campaignId) return false;
  }
  if (conditions.roles && conditions.roles.length) {
    let roles = ctx.roles;
    if (!roles && ctx.userId) {
      roles = (await prisma.userRoleRecord.findMany({ where: { userId: ctx.userId, status: "active" }, select: { role: true } })).map((r) => r.role);
    }
    if (!roles || !roles.some((r) => conditions.roles!.includes(r))) return false;
  }
  return true;
}

/**
 * Emit an automation trigger. Finds enabled automations for the event whose
 * conditions match, and schedules a job per step at now + the step's delay.
 * Never throws — safe to call from payment/auth critical paths.
 */
export async function fireAutomationEvent(event: string, ctx: AutomationContext): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({
      where: { triggerEvent: event, enabled: true },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    if (automations.length === 0) return;

    const fields: AutomationPayload = { site_url: siteUrl(), ...ctx.fields };
    const now = Date.now();
    const jobs: {
      automationId: string; stepId: string; triggerEvent: string; channel: string;
      recipientUserId: string | null; recipientEmail: string | null; recipientPhone: string | null;
      payload: AutomationPayload; scheduledFor: Date;
    }[] = [];

    for (const automation of automations) {
      const conditions = (automation.conditions ?? {}) as AutomationConditions;
      if (!(await conditionsMatch(conditions, ctx))) continue;
      for (const step of automation.steps) {
        jobs.push({
          automationId: automation.id,
          stepId: step.id,
          triggerEvent: event,
          channel: step.channel,
          recipientUserId: ctx.userId ?? null,
          recipientEmail: ctx.email ?? null,
          recipientPhone: ctx.phone ?? null,
          payload: fields,
          scheduledFor: new Date(now + step.delayMinutes * 60_000),
        });
      }
    }

    if (jobs.length) {
      await prisma.automationJob.createMany({ data: jobs as unknown as import("@prisma/client").Prisma.AutomationJobCreateManyInput[] });
    }
  } catch {
    // Automations must never break the triggering action.
  }
}
