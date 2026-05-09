import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureRoleScaffold, syncAccountSetupProgress } from "@/lib/auth/account-types";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

async function getCurrentUserId() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    // Cookie fallback below handles legacy sessions where possible.
  }

  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "student") return null;

  const profile = await prisma.profile.findFirst({
    where: { email: session.email.toLowerCase() },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await ensureRoleScaffold(userId, "student");

  const [profile, student, schools] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, fullName: true, email: true, phone: true },
    }),
    prisma.student.findUnique({
      where: { studentUserId: userId },
      select: {
        firstName: true,
        lastName: true,
        nickname: true,
        grade: true,
        schoolId: true,
        birthDate: true,
        ageVerified: true,
        bio: true,
        profilePhotoUrl: true,
        status: true,
      },
    }),
    prisma.school.findMany({
      where: { status: { in: ["active", "approved"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, state: true },
    }),
  ]);

  if (!student) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile, student, schools });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    grade?: string;
    schoolId?: string;
    bio?: string;
    profilePhotoUrl?: string;
    phone?: string;
  } | null;

  const firstName = (body?.firstName ?? "").trim();
  const lastName = (body?.lastName ?? "").trim();
  const schoolId = (body?.schoolId ?? "").trim() || null;

  if (!firstName) {
    return NextResponse.json({ error: "First name is required." }, { status: 400 });
  }

  if (schoolId) {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!school) {
      return NextResponse.json({ error: "Selected school was not found." }, { status: 400 });
    }
  }

  const [student] = await prisma.$transaction([
    prisma.student.update({
      where: { studentUserId: userId },
      data: {
        firstName,
        lastName,
        nickname: (body?.nickname ?? "").trim() || null,
        grade: (body?.grade ?? "").trim() || null,
        schoolId,
        bio: (body?.bio ?? "").trim() || null,
        profilePhotoUrl: (body?.profilePhotoUrl ?? "").trim() || null,
      },
    }),
    prisma.profile.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(" "),
        phone: (body?.phone ?? "").trim() || null,
      },
    }),
  ]);

  await syncAccountSetupProgress(userId, "student");
  return NextResponse.json({ ok: true, student });
}
