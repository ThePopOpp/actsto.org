import "server-only";

import { prisma } from "@/lib/prisma";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { resolveSmsContact } from "@/lib/sms/contact-matching";
import { normalizePhone, sendTwilioSms } from "@/lib/sms/twilio";

export async function notifyIncompleteCampaignDraft({
  userId,
  campaignId,
  campaignSlug,
  campaignTitle,
  email,
  phone,
  missingFields,
}: {
  userId: string;
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  email?: string | null;
  phone?: string | null;
  missingFields: string[];
}) {
  const title = "Finish your ACTSTO campaign";
  const actionUrl = `/dashboard/parent/campaigns/${campaignSlug}/edit`;
  const missingText = missingFields.slice(0, 4).join(", ");
  const message =
    missingFields.length > 0
      ? `${campaignTitle} is saved as a draft. Finish ${missingText}${missingFields.length > 4 ? ", and a few more items" : ""} before submitting for review.`
      : `${campaignTitle} is ready to submit for review.`;

  await prisma.dashboardNotification
    .create({
      data: {
        userId,
        title,
        message,
        notificationType: "campaign_incomplete",
        actionUrl,
      },
    })
    .catch(() => null);

  if (email) {
    await sendSmtpEmail({
      to: email,
      subject: "Your ACTSTO campaign draft is saved",
      text: `${message}\n\nContinue here: ${process.env.APP_URL ?? "https://actsto.org"}${actionUrl}`,
      html: `<p>${message}</p><p><a href="${process.env.APP_URL ?? "https://actsto.org"}${actionUrl}">Continue your campaign</a></p>`,
    }).catch(() => null);
  }

  const normalizedPhone = phone ? normalizePhone(phone) : "";
  if (normalizedPhone) {
    const body = `ACTSTO: ${campaignTitle} is saved as a draft. Finish it here: ${(process.env.APP_URL ?? "https://actsto.org")}${actionUrl}`;
    const contact = await resolveSmsContact(normalizedPhone).catch(() => null);
    const result = await sendTwilioSms({ to: normalizedPhone, body }).catch((error) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send SMS.",
    }));

    await prisma.smsLog
      .create({
        data: {
          userId: contact?.userId ?? userId,
          profileId: contact?.profileId ?? userId,
          roleType: contact?.roleType ?? "parent",
          campaignId,
          contactName: contact?.contactName ?? null,
          contactEmail: contact?.contactEmail ?? email ?? null,
          contactSource: contact?.contactSource ?? "campaign.parent_phone",
          matchedPhone: contact?.matchedPhone ?? normalizedPhone,
          direction: "outbound",
          fromPhone: result.ok ? result.from : null,
          toPhone: normalizedPhone,
          message: body,
          provider: "twilio",
          providerMessageId: result.ok ? result.sid : null,
          status: result.ok ? result.status : "failed",
          errorMessage: result.ok ? null : result.error,
          segments: result.ok ? result.segments : null,
          sentAt: result.ok ? new Date() : null,
        },
      })
      .catch(() => null);
  }

  await prisma.campaign
    .update({
      where: { id: campaignId },
      data: { lastCompletionReminderAt: new Date() },
    })
    .catch(() => null);
}
