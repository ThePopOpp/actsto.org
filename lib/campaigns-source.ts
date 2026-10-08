import "server-only";

import type { Campaign } from "@/lib/campaigns";
import { applyLiveCampaignDonationTotals } from "@/lib/campaigns-live";
import type { ActSession } from "@/lib/auth/types";
import { getProfileForEmail, managedCampaignWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { defaultCampaignEndDate } from "@/lib/campaign-dates";

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

/**
 * "Street, City, ST ZIP". A street line that already ends in a city, state and
 * ZIP is used as entered rather than having the city fields appended again —
 * that is how Valley Christian read "Chandler, AZ 85226, Tempe, AZ".
 */
function formatSchoolAddress(
  school: { addressLine1: string | null; city: string | null; state: string | null; zip: string | null } | null,
): string {
  if (!school) return "";
  const line1 = (school.addressLine1 ?? "").trim();
  if (/\b[A-Z]{2}\s*\d{5}(-\d{4})?\s*$/.test(line1)) return line1;
  const cityLine = [school.city, [school.state, school.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [line1, cityLine].filter(Boolean).join(", ");
}

function prismaCampaignToSiteCampaign(
  campaign: PrismaCampaignForDisplay,
  owner?: OwnerProfile | null,
): Campaign {
  const firstStudent = campaign.campaignStudents[0]?.student;
  const goal = Number(campaign.goalAmount ?? 0);
  const title = campaign.title || "Untitled campaign";
  const schoolName = campaign.school?.name ?? firstStudent?.school?.name ?? "School";
  const startDate = campaign.startsAt?.toISOString().slice(0, 10);
  const endDate = campaign.endsAt?.toISOString().slice(0, 10) ?? defaultCampaignEndDate(startDate ?? campaign.createdAt);
  const schoolLevel = campaign.isSchoolLevel;
  // Draft placeholder copy only while the campaign is a draft. A live
  // campaign without a summary uses its own story, or a plain line about who
  // it helps, never "being prepared by the family".
  const isDraft = campaign.status === "draft" || campaign.status === "pending_review";
  const whoItHelps = schoolLevel ? `Help students at ${schoolName}.` : `Help send students to ${schoolName}.`;

  return {
    slug: campaign.slug,
    title,
    tagline:
      campaign.tagline ??
      (schoolLevel
        ? `Help students at ${schoolName}.`
        : "Help this student continue growing in faith and education."),
    excerpt:
      campaign.shortExcerpt ??
      campaign.story?.slice(0, 220) ??
      (isDraft ? "This campaign is being prepared by the family. More details are coming soon." : whoItHelps),
    description:
      campaign.story ??
      (isDraft
        ? "This campaign draft is being prepared by the family. Please check back soon for more details."
        : whoItHelps),
    goal: goal > 0 ? goal : 1000,
    // Funded = awarded, kept current by recomputeCampaignAwarded whenever an
    // award changes. Donations received are added by applyLiveCampaignDonationTotals.
    raised: Number(campaign.awardedAmount ?? 0),
    donorCount: campaign.awardedDonorCount,
    isSchoolLevel: schoolLevel,
    isFeatured: campaign.isFeatured,
    featuredRank: campaign.featuredRank,
    createdAt: campaign.createdAt.toISOString(),
    daysLeft: daysLeft(campaign.endsAt),
    endDate,
    startDate,
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
      address: formatSchoolAddress(campaign.school),
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
    breadcrumbCategory: schoolLevel ? "Schools" : "Families",
    tags: campaign.status === "draft" ? ["Draft"] : [schoolLevel ? "School campaign" : "Family campaign", "Tax credit"],
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
 * Campaigns shown on the public site.
 *
 * Only real, approved campaigns from the database. This used to start from a
 * hardcoded sample set and layer the `admin_campaign_directory` rows on top,
 * which put sample families — and their invented raised totals and donor
 * counts — on the live homepage, the campaign listing and the donation target
 * picker. Both sources have been removed.
 */
export async function getSiteCampaigns(): Promise<Campaign[]> {
  const prismaCampaigns = await loadPrismaCampaignsForDisplay({
    status: "active",
    isPublic: true,
  }).catch(() => []);
  const owners = await ownerProfilesFor(prismaCampaigns);

  return applyLiveCampaignDonationTotals(
    prismaCampaigns.map((c) =>
      prismaCampaignToSiteCampaign(c, c.createdByUserId ? owners.get(c.createdByUserId) : null),
    ),
  );
}

export async function getSiteCampaignBySlug(slug: string): Promise<Campaign | undefined> {
  const prismaCampaigns = await loadPrismaCampaignsForDisplay({
    slug,
    status: "active",
    isPublic: true,
  }).catch(() => []);
  const first = prismaCampaigns[0];
  if (!first) return undefined;

  const owners = await ownerProfilesFor(prismaCampaigns);
  const campaign = prismaCampaignToSiteCampaign(
    first,
    first.createdByUserId ? owners.get(first.createdByUserId) : null,
  );
  const [withLiveTotals] = await applyLiveCampaignDonationTotals([campaign]);
  return withLiveTotals;
}

/** Publicly visible campaigns for a set of slugs, in the order the slugs are given. */
export async function getSiteCampaignsBySlugs(slugs: string[]): Promise<Campaign[]> {
  const wanted = Array.from(new Set(slugs.filter(Boolean)));
  if (wanted.length === 0) return [];

  const prismaCampaigns = await loadPrismaCampaignsForDisplay({
    slug: { in: wanted },
    status: "active",
    isPublic: true,
  }).catch(() => []);
  const owners = await ownerProfilesFor(prismaCampaigns);
  const withTotals = await applyLiveCampaignDonationTotals(
    prismaCampaigns.map((c) =>
      prismaCampaignToSiteCampaign(c, c.createdByUserId ? owners.get(c.createdByUserId) : null),
    ),
  );

  const bySlug = new Map(withTotals.map((campaign) => [campaign.slug, campaign]));
  return wanted.map((slug) => bySlug.get(slug)).filter((c): c is Campaign => Boolean(c));
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
