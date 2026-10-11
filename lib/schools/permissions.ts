import "server-only";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import type { ActSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

/**
 * School-level campaigns (no specific student) may be created by Super Admins
 * and by an approved administrator of that school. Parents can't (spec #9).
 */
export async function canCreateSchoolLevelCampaign(
  session: ActSession,
  profileId: string,
  schoolId: string | null,
): Promise<boolean> {
  if (session.role === "super_admin" || canAccessSuperAdminDashboard(session.email)) return true;
  const profile = await prisma.profile
    .findUnique({ where: { id: profileId }, select: { isSuperAdmin: true } })
    .catch(() => null);
  if (profile?.isSuperAdmin) return true;
  if (!schoolId) return false;
  const admin = await prisma.schoolAdmin
    .findUnique({ where: { schoolId_userId: { schoolId, userId: profileId } }, select: { role: true } })
    .catch(() => null);
  return Boolean(admin && admin.role !== "viewer");
}
