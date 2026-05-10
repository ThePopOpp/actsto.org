import type { AccountStatus, Prisma, User } from "@prisma/client";

import type { AdminUserSample } from "@/lib/admin/mock-users";
import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import type { UserRole } from "@/lib/auth/types";
import { PORTAL_ROLES, type PortalRole } from "@/lib/auth/types";

function formatLastActive(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

export function prismaUserToAdminSample(
  u: User,
  campaignsCount: number
): AdminUserSample {
  const statusMap: Record<AccountStatus, AdminUserSample["status"]> = {
    active: "active",
    invited: "invited",
    suspended: "suspended",
  };
  return {
    id: u.id,
    name: u.name ?? "Unnamed user",
    email: u.email,
    role: canAccessSuperAdminDashboard(u.email) ? "super_admin" : (u.role as UserRole),
    status: statusMap[u.accountStatus] ?? "active",
    lastActive: u.lastLoginAt ? formatLastActive(u.lastLoginAt) : "—",
    campaignsCount,
  };
}

export function portalRolesPayload(role: UserRole): unknown {
  if (role === "super_admin") return null;
  return [role];
}

type AdminProfile = Prisma.ProfileGetPayload<{
  include: { userRoles: true };
}>;

function isPortalRoleString(value: string | null | undefined): value is PortalRole {
  return !!value && (PORTAL_ROLES as readonly string[]).includes(value);
}

export function profileToAdminSample(
  profile: AdminProfile,
  campaignsCount: number
): AdminUserSample {
  const isSuperAdmin = profile.isSuperAdmin || canAccessSuperAdminDashboard(profile.email);
  const roles = profile.userRoles
    .filter((role) => role.status === "active")
    .map((role) => role.role)
    .filter(isPortalRoleString);
  const activeRole =
    isSuperAdmin
      ? "super_admin"
      : isPortalRoleString(profile.activeAccountType) && roles.includes(profile.activeAccountType)
        ? profile.activeAccountType
        : roles[0] ?? "parent";
  const status =
    profile.status === "invited" || profile.status === "suspended" || profile.status === "active"
      ? profile.status
      : "active";

  return {
    id: profile.id,
    name: profile.displayName ?? profile.fullName ?? profile.email.split("@")[0] ?? "Unnamed user",
    email: profile.email,
    role: activeRole,
    status,
    lastActive: profile.updatedAt ? formatLastActive(profile.updatedAt) : "---",
    campaignsCount,
  };
}
