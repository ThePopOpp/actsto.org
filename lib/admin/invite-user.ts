import "server-only";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";

import { campaignsCountsByEmail } from "@/lib/admin/campaigns-counts";
import { profileToAdminSample, portalRolesPayload } from "@/lib/admin/user-dto";
import { ensureRoleScaffold, syncAccountSetupProgress } from "@/lib/auth/account-types";
import type { PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";

export const INVITE_ROLES: UserRole[] = [
  "super_admin",
  "parent",
  "student",
  "donor_individual",
  "donor_business",
];

export function isInviteRole(s: string): s is UserRole {
  return INVITE_ROLES.includes(s as UserRole);
}

export function parseAccountStatus(s: string): "active" | "invited" | "suspended" | null {
  if (s === "active" || s === "invited" || s === "suspended") return s;
  return null;
}

export type InviteUserInput = {
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  password: string;
};

/** Shared by the admin "create user" route and Shepard's inviteUser tool — one audited path for account creation. */
export async function inviteUser(input: InviteUserInput) {
  const emailLower = input.email.trim().toLowerCase();
  if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw new Error("Valid email is required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const [existingProfile, existingLegacy] = await Promise.all([
    prisma.profile.findFirst({ where: { email: emailLower } }),
    prisma.user.findUnique({ where: { email: emailLower } }),
  ]);
  if (existingProfile || existingLegacy) {
    throw new Error("That email is already in use.");
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: emailLower,
    password: input.password,
    email_confirm: input.status === "active",
    user_metadata: { full_name: input.name, name: input.name },
  });

  if (error || !data.user) {
    throw new Error(
      error?.message?.includes("already") ? "That email already exists in Supabase Auth." : error?.message || "Could not create Supabase user."
    );
  }

  const userId = data.user.id;

  try {
    const isSuperAdmin = input.role === "super_admin";
    const portalRole = isPortalRole(input.role) ? (input.role as PortalRole) : null;

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: emailLower,
        fullName: input.name,
        displayName: input.name,
        primaryAccountType: portalRole,
        activeAccountType: portalRole,
        status: input.status,
        isSuperAdmin,
      },
      update: {
        email: emailLower,
        fullName: input.name,
        displayName: input.name,
        primaryAccountType: portalRole,
        activeAccountType: portalRole,
        status: input.status,
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
          name: input.name,
          role: input.role,
          password: await hash(input.password, 10),
          accountStatus: input.status,
          roles:
            input.role === "super_admin"
              ? Prisma.JsonNull
              : (portalRolesPayload(input.role) as Prisma.InputJsonValue),
        },
      })
      .catch(() => null);

    const counts = await campaignsCountsByEmail();
    const fullProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { userRoles: true },
    });

    return fullProfile ? profileToAdminSample(fullProfile, counts.get(fullProfile.email.toLowerCase()) ?? 0) : null;
  } catch (error) {
    await service.auth.admin.deleteUser(userId).catch(() => {});
    throw error instanceof Error ? error : new Error("Could not create app profile.");
  }
}
