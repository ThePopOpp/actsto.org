import { NextResponse } from "next/server";

import { EMAIL_CONSENT_COPY, EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, recordConsentEvent } from "@/lib/consent/data";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = (body?.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const contact = await prisma.contactConsent.findFirst({ where: { channel: "email", confirmToken: token } });
  if (!contact) return NextResponse.json({ error: "This confirmation link is invalid or has already been used." }, { status: 404 });

  await prisma.contactConsent.update({
    where: { id: contact.id },
    data: { confirmed: true, status: "subscribed", confirmToken: null },
  });

  await recordConsentEvent({
    channel: "email",
    status: "confirmed",
    previousStatus: contact.status,
    email: contact.email,
    contactName: contact.contactName,
    disclosureVersion: EMAIL_CONSENT_DISCLOSURE_VERSION,
    consentText: EMAIL_CONSENT_COPY,
    source: "email_confirm",
    meta: consentRequestMeta(request),
    evidence: { doubleOptIn: true },
  });

  return NextResponse.json({ ok: true, email: contact.email });
}
