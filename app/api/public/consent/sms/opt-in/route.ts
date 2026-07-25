import { NextResponse } from "next/server";

import { consentRequestMeta, getContactState, recordConsentEvent, upsertContactState, contactKeyFor } from "@/lib/consent/data";
import { recordSmsConsent } from "@/lib/sms/consent";
import { SMS_CONSENT_DISCLOSURE_VERSION, smsConsentDisclosureText } from "@/lib/sms/consent-copy";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; phone?: string; consent?: boolean } | null;
  const phone = (body?.phone ?? "").trim();
  if (!phone) return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
  if (!body?.consent) return NextResponse.json({ error: "Please check the SMS consent box to opt in." }, { status: 400 });

  const meta = consentRequestMeta(request);
  const consentText = smsConsentDisclosureText("optInPage");
  const prev = await getContactState("sms", contactKeyFor("sms", null, phone));

  await recordConsentEvent({
    channel: "sms",
    status: "opt_in",
    previousStatus: prev?.status ?? null,
    contactName: body.name ?? null,
    phone,
    disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
    consentText,
    source: "sms_opt_in_page",
    meta,
    evidence: { consentCheckbox: true, checkedByUser: true },
  });
  await upsertContactState({
    channel: "sms",
    phone,
    contactName: body.name ?? null,
    status: "subscribed",
    confirmed: true,
    disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
  });

  // Mirror into the legacy SmsConsentRecord audit for continuity.
  await recordSmsConsent({
    smsOptIn: true,
    source: "sms_opt_in_page",
    formName: "public_sms_opt_in",
    copyKey: "optInPage",
    phone,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    sourceUrl: meta.sourceUrl,
    metadata: { referrer: meta.referrer },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
