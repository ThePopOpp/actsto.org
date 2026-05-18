import { NextResponse } from "next/server";

import {
  createPasswordResetToken,
  passwordResetExpiresAt,
  requestIpAddress,
  siteUrlFromEnv,
} from "@/lib/auth/password-reset";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { prisma } from "@/lib/prisma";

const GENERIC_RESPONSE =
  "If an account exists for that email, a password reset link has been sent.";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!email || !validEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const [profile, legacyUser] = await Promise.all([
    prisma.profile.findFirst({ where: { email } }).catch(() => null),
    prisma.user.findUnique({ where: { email } }).catch(() => null),
  ]);

  if (!profile && !legacyUser) {
    return NextResponse.json({ ok: true, message: GENERIC_RESPONSE });
  }

  const { token, tokenHash } = createPasswordResetToken();
  const expiresAt = passwordResetExpiresAt();
  const resetUrl = `${siteUrlFromEnv()}/reset-password?token=${encodeURIComponent(token)}`;

  await prisma.passwordResetToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent"),
    },
  });

  await sendSmtpEmail({
    to: email,
    subject: "Reset your ACTSTO password",
    templateKey: "password_reset",
    text: [
      "We received a request to reset your ACTSTO password.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 1 hour. If you did not request this, you can ignore this email.",
      "",
      "Arizona Christian Tuition",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <p>We received a request to reset your ACTSTO password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#b91c1c;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none">
            Reset password
          </a>
        </p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        <p>Arizona Christian Tuition</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, message: GENERIC_RESPONSE });
}

