import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  ensureRoleScaffold,
  getAccountTypeSummaries,
  syncAccountSetupProgress,
} from "@/lib/auth/account-types";
import { decodeSession, encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { ActSession, PortalRole, UserRole } from "@/lib/auth/types";
import { PORTAL_ROLES } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

function isPortalRoleStr(value: string): value is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(value);
}

function parseBirthDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageFromBirthDate(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 14,
};

async function getRequestIdentity() {
  let userId: string | null = null;
  let email: string | null = null;
  let name: string | null = null;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
      email = user.email?.toLowerCase() ?? null;
      const meta = user.user_metadata as Record<string, string> | undefined;
      name = meta?.full_name ?? meta?.name ?? null;
    }
  } catch {
    // Cookie fallback below covers legacy auth.
  }

  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
  email ??= session?.email.toLowerCase() ?? null;
  name ??= session?.name ?? null;

  return { userId, email, name, session };
}

function summariesFromSession(session: ActSession) {
  return PORTAL_ROLES.map((role) => {
    const isActive = session.roles.includes(role);
    return {
      role,
      label:
        role === "parent"
          ? "Parent"
          : role === "student"
            ? "Student"
            : role === "donor_individual"
              ? "Individual Donor"
              : "Business Donor",
      status: isActive ? "active" : "available",
      isActive,
      isComplete: false,
      completionPercent: 0,
      requiredFields: [],
      completedFields: [],
      missingFields: [],
      dashboardHref: dashboardPathForRole(role),
    };
  });
}

export async function GET() {
  const { userId, session } = await getRequestIdentity();

  if (!userId && !session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (session?.role === "super_admin") {
    return NextResponse.json({ error: "Use the admin dashboard." }, { status: 400 });
  }

  if (userId) {
    const accountTypes = await getAccountTypeSummaries(userId);
    return NextResponse.json({ accountTypes });
  }

  return NextResponse.json({ accountTypes: session ? summariesFromSession(session) : [] });
}

export async function POST(request: Request) {
  const { userId, email, name, session } = await getRequestIdentity();
  const body = (await request.json().catch(() => null)) as { role?: string; birthDate?: string } | null;
  const role = body?.role ?? "";

  if (!isPortalRoleStr(role)) {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  if (!userId && !session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (session?.role === "super_admin") {
    return NextResponse.json({ error: "Use the admin dashboard." }, { status: 400 });
  }

  const birthDate = role === "student" ? parseBirthDate(body?.birthDate) : null;
  if (role === "student" && (!birthDate || ageFromBirthDate(birthDate) < 16)) {
    return NextResponse.json(
      { error: "Students must be 16 or older to add a self-managed student account." },
      { status: 400 }
    );
  }

  let roles = session?.roles ?? [];

  if (userId) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, displayName: true, primaryAccountType: true },
    });

    await prisma.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email ?? profile?.email ?? session?.email ?? "",
        fullName: name ?? profile?.fullName ?? session?.name ?? null,
        displayName: profile?.displayName ?? null,
        primaryAccountType: role,
        activeAccountType: role,
        status: "active",
      },
      update: {
        primaryAccountType: profile?.primaryAccountType ?? role,
        activeAccountType: role,
        status: "active",
      },
    });

    await ensureRoleScaffold(userId, role, { birthDate });
    await syncAccountSetupProgress(userId, role);

    const freshRoles = await prisma.userRoleRecord.findMany({
      where: { userId, status: "active" },
      select: { role: true },
    });
    roles = freshRoles.map((row) => row.role).filter(isPortalRoleStr);
  } else if (session?.email) {
    roles = [...new Set([...session.roles, role])];
  }

  if (email) {
    await prisma.user.update({
      where: { email },
      data: {
        role: role as UserRole,
        roles: roles as unknown as Prisma.InputJsonValue,
      },
    }).catch(() => {});
  }

  const updatedSession: ActSession = {
    email: email ?? session?.email ?? "",
    name: name ?? session?.name ?? email?.split("@")[0] ?? "User",
    role,
    roles: roles.length > 0 ? roles : [role],
  };

  const res = NextResponse.json({
    ok: true,
    redirect: dashboardPathForRole(role),
    accountTypes: userId ? await getAccountTypeSummaries(userId) : summariesFromSession(updatedSession),
  });
  res.cookies.set(SESSION_COOKIE_NAME, encodeSession(updatedSession), COOKIE_OPTS);
  return res;
}
