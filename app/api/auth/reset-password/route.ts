import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    password?: string;
  } | null;

  const token = (body?.token ?? "").trim();
  const password = body?.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Reset link is missing or invalid." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const email = resetToken.email.toLowerCase();
  const [profile, legacyUser] = await Promise.all([
    prisma.profile.findFirst({ where: { email } }),
    prisma.user.findUnique({ where: { email } }).catch(() => null),
  ]);

  if (!profile && !legacyUser) {
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json(
      { error: "This reset link is no longer connected to an active account." },
      { status: 400 }
    );
  }

  if (profile) {
    const service = createServiceClient();
    const { error } = await service.auth.admin.updateUserById(profile.id, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (legacyUser) {
    await prisma.user.update({
      where: { id: legacyUser.id },
      data: { password: await hash(password, 10) },
    });
  } else if (profile) {
    await prisma.user
      .update({
        where: { email },
        data: { password: await hash(password, 10) },
      })
      .catch(() => null);
  }

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });
  await prisma.passwordResetToken.updateMany({
    where: { email, usedAt: null, id: { not: resetToken.id } },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true, message: "Your password has been updated." });
}

