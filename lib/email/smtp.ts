import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";
import { getSmtpConfig } from "@/lib/email/config";

export async function sendSmtpEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  await prisma.emailLog.create({
    data: {
      toEmail: to,
      subject,
      templateKey: "admin_compose",
      provider: "smtp",
      providerMessageId: info.messageId,
      status: "sent",
      sentAt: new Date(),
      payload: {
        from: config.fromEmail,
        response: info.response,
        accepted: info.accepted.map(String),
        rejected: info.rejected.map(String),
      },
    },
  }).catch(() => {});

  return info;
}
