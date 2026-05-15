import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  SMS_CONSENT_DISCLOSURE_VERSION,
  smsConsentDisclosureText,
  type SmsConsentCopyKey,
} from "@/lib/sms/consent-copy";
import { normalizePhone } from "@/lib/sms/twilio";

export type SmsConsentSource =
  | "contact"
  | "register_parent"
  | "register_student"
  | "register_donor_individual"
  | "register_donor_business"
  | "donation_tax_credit"
  | "sms_opt_in_page";

export function smsConsentRequestMetadata(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const userAgent = request.headers.get("user-agent") || null;
  const sourceUrl = request.url;

  return { ipAddress, userAgent, sourceUrl };
}

export async function recordSmsConsent({
  smsOptIn,
  source,
  formName,
  copyKey,
  userId,
  email,
  phone,
  ipAddress,
  userAgent,
  sourceUrl,
  metadata,
}: {
  smsOptIn: boolean;
  source: SmsConsentSource;
  formName: string;
  copyKey: SmsConsentCopyKey;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sourceUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const consentTimestamp = new Date();

  await prisma.smsConsentRecord.create({
    data: {
      smsConsent: smsOptIn,
      smsConsentTimestamp: consentTimestamp,
      userId: userId ?? null,
      email: email ?? null,
      phone: phone ?? null,
      phoneNormalized: normalizedPhone || null,
      source,
      sourceUrl: sourceUrl ?? null,
      formName,
      disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
      consentText: smsConsentDisclosureText(copyKey),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: metadata ?? {},
    },
  });

  if (userId && smsOptIn) {
    await prisma.communicationPreference.upsert({
      where: { userId },
      create: {
        userId,
        smsOptIn: true,
        smsConsentVersion: SMS_CONSENT_DISCLOSURE_VERSION,
        smsConsentAt: consentTimestamp,
        smsConsentSource: source,
      },
      update: {
        smsOptIn: true,
        smsConsentVersion: SMS_CONSENT_DISCLOSURE_VERSION,
        smsConsentAt: consentTimestamp,
        smsConsentSource: source,
      },
    });
  }
}
