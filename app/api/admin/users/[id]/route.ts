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

  const [profileRow, legacyRow] = await Promise.all([
    prisma.profile.findUnique({ where: { id }, include: { userRoles: true } }),
    prisma.user.findUnique({ where: { id } }),
  ]);
  if (!profileRow && !legacyRow) {
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
    const [duplicateProfile, duplicateLegacy] = await Promise.all([
      prisma.profile.findFirst({ where: { email: emailLower!, NOT: { id } } }),
      prisma.user.findFirst({ where: { email: emailLower!, NOT: { id } } }),
    ]);
    if (duplicateProfile || duplicateLegacy) {
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

  const effectiveRole = (role ?? (profileRow ? (profileRow.isSuperAdmin ? "super_admin" : profileRow.activeAccountType ?? "parent") : legacyRow!.role)) as UserRole;
  const rolesJson =
    effectiveRole === "super_admin"
      ? Prisma.JsonNull
      : (portalRolesPayload(effectiveRole) as Prisma.InputJsonValue);

  if (profileRow) {
    const service = createServiceClient();
    const authUpdates: Parameters<typeof service.auth.admin.updateUserById>[1] = {};
    if (emailLower !== undefined) authUpdates.email = emailLower;
    if (name !== undefined) authUpdates.user_metadata = { full_name: name, name };
    if (newPassword !== undefined && newPassword !== "") authUpdates.password = newPassword;
    if (Object.keys(authUpdates).length > 0) {
      const { error } = await service.auth.admin.updateUserById(profileRow.id, authUpdates);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const isSuperAdmin = effectiveRole === "super_admin";
    const portalRole = isPortalRole(effectiveRole) ? (effectiveRole as PortalRole) : null;
    const updated = await prisma.profile.update({
      where: { id: profileRow.id },
      data: {
        ...(name !== undefined ? { fullName: name, displayName: name } : {}),
        ...(emailLower !== undefined ? { email: emailLower } : {}),
        ...(accountStatus !== undefined ? { status: accountStatus } : {}),
        isSuperAdmin,
        primaryAccountType: portalRole,
        activeAccountType: portalRole,
      },
      include: { userRoles: true },
    });

    if (role !== undefined) {
      if (portalRole) {
        await prisma.userRoleRecord.updateMany({
          where: { userId: profileRow.id, NOT: { role: portalRole } },
          data: { status: "suspended" },
        });
        await ensureRoleScaffold(profileRow.id, portalRole);
        await syncAccountSetupProgress(profileRow.id, portalRole);
      } else {
        await prisma.userRoleRecord.updateMany({
          where: { userId: profileRow.id },
          data: { status: "suspended" },
        });
      }
    }

    await prisma.user
      .update({
        where: { email: profileRow.email.toLowerCase() },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(emailLower !== undefined ? { email: emailLower } : {}),
          role: effectiveRole,
          ...(accountStatus !== undefined ? { accountStatus } : {}),
          roles: rolesJson,
          ...(newPassword !== undefined && newPassword !== "" ? { password: await hash(newPassword, 10) } : {}),
        },
      })
      .catch(() => null);

    const refreshed = await prisma.profile.findUnique({
      where: { id: updated.id },
      include: { userRoles: true },
    });
    const counts = await campaignsCountsByEmail();
    return NextResponse.json({
      user: refreshed
        ? profileToAdminSample(refreshed, counts.get(refreshed.email.toLowerCase()) ?? 0)
        : profileToAdminSample(updated, counts.get(updated.email.toLowerCase()) ?? 0),
    });
  }

  const data: Prisma.UserUpdateInput = {};
  if (name !== undefined) data.name = name;
  if (emailLower !== undefined) data.email = emailLower;
  if (role !== undefined) data.role = role as UserRole;
  if (accountStatus !== undefined) data.accountStatus = accountStatus;
  data.roles = rolesJson;
  if (newPassword !== undefined && newPassword !== "") data.password = await hash(newPassword, 10);

  const updated = await prisma.user.update({ where: { id }, data });

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

  const [profileRow, legacyRow] = await Promise.all([
    prisma.profile.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id } }),
  ]);
  if (!profileRow && !legacyRow) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const email = (profileRow?.email ?? legacyRow?.email ?? "").toLowerCase();
  if (email === auth.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  if (profileRow) {
    const service = createServiceClient();
    await service.auth.admin.deleteUser(profileRow.id).catch(() => null);
    await prisma.profile.delete({ where: { id: profileRow.id } }).catch(() => null);
    await prisma.user.delete({ where: { email: profileRow.email.toLowerCase() } }).catch(() => null);
  } else if (legacyRow) {
    await prisma.user.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
