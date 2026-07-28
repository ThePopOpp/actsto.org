import "server-only";

import { getEmailTemplateById } from "@/lib/admin/email-templates";
import { applyMergeFields, type AutomationPayload } from "@/lib/automations/events";
import { prisma } from "@/lib/prisma";
import { sendAdminSms } from "@/lib/sms/send-admin-sms";
import { sendEmail } from "@/lib/email/send";

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Process due automation jobs: render the step's template with merge fields and send. */
export async function processDueAutomationJobs(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const jobs = await prisma.automationJob.findMany({
    where: { status: "pending", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const step = await prisma.automationStep.findUnique({ where: { id: job.stepId } });
      if (!step) {
        await prisma.automationJob.update({ where: { id: job.id }, data: { status: "cancelled", error: "Step was deleted" } });
        continue;
      }
      const payload = (job.payload ?? {}) as AutomationPayload;

      if (step.channel === "sms") {
        if (!job.recipientPhone) throw new Error("No recipient phone.");
        if (!step.smsTemplateId) throw new Error("Step has no SMS template.");
        const tpl = await prisma.smsTemplate.findUnique({ where: { id: step.smsTemplateId } });
        if (!tpl) throw new Error("SMS template not found.");
        const [res] = await sendAdminSms([job.recipientPhone], applyMergeFields(tpl.message, payload));
        if (!res?.ok) throw new Error(res?.error ?? "SMS send failed.");
      } else {
        if (!job.recipientEmail) throw new Error("No recipient email.");
        if (!step.emailTemplateId) throw new Error("Step has no email template.");
        const tpl = await getEmailTemplateById(step.emailTemplateId);
        if (!tpl) throw new Error("Email template not found.");
        const subject = applyMergeFields(step.subjectOverride || tpl.subject || "A message from ACTSTO", payload);
        const html = applyMergeFields(tpl.content ?? "", payload);
        await sendEmail({ to: job.recipientEmail, subject, html, text: htmlToText(html), templateKey: "automation" });
      }

      await prisma.automationJob.update({ where: { id: job.id }, data: { status: "sent", sentAt: new Date() } });
      sent += 1;
    } catch (error) {
      await prisma.automationJob
        .update({ where: { id: job.id }, data: { status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "Send failed." } })
        .catch(() => null);
      failed += 1;
    }
  }

  return { processed: jobs.length, sent, failed };
}
