import { NextResponse } from "next/server";

import { consentRequestMeta, getContactState, recordConsentEvent, upsertContactState, contactKeyFor } from "@/lib/consent/data";
import { recordSmsConsent } from "@/lib/sms/consent";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent-copy";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: string } | null;
  const phone = (body?.phone ?? "").trim();
  if (!phone) return NextResponse.json({ error: "A phone number is required." }, { status: 400 });

  const meta = consentRequestMeta(request);
  const prev = await getContactState("sms", contactKeyFor("sms", null, phone));

  await recordConsentEvent({
    channel: "sms",
    status: "opt_out",
    previousStatus: prev?.status ?? null,
    phone,
    disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
    consentText: "User requested to stop receiving SMS messages from ACTSTO.",
    source: "sms_opt_out_page",
    meta,
  });
  await upsertContactState({ channel: "sms", phone, status: "unsubscribed" });

  await recordSmsConsent({
    smsOptIn: false,
    source: "sms_opt_in_page",
    formName: "public_sms_opt_out",
    copyKey: "optInPage",
    phone,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    sourceUrl: meta.sourceUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
