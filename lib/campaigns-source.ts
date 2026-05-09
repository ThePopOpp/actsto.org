import "server-only";

import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import {
  getCampaignBySlug,
  MOCK_CAMPAIGNS,
  type Campaign,
} from "@/lib/campaigns";
import { applyLiveCampaignDonationTotals } from "@/lib/campaigns-live";
import { prisma } from "@/lib/prisma";

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

/**
 * Transitional campaign source.
 *
 * Super Admin edits are currently persisted in `admin_campaign_directory`.
 * This loader makes those edits the site-wide override source while we migrate
 * the editor to normalized campaign tables.
 */
export async function getSiteCampaigns(): Promise<Campaign[]> {
  const adminRows = await getPersistedAdminCampaignRows();
  return applyLiveCampaignDonationTotals(mergeCampaignOverrides(MOCK_CAMPAIGNS, adminRows));
}

export async function getSiteCampaignBySlug(slug: string): Promise<Campaign | undefined> {
  const adminRows = await getPersistedAdminCampaignRows();
  const adminCampaign = adminRows.find((campaign) => campaign.slug === slug);
  const campaign = adminCampaign ?? getCampaignBySlug(slug);
  const [withLiveTotals] = campaign ? await applyLiveCampaignDonationTotals([campaign]) : [];
  return withLiveTotals;
}
