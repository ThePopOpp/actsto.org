import "server-only";

import type { Prisma } from "@prisma/client";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import type { ActSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export async function getProfileForEmail(email: string) {
  return prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      displayName: true,
      fullName: true,
      phone: true,
      // The campaign manager block renders this photo.
      avatarUrl: true,
      isSuperAdmin: true,
    },
  });
}

export function managedCampaignWhere(userId: string): Prisma.CampaignWhereInput {
  return {
    OR: [
      { createdByUserId: userId },
      { campaignStudents: { some: { student: { parentUserId: userId } } } },
      { campaignStudents: { some: { student: { guardians: { some: { guardianUserId: userId } } } } } },
      // A student 16+ with their own login reaches the campaigns they are on.
      { campaignStudents: { some: { student: { studentUserId: userId } } } },
    ],
  };
}

/**
 * Campaigns this account may list and edit in its dashboard: the ones it
 * manages, plus school-level campaigns at a school it administers. A
 * school-wide campaign has no family on it, so without the second clause the
 * school's own administrators had no Edit button.
 *
 * Kept apart from managedCampaignWhere, which also scopes donations: a school
 * administrator edits the campaign but does not see who gave to it.
 */
export function editableCampaignWhere(userId: string): Prisma.CampaignWhereInput {
  return {
    OR: [
      managedCampaignWhere(userId),
      { isSchoolLevel: true, school: { schoolAdmins: { some: { userId, role: { not: "viewer" } } } } },
    ],
  };
}

/**
 * Super Admin by any of the three routes: the session role, the profile flag,
 * or the ADMIN_EMAILS allowlist. The campaign save route already accepted the
 * allowlist; the campaign list and editor did not, so a campaign a Super Admin
 * created from another admin login never appeared in their Campaigns list.
 */
export function isSuperAdminViewer(session: ActSession, profile: { isSuperAdmin: boolean } | null): boolean {
  return session.role === "super_admin" || Boolean(profile?.isSuperAdmin) || canAccessSuperAdminDashboard(session.email);
}

export function managedDonationWhere(userId: string): Prisma.DonationWhereInput {
  const campaign = managedCampaignWhere(userId);

  return {
    OR: [
      { campaign },
      { donationAllocations: { some: { campaign } } },
      { donorRecommendation: { recommendedCampaign: campaign } },
    ],
  };
}

export async function getManagedCampaignRefs(userId: string) {
  return prisma.campaign.findMany({
    where: managedCampaignWhere(userId),
    select: { id: true, slug: true, title: true },
    orderBy: { updatedAt: "desc" },
  });
}
