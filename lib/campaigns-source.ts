import "server-only";

import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import {
  getCampaignBySlug,
  MOCK_CAMPAIGNS,
  type Campaign,
} from "@/lib/campaigns";
import { applyLiveCampaignDonationTotals } from "@/lib/campaigns-live";
import type { ActSession } from "@/lib/auth/types";
import { getProfileForEmail, managedCampaignWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DIRECTORY_ID = "default";

function isCampaignArray(value: unknown): value is Campaign[] {
  return Array.isArray(value);
}

async function getPersistedAdminCampaignRows(): Promise<AdminCampaignRow[]> {
  const row = await prisma.adminCampaignDirectory
    .findUnique({ where: { id: DIRECTORY_ID } })
    .catch(() => null);

  if (!row) return seedAdminCampaignRows();
  return isCampaignArray(row.rows) ? (row.rows as AdminCampaignRow[]) : [];
}

function mergeCampaignOverrides(base: Campaign[], overrides: Campaign[]) {
  const bySlug = new Map<string, Campaign>();
  for (const campaign of base) bySlug.set(campaign.slug, campaign);
  for (const campaign of overrides) bySlug.set(campaign.slug, campaign);
  return Array.from(bySlug.values());
}

type PrismaCampaignForDisplay = Awaited<ReturnType<typeof loadPrismaCampaignsForDisplay>>[number];

function daysLeft(endDate: Date | null) {
  if (!endDate) return 60;
  const diff = endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Name, contact details and photo for the person who owns a campaign. */
type OwnerProfile = {
  id: string;
  displayName: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

/**
 * Look up the profile behind each campaign's `createdByUserId`.
 *
 * The campaign manager block used to render a hardcoded "Campaign manager" with
 * no name and no photo, because `parent` was never stored anywhere and the
 * session-scoped loaders only patched it for the signed-in owner — which the
 * public page never is. Deriving it from the owner's profile means the photo
 * they already uploaded shows everywhere, and stays right when they change it.
 */
async function ownerProfilesFor(
  campaigns: PrismaCampaignForDisplay[],
): Promise<Map<string, OwnerProfile>> {
  const ids = [...new Set(campaigns.map((c) => c.createdByUserId).filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();

  const profiles = await prisma.profile
    .findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true, fullName: true, email: true, phone: true, avatarUrl: true },
    })
    .catch(() => []);

  return new Map(profiles.map((p) => [p.id, p]));
}

function prismaCampaignToSiteCampaign(
  campaign: PrismaCampaignForDisplay,
  owner?: OwnerProfile | null,
): Campaign {
  const firstStudent = campaign.campaignStudents[0]?.student;
  const goal = Number(campaign.goalAmount ?? 0);
  const raised = Number(campaign.raisedAmount ?? 0);
  const title = campaign.title || "Untitled campaign";
  const schoolName = campaign.school?.name ?? firstStudent?.school?.name ?? "School";
  const endDate = campaign.endsAt?.toISOString().slice(0, 10) ?? "2026-12-31";

  return {
    slug: campaign.slug,
    title,
    tagline: campaign.tagline ?? "Help this student continue growing in faith and education.",
    excerpt:
      campaign.shortExcerpt ??
      campaign.story?.slice(0, 220) ??
      "This campaign is being prepared by the family. More details are coming soon.",
    description:
      campaign.story ??
      "This campaign draft is being prepared by the family. Please check back soon for more details.",
    goal: goal > 0 ? goal : 1000,
    raised,
    donorCount: campaign.donorCount,
    daysLeft: daysLeft(campaign.endsAt),
    endDate,
    image:
      campaign.featuredImageUrl ??
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
    gallery: campaign.campaignMedia
      .filter((media) => media.mediaType === "gallery_image" && media.fileUrl)
      .map((media) => media.fileUrl as string),
    // Every linked student, not just the first. A family can put several
    // children on one campaign; mapping only `[0]` made every sibling after the
    // first invisible on the public page, in the dashboard, and in the editor —
    // and an editor save would then drop them from the campaign entirely.
    students: campaign.campaignStudents.map((link) => ({
      id: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName ?? "",
      nickname: link.student.nickname ?? undefined,
      gradeDisplay: link.student.grade ?? "-",
      school: link.student.school?.name ?? schoolName,
      photo: link.student.profilePhotoUrl ?? undefined,
      individualGoal: Number(link.individualGoal ?? 0) || goal,
      individualRaised: Number(link.amountAllocated ?? 0),
    })),
    school: {
      name: schoolName,
      address: [campaign.school?.addressLine1, campaign.school?.city, campaign.school?.state].filter(Boolean).join(", "),
      website: campaign.school?.website ?? "",
      logo: campaign.school?.logoUrl ?? undefined,
    },
    parent: {
      id: owner?.id,
      name: owner?.displayName ?? owner?.fullName ?? "Campaign manager",
      email: owner?.email ?? "",
      phone: owner?.phone ?? "",
      photo: owner?.avatarUrl ?? undefined,
    },
    breadcrumbCategory: "Families",
    tags: campaign.status === "draft" ? ["Draft"] : ["Family campaign", "Tax credit"],
    updatesCount: campaign.campaignUpdates.length,
    status: campaign.status,
    completionPercent: campaign.completionPercent,
    missingFields: Array.isArray(campaign.missingFields)
      ? campaign.missingFields.filter((field): field is string => typeof field === "string")
      : [],
  };
}

async function loadPrismaCampaignsForDisplay(where: Prisma.CampaignWhereInput) {
  return prisma.campaign.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      school: true,
      campaignMedia: { orderBy: { sortOrder: "asc" } },
      campaignUpdates: { where: { status: "published" }, select: { id: true } },
      campaignStudents: {
        orderBy: { sortOrder: "asc" },
        include: { student: { include: { school: true } } },
      },
    },
  });
}

/**
 * Transitional campaign source.
 *
 * Super Admin edits are currently persisted in `admin_campaign_directory`.
 * This loader makes those edits the site-wide override source while we migrate
 * the editor to normalized campaign tables.
 */
export async function getSiteCampaigns(): Promise<Campaign[]> {
  const [adminRows, prismaCampaigns] = await Promise.all([
    getPersistedAdminCampaignRows(),
    loadPrismaCampaignsForDisplay({ status: "active", isPublic: true }).catch(() => []),
  ]);
  const owners = await ownerProfilesFor(prismaCampaigns);
  return applyLiveCampaignDonationTotals(
    mergeCampaignOverrides(MOCK_CAMPAIGNS, [
      ...adminRows,
      ...prismaCampaigns.map((c) =>
        prismaCampaignToSiteCampaign(c, c.createdByUserId ? owners.get(c.createdByUserId) : null),
      ),
    ]),
  );
}

export async function getSiteCampaignBySlug(slug: string): Promise<Campaign | undefined> {
  const [adminRows, prismaCampaigns] = await Promise.all([
    getPersistedAdminCampaignRows(),
    loadPrismaCampaignsForDisplay({ slug, status: "active", isPublic: true }).catch(() => []),
  ]);
  const adminCampaign = adminRows.find((campaign) => campaign.slug === slug);
  const owners = await ownerProfilesFor(prismaCampaigns);
  const first = prismaCampaigns[0];
  const campaign = first
    ? prismaCampaignToSiteCampaign(first, first.createdByUserId ? owners.get(first.createdByUserId) : null)
    : adminCampaign ?? getCampaignBySlug(slug);
  const [withLiveTotals] = campaign ? await applyLiveCampaignDonationTotals([campaign]) : [];
  return withLiveTotals;
}

export async function getDashboardCampaignsForSession(session: ActSession): Promise<Campaign[]> {
  const profile = await getProfileForEmail(session.email);
  if (!profile) return [];

  const where =
    session.role === "super_admin" || profile.isSuperAdmin
      ? {}
      : managedCampaignWhere(profile.id);

  const prismaCampaigns = await loadPrismaCampaignsForDisplay(where).catch(() => []);
  const converted = prismaCampaigns.map((campaign) => ({
    ...prismaCampaignToSiteCampaign(campaign),
    parent: {
      id: profile.id,
      name: profile.displayName ?? profile.fullName ?? session.name,
      email: profile.email,
      phone: profile.phone ?? "",
      photo: profile.avatarUrl ?? undefined,
    },
  }));

  return applyLiveCampaignDonationTotals(converted);
}

export async function getEditableCampaignBySlugForSession(slug: string, session: ActSession): Promise<Campaign | undefined> {
  const profile = await prisma.profile.findFirst({
    where: { email: session.email.toLowerCase() },
    select: { id: true, email: true, displayName: true, fullName: true, phone: true, avatarUrl: true, isSuperAdmin: true },
  });
  if (!profile) return undefined;

  const where =
    profile.isSuperAdmin || session.role === "super_admin"
      ? { slug }
      : { slug, createdByUserId: profile.id };
  const [campaign] = await loadPrismaCampaignsForDisplay(where).catch(() => []);
  if (!campaign) return undefined;

  return {
    ...prismaCampaignToSiteCampaign(campaign),
    parent: {
      id: profile.id,
      name: profile.displayName ?? profile.fullName ?? session.name,
      email: profile.email,
      phone: profile.phone ?? "",
      photo: profile.avatarUrl ?? undefined,
    },
  };
}
