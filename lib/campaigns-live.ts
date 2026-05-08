import "server-only";

import { prisma } from "@/lib/prisma";
import type { Campaign } from "@/lib/campaigns";

type LiveCampaignTotal = {
  raised: number;
  donorCount: number;
};

export async function getLiveCampaignDonationTotalsBySlug(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  if (uniqueSlugs.length === 0) return new Map<string, LiveCampaignTotal>();

  const rows = await prisma
    .$queryRawUnsafe<Array<{ slug: string; raised: string | null; donor_count: number | bigint }>>(
      `
        select
          metadata->>'campaignSlug' as slug,
          coalesce(sum(amount), 0)::text as raised,
          count(*)::int as donor_count
        from public.donations
        where status = 'paid'
          and metadata->>'campaignSlug' = any($1::text[])
        group by metadata->>'campaignSlug'
      `,
      uniqueSlugs,
    )
    .catch(() => []);

  return new Map(
    rows
      .filter((row) => row.slug)
      .map((row) => [
        row.slug,
        {
          raised: Number(row.raised ?? 0),
          donorCount: Number(row.donor_count ?? 0),
        },
      ]),
  );
}

export async function applyLiveCampaignDonationTotals(campaigns: Campaign[]) {
  const totals = await getLiveCampaignDonationTotalsBySlug(campaigns.map((campaign) => campaign.slug));

  return campaigns.map((campaign) => {
    const live = totals.get(campaign.slug);
    if (!live) return campaign;
    return {
      ...campaign,
      raised: campaign.raised + live.raised,
      donorCount: campaign.donorCount + live.donorCount,
    };
  });
}

