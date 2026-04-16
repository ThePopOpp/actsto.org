import type { AccountStatus, User } from "@prisma/client";

import type { AdminUserSample } from "@/lib/admin/mock-users";
import type { UserRole } from "@/lib/auth/types";

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
    role: u.role as UserRole,
    status: statusMap[u.accountStatus] ?? "active",
    lastActive: u.lastLoginAt ? formatLastActive(u.lastLoginAt) : "—",
    campaignsCount,
  };
}

export function portalRolesPayload(role: UserRole): unknown {
  if (role === "super_admin") return null;
  return [role];
}
