import { NextResponse } from "next/server";

import { recordSmsConsent, smsConsentRequestMetadata } from "@/lib/sms/consent";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    smsConsent?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const firstName = text(body.firstName);
  const lastName = text(body.lastName);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);
  const smsConsent = body.smsConsent === true;

  if (!firstName || !email.includes("@") || !phone) {
    return NextResponse.json({ error: "Please provide your first name, email, and phone number." }, { status: 400 });
  }

  await recordSmsConsent({
    smsOptIn: smsConsent,
    source: "sms_opt_in_page",
    formName: "SMS Opt-In Page",
    copyKey: "optInPage",
    email,
    phone,
    ...smsConsentRequestMetadata(request),
    metadata: {
      firstName,
      lastName,
      form: "sms_opt_in_page",
    },
  });

  return NextResponse.json({
    ok: true,
    smsConsent,
    message: smsConsent
      ? "Your SMS opt-in request has been recorded."
      : "Your form was received, but SMS opt-in was not granted because the checkbox was not selected.",
  });
}
