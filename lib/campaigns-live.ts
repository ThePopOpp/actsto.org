import "server-only";

import { prisma } from "@/lib/prisma";
import type { Campaign } from "@/lib/campaigns";

type LiveCampaignTotal = {
  raised: number;
  donorCount: number;
};

/**
 * What each campaign has actually been paid, straight from the donations table.
 *
 * `campaigns.raised_amount` is a counter the payment finalizer increments, so it
 * can only ever be as correct as every write that touched it. Deriving the
 * public number from the paid donations themselves means the figure on the page
 * is the figure in the ledger.
 *
 * Donations are matched by `campaign_id`, falling back to the campaign slug in
 * `metadata` for rows created before checkout recorded the relation.
 *
 * Donations taken in the PayPal sandbox are excluded. Test captures are real
 * rows with real capture ids and no way to tell them from live money after the
 * fact, so checkout stamps the environment on each donation and only live
 * payments reach a public total.
 *
 * A donation with no stamp predates that and is treated as sandbox. Erring that
 * way understates a campaign rather than crediting it with money it never
 * received, which is the safer mistake to make on a public fundraising page.
 */
export async function getLiveCampaignDonationTotalsBySlug(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  if (uniqueSlugs.length === 0) return new Map<string, LiveCampaignTotal>();

  const rows = await prisma
    .$queryRawUnsafe<Array<{ slug: string | null; raised: string | null; donor_count: number | bigint }>>(
      `
        select
          coalesce(c.slug, d.metadata->>'campaignSlug') as slug,
          coalesce(sum(d.amount), 0)::text as raised,
          -- One person giving twice is one donor. Anonymous gifts with no
          -- account and no email fall back to the donation itself.
          count(distinct coalesce(d.user_id::text, dd.donor_email, d.id::text))::int as donor_count
        from public.donations d
        left join public.campaigns c on c.id = d.campaign_id
        left join public.donation_details dd on dd.donation_id = d.id
        where d.status = 'paid'
          and coalesce(d.metadata->>'paypalEnvironment', 'sandbox') <> 'sandbox'
          and coalesce(c.slug, d.metadata->>'campaignSlug') = any($1::text[])
        group by 1
      `,
      uniqueSlugs,
    )
    .catch(() => []);

  return new Map(
    rows
      .filter((row): row is { slug: string; raised: string | null; donor_count: number | bigint } =>
        Boolean(row.slug),
      )
      .map((row) => [
        row.slug,
        {
          raised: Number(row.raised ?? 0),
          donorCount: Number(row.donor_count ?? 0),
        },
      ]),
  );
}

/**
 * Set every campaign's raised total and donor count to what has really been paid.
 *
 * These values are replaced, never added to. Adding meant any figure already on
 * the record — including the seeded sample numbers that used to reach the public
 * site — was quietly included in the total shown to donors. A campaign with no
 * paid donations reads zero, which is the honest answer.
 */
export async function applyLiveCampaignDonationTotals(campaigns: Campaign[]) {
  const totals = await getLiveCampaignDonationTotalsBySlug(campaigns.map((campaign) => campaign.slug));

  return campaigns.map((campaign) => {
    const live = totals.get(campaign.slug);
    return {
      ...campaign,
      raised: live?.raised ?? 0,
      donorCount: live?.donorCount ?? 0,
    };
  });
}
