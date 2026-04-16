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

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    newPassword?: string;
  } | null;

  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const name = body?.name !== undefined ? String(body.name).trim() || "Unnamed user" : undefined;
  const emailRaw = body?.email !== undefined ? String(body.email).trim() : undefined;
  const emailLower = emailRaw?.toLowerCase();
  const role = body?.role;
  const statusRaw = body?.status;
  const newPassword = body?.newPassword;

  if (emailRaw !== undefined) {
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower!)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    const duplicate = await prisma.user.findFirst({
      where: { email: emailLower!, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
  }

  if (role !== undefined && !isRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  let accountStatus = undefined as "active" | "invited" | "suspended" | undefined;
  if (statusRaw !== undefined) {
    const parsed = parseAccountStatus(String(statusRaw));
    if (!parsed) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    accountStatus = parsed;
  }

  if (newPassword !== undefined && newPassword !== "") {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
  }

  const effectiveRole = (role ?? row.role) as UserRole;
  const rolesJson =
    effectiveRole === "super_admin"
      ? Prisma.JsonNull
      : (portalRolesPayload(effectiveRole) as Prisma.InputJsonValue);

  const data: Prisma.UserUpdateInput = {};
  if (name !== undefined) data.name = name;
  if (emailLower !== undefined) data.email = emailLower;
  if (role !== undefined) data.role = role as UserRole;
  if (accountStatus !== undefined) data.accountStatus = accountStatus;
  data.roles = rolesJson;
  if (newPassword !== undefined && newPassword !== "") {
    data.password = await hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
  });

  const counts = await campaignsCountsByEmail();
  return NextResponse.json({
    user: prismaUserToAdminSample(updated, counts.get(updated.email.toLowerCase()) ?? 0),
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (row.email.toLowerCase() === auth.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
