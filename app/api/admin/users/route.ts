import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { campaignsCountsByEmail } from "@/lib/admin/campaigns-counts";
import { prismaUserToAdminSample, portalRolesPayload } from "@/lib/admin/user-dto";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import type { UserRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

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

  const [users, counts] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    campaignsCountsByEmail(),
  ]);

  const list = users.map((u) =>
    prismaUserToAdminSample(u, counts.get(u.email.toLowerCase()) ?? 0)
  );
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

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  const hashed = await hash(password, 10);
  const rolesJson =
    role === "super_admin"
      ? Prisma.JsonNull
      : (portalRolesPayload(role as UserRole) as Prisma.InputJsonValue);

  const created = await prisma.user.create({
    data: {
      email: emailLower,
      name,
      role: role as UserRole,
      password: hashed,
      accountStatus,
      roles: rolesJson,
    },
  });

  const counts = await campaignsCountsByEmail();
  return NextResponse.json({
    user: prismaUserToAdminSample(created, counts.get(created.email.toLowerCase()) ?? 0),
  });
}
