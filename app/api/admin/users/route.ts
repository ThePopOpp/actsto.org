import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { campaignsCountsByEmail } from "@/lib/admin/campaigns-counts";
import { profileToAdminSample, prismaUserToAdminSample, portalRolesPayload } from "@/lib/admin/user-dto";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { ensureRoleScaffold, syncAccountSetupProgress } from "@/lib/auth/account-types";
import type { PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";

const ROLES: UserRole[] = [
  "super_admin",
  "parent",
  "student",
  "donor_individual",
  "donor_business",
];

function isRole(s: string): s is UserRole {
  return ROLES.includes(s as UserRole);
}

function parseAccountStatus(s: string): "active" | "invited" | "suspended" | null {
  if (s === "active" || s === "invited" || s === "suspended") return s;
  return null;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [profiles, legacyUsers, counts] = await Promise.all([
    prisma.profile.findMany({
      include: { userRoles: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    campaignsCountsByEmail(),
  ]);

  const profileEmails = new Set(profiles.map((profile) => profile.email.toLowerCase()));
  const list = [
    ...profiles.map((profile) =>
      profileToAdminSample(profile, counts.get(profile.email.toLowerCase()) ?? 0)
    ),
    ...legacyUsers
      .filter((user) => !profileEmails.has(user.email.toLowerCase()))
      .map((user) => prismaUserToAdminSample(user, counts.get(user.email.toLowerCase()) ?? 0)),
  ];
  return NextResponse.json({ users: list });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    password?: string;
  } | null;

  const name = (body?.name ?? "").trim() || "Unnamed user";
  const emailRaw = (body?.email ?? "").trim();
  const emailLower = emailRaw.toLowerCase();
  const password = body?.password ?? "";
  const role = body?.role;
  const statusRaw = body?.status;

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!role || !isRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const accountStatus = statusRaw ? parseAccountStatus(statusRaw) : null;
  if (!accountStatus) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const [existingProfile, existingLegacy] = await Promise.all([
    prisma.profile.findFirst({ where: { email: emailLower } }),
    prisma.user.findUnique({ where: { email: emailLower } }),
  ]);
  if (existingProfile || existingLegacy) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: emailLower,
    password,
    email_confirm: accountStatus === "active",
    user_metadata: { full_name: name, name },
  });

  if (error || !data.user) {
    const message = error?.message?.includes("already")
      ? "That email already exists in Supabase Auth."
      : error?.message || "Could not create Supabase user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = data.user.id;

  try {
    const isSuperAdmin = role === "super_admin";
    const portalRole = isPortalRole(role as UserRole) ? (role as PortalRole) : null;

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: emailLower,
        fullName: name,
        displayName: name,
        primaryAccountType: portalRole,
        activeAccountType: portalRole,
        status: accountStatus,
        isSuperAdmin,
      },
      update: {
        email: emailLower,
        fullName: name,
        displayName: name,
        primaryAccountType: portalRole,
        activeAccountType: portalRole,
        status: accountStatus,
        isSuperAdmin,
      },
    });

    if (portalRole) {
      await ensureRoleScaffold(userId, portalRole);
      await syncAccountSetupProgress(userId, portalRole);
    }

    // Keep the legacy table in sync during the migration window so older fallback
    // login paths and reports do not lose this account.
    await prisma.user
      .create({
        data: {
          email: emailLower,
          name,
          role: role as UserRole,
          password: await hash(password, 10),
          accountStatus,
          roles:
            role === "super_admin"
              ? Prisma.JsonNull
              : (portalRolesPayload(role as UserRole) as Prisma.InputJsonValue),
        },
      })
      .catch(() => null);

    const counts = await campaignsCountsByEmail();
    const fullProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { userRoles: true },
    });

    return NextResponse.json({
      user: fullProfile
        ? profileToAdminSample(fullProfile, counts.get(fullProfile.email.toLowerCase()) ?? 0)
        : null,
    });
  } catch (error) {
    await service.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create app profile." },
      { status: 500 }
    );
  }
}
