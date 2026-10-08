import "server-only";

import type { Campaign } from "@/lib/campaigns";
import { prisma } from "@/lib/prisma";

/**
 * Which campaigns the home page shows, in what order, and why.
 *
 * Before: all three sections were handed the same list (every active public
 * campaign, most recently edited first). "Gaining Momentum" reversed it and
 * "Featured" ignored the Featured flag, which is why Valley Christian — the
 * most-funded campaign — sat 8th of 10, behind three campaigns with $0.
 *
 * Now, written down:
 *   - New student campaigns: newest first by creation date.
 *   - Featured: campaigns starred Featured in admin, by Featured rank (1 first,
 *     unranked after), then by gifts received. If none are starred, the
 *     campaigns that have received the most.
 *   - Gaining Momentum: featured campaigns pinned first (by rank), then every
 *     other campaign by paid gifts received in the last 7 days (amount, then
 *     number of gifts), then by gifts received overall. It counts gifts
 *     received, not awards, so it reflects donor activity before allocation.
 *
 * Only active, public campaigns reach any section. No campaign ids are coded.
 */

export const MOMENTUM_WINDOW_DAYS = 7;

export type HomeOrderReason = { slug: string; reason: string };

export type HomeOrdering = {
  newest: Campaign[];
  featured: Campaign[];
  momentum: Campaign[];
  /** Why each campaign sits where it does, for the admin preview. */
  reasons: { newest: HomeOrderReason[]; featured: HomeOrderReason[]; momentum: HomeOrderReason[] };
};

type Activity = { amount: number; count: number };

/** Paid, live gifts per campaign slug in the last `days` days. */
async function recentActivity(slugs: string[], days: number): Promise<Map<string, Activity>> {
  if (slugs.length === 0) return new Map();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma
    .$queryRawUnsafe<Array<{ slug: string | null; amount: string | null; gifts: number | bigint }>>(
      `
        select c.slug as slug,
               coalesce(sum(d.amount), 0)::text as amount,
               count(*)::int as gifts
        from public.donations d
        join public.campaigns c on c.id = d.campaign_id
        where d.status = 'paid'
          and d.created_at >= $2
          and coalesce(d.metadata->>'paypalEnvironment', 'sandbox') <> 'sandbox'
          and c.slug = any($1::text[])
        group by c.slug
      `,
      slugs,
      since,
    )
    .catch(() => []);
  const map = new Map<string, Activity>();
  for (const r of rows) {
    if (r.slug) map.set(r.slug, { amount: Number(r.amount ?? 0), count: Number(r.gifts ?? 0) });
  }
  return map;
}

function rankKey(c: Campaign) {
  return c.featuredRank ?? Number.POSITIVE_INFINITY;
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export async function orderHomeCampaigns(campaigns: Campaign[]): Promise<HomeOrdering> {
  const activity = await recentActivity(
    campaigns.map((c) => c.slug),
    MOMENTUM_WINDOW_DAYS,
  );
  const received = (c: Campaign) => c.received ?? 0;

  const newest = [...campaigns].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const starred = campaigns.filter((c) => c.isFeatured);
  const byFeaturedRank = (a: Campaign, b: Campaign) => rankKey(a) - rankKey(b) || received(b) - received(a);
  const featured = starred.length
    ? [...starred].sort(byFeaturedRank)
    : [...campaigns].sort((a, b) => received(b) - received(a)).slice(0, 6);

  const pinned = [...starred].sort(byFeaturedRank);
  const rest = campaigns
    .filter((c) => !c.isFeatured)
    .sort((a, b) => {
      const x = activity.get(a.slug) ?? { amount: 0, count: 0 };
      const y = activity.get(b.slug) ?? { amount: 0, count: 0 };
      return y.amount - x.amount || y.count - x.count || received(b) - received(a);
    });
  const momentum = [...pinned, ...rest];

  const recentText = (c: Campaign) => {
    const a = activity.get(c.slug);
    return a && a.count > 0
      ? `${money(a.amount)} from ${a.count} gift${a.count === 1 ? "" : "s"} in the last ${MOMENTUM_WINDOW_DAYS} days`
      : `no gifts in the last ${MOMENTUM_WINDOW_DAYS} days; ${money(received(c))} received overall`;
  };

  return {
    newest,
    featured,
    momentum,
    reasons: {
      newest: newest.map((c) => ({ slug: c.slug, reason: `Created ${(c.createdAt ?? "").slice(0, 10) || "date unknown"}` })),
      featured: featured.map((c) => ({
        slug: c.slug,
        reason: c.isFeatured
          ? `Featured${c.featuredRank != null ? `, rank ${c.featuredRank}` : ", no rank"}`
          : `Not featured; shown because no campaign is starred (${money(received(c))} received)`,
      })),
      momentum: momentum.map((c) => ({
        slug: c.slug,
        reason: c.isFeatured
          ? `Pinned: featured${c.featuredRank != null ? `, rank ${c.featuredRank}` : ""}`
          : recentText(c),
      })),
    },
  };
}
