import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { studentIsOldEnoughForLogin } from "@/lib/auth/account-types";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

async function getCurrentProfileId() {
  let userId: string | null = null;
  let email: string | null = null;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    email = user?.email?.toLowerCase() ?? null;
  } catch {
    // Legacy cookie fallback below.
  }

  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
  email ??= session?.email.toLowerCase() ?? null;

  if (!userId && email) {
    const profile = await prisma.profile.findFirst({
      where: { email },
      select: { id: true },
    });
    userId = profile?.id ?? null;
  }

  return { userId, session };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { userId, session } = await getCurrentProfileId();

  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session && !session.roles.includes("parent") && session.role !== "parent") {
    return NextResponse.json({ error: "Parent access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const inviteEmail = (body?.email ?? "").trim().toLowerCase();
  if (!inviteEmail || !inviteEmail.includes("@")) {
    return NextResponse.json({ error: "Student email is required." }, { status: 400 });
  }

  const hasParentRole = await prisma.userRoleRecord.findUnique({
    where: { userId_role: { userId, role: "parent" } },
    select: { id: true, status: true },
  });
  if (!hasParentRole || hasParentRole.status !== "active") {
    return NextResponse.json({ error: "Parent access required." }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      parentUserId: true,
      studentUserId: true,
      birthDate: true,
      ageVerified: true,
    },
  });

  if (!student || student.parentUserId !== userId) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }
  if (student.studentUserId) {
    return NextResponse.json(
      { error: "This student already has an independent login connected." },
      { status: 400 },
    );
  }
  if (!studentIsOldEnoughForLogin(student)) {
    return NextResponse.json(
      { error: "Independent student login requires the student to be 16 or older." },
      { status: 400 },
    );
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.student.update({
    where: { id: student.id },
    data: {
      studentInviteEmail: inviteEmail,
      studentInviteToken: token,
      studentInviteExpiresAt: expiresAt,
      studentInviteAcceptedAt: null,
    },
  });

  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  return NextResponse.json({
    ok: true,
    token,
    inviteUrl: `${origin}/register/student?invite=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  });
}
