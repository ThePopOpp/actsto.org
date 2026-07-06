import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveSmsContact } from "@/lib/sms/contact-matching";
import { sendTwilioSms } from "@/lib/sms/twilio";

export const MAX_BULK_SMS_RECIPIENTS = 50;

function dollars(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type AdminSmsResult = {
  to: string;
  ok: boolean;
  error: string | null;
  logId: string;
  contactName: string | null;
  roleType: string | null;
  campaignId: string | null;
};

/** Shared by the admin SMS panel and Shepard's sendSms tool — same Twilio send + SmsLog audit trail. */
export async function sendAdminSms(recipients: string[], message: string): Promise<AdminSmsResult[]> {
  const results: AdminSmsResult[] = [];
  for (const to of recipients) {
    const contact = await resolveSmsContact(to);
    const result = await sendTwilioSms({ to, body: message });
    const log = await prisma.smsLog.create({
      data: {
        userId: contact.userId,
        profileId: contact.profileId,
        roleType: contact.roleType,
        campaignId: contact.campaignId,
        contactName: contact.contactName,
        contactEmail: contact.contactEmail,
        contactSource: contact.contactSource,
        matchedPhone: contact.matchedPhone,
        direction: "outbound",
        fromPhone: result.ok ? result.from : null,
        toPhone: to,
        message,
        provider: "twilio",
        providerMessageId: result.ok ? result.sid : null,
        status: result.ok ? result.status : "failed",
        errorMessage: result.ok ? null : result.error,
        segments: result.ok ? result.segments : null,
        price: result.ok ? dollars(result.price) : null,
        priceUnit: result.ok ? result.priceUnit : null,
        sentAt: result.ok ? new Date() : null,
      },
    });
    results.push({
      to,
      ok: result.ok,
      error: result.ok ? null : result.error,
      logId: log.id,
      contactName: contact.contactName,
      roleType: contact.roleType,
      campaignId: contact.campaignId,
    });
  }
  return results;
}
