import nodemailer from "nodemailer";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getResendConfig, getSmtpConfig } from "@/lib/email/config";

export type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  templateKey?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  /**
   * Send as someone other than the configured default (an AI agent's mailbox).
   * Must be on a domain the provider has verified; callers check that.
   */
  from?: { name: string; email: string };
  /** Extra headers, e.g. List-Unsubscribe for agent outreach. */
  headers?: Record<string, string>;
};

export type SendResult = {
  messageId: string;
  provider: "resend" | "smtp";
  skipped?: boolean;
  /**
   * Who it actually went out as. Callers that record the send were previously
   * re-deriving this from SMTP env vars, which is wrong the moment Resend is
   * the active provider — the logged sender disagreed with the real one.
   */
  from: { name: string; email: string };
};

async function logEmail(args: SendEmailArgs, provider: string, messageId: string, status: string, payload: Prisma.InputJsonValue) {
  await prisma.emailLog
    .create({
      data: {
        toEmail: args.to,
        subject: args.subject,
        templateKey: args.templateKey ?? "admin_compose",
        provider,
        providerMessageId: messageId || null,
        status,
        sentAt: status === "sent" ? new Date() : null,
        payload,
      },
    })
    .catch(() => {});
}

/**
 * Split a `to` value into individual addresses.
 *
 * A single address returns a one-element array, so this is a no-op for every
 * existing caller. It only matters where a setting names more than one
 * recipient — ADMIN_EMAIL, for instance.
 */
function recipientList(to: string): string[] {
  return to
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

async function sendViaResend(
  cfg: NonNullable<ReturnType<typeof getResendConfig>>,
  args: SendEmailArgs,
): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${args.from?.name ?? cfg.fromName} <${args.from?.email ?? cfg.fromEmail}>`,
      // Resend needs an array; SMTP splits a comma list itself. Going through
      // recipientList means a multi-recipient setting behaves the same on both.
      to: recipientList(args.to),
      subject: args.subject,
      text: args.text,
      html: args.html,
      reply_to: args.replyTo ?? cfg.replyTo,
      attachments: args.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      headers: args.headers,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    await logEmail(args, "resend", "", "failed", { error: data.message ?? `HTTP ${res.status}` });
    throw new Error(`Resend error: ${data.message ?? `HTTP ${res.status}`}`);
  }
  const from = args.from ?? { name: cfg.fromName, email: cfg.fromEmail };
  await logEmail(args, "resend", data.id ?? "", "sent", { from: from.email });
  return {
    messageId: data.id ?? "",
    provider: "resend",
    from,
  };
}

async function sendViaSmtp(args: SendEmailArgs): Promise<SendResult> {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  const from = args.from ?? { name: config.fromName, email: config.fromEmail };
  const info = await transporter.sendMail({
    from: `"${from.name}" <${from.email}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
    replyTo: args.replyTo,
    attachments: args.attachments,
    headers: args.headers,
  });
  await logEmail(args, "smtp", info.messageId, "sent", {
    from: from.email,
    response: info.response,
    accepted: info.accepted.map(String),
    rejected: info.rejected.map(String),
  });
  return {
    messageId: info.messageId,
    provider: "smtp",
    from,
  };
}

/**
 * Provider-aware send. Prefers Resend (HTTP) whenever RESEND_API_KEY is set,
 * otherwise falls back to SMTP (nodemailer). Every send is logged to EmailLog.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendResult> {
  const resend = getResendConfig();
  if (resend) return sendViaResend(resend, args);
  return sendViaSmtp(args);
}

/** Backward-compatible alias — existing callers import `sendSmtpEmail`. */
export const sendSmtpEmail = sendEmail;
