import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    to?: string;
    subject?: string;
    text?: string;
  } | null;

  const to = (body?.to ?? "").trim();
  const subject = (body?.subject ?? "").trim();
  const text = (body?.text ?? "").trim();

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
  }
  if (!subject || !text) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }

  try {
    const info = await sendSmtpEmail({ to, subject, text });
    await prisma.emailThread.create({
      data: {
        channel: "email",
        subject,
        fromName: "Arizona Christian Tuition",
        fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "hello@actsto.org",
        unread: false,
        lastMessageAt: new Date(),
        messages: {
          create: {
            providerMessageId: info.messageId,
            direction: "outbound",
            fromName: "Arizona Christian Tuition",
            fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "hello@actsto.org",
            toEmail: to,
            subject,
            bodyText: text,
            sentAt: new Date(),
          },
        },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send email.",
      },
      { status: 500 },
    );
  }
}
