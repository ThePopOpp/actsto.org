import { NextResponse } from "next/server";

import { sendSmtpEmail } from "@/lib/email/smtp";
import { recordSmsConsent, smsConsentRequestMetadata } from "@/lib/sms/consent";

const CONTACT_TO = "hello@actsto.org";

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (field(form, "company")) {
    return NextResponse.json({ ok: true });
  }

  const firstName = field(form, "firstName");
  const lastName = field(form, "lastName");
  const email = field(form, "email").toLowerCase();
  const phone = field(form, "phone");
  const message = field(form, "message");
  const consent = form.get("consent");
  const smsConsent = field(form, "smsConsent") === "true";

  if (!firstName || !email.includes("@") || !message || !consent) {
    return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
  }

  const name = [firstName, lastName].filter(Boolean).join(" ");
  const subject = `ACTSTO contact form: ${name}`;
  const text = [
    "New quick contact form submission",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  try {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || "Not provided");
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    await sendSmtpEmail({
      to: CONTACT_TO,
      subject,
      text,
      html: `
        <p><strong>New quick contact form submission</strong></p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });
    await recordSmsConsent({
      smsOptIn: smsConsent,
      source: "contact",
      formName: "Contact",
      copyKey: "contact",
      email,
      phone: phone || null,
      ...smsConsentRequestMetadata(request),
      metadata: {
        name,
        form: "quick_contact",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send your message." },
      { status: 500 },
    );
  }
}
