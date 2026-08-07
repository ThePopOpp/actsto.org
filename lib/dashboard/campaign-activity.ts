import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Daily unique visitors to a campaign page.
 *
 * Deliberately privacy-light: no cookie, no raw IP stored, nothing that
 * identifies a person. A salted digest of IP + user agent + today's date is
 * recorded once per visitor per day, and the salt rotation means yesterday's
 * hash can't be matched to today's. Good enough to tell a family "31 people
 * looked at your page this week", which is the whole point.
 */

/** Anything stable and secret works; CRON_SECRET already exists in every env. */
function salt(): string {
  return process.env.PAGE_VIEW_SALT ?? process.env.CRON_SECRET ?? "actsto-page-views";
}

export function visitorHash(request: Request, day: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";

  return createHash("sha256").update(`${salt()}|${day}|${ip}|${agent}`).digest("hex").slice(0, 40);
}

/** Today in Arizona, which is where the families and the reporting live. */
export function activityDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(now);
}

/**
 * Record a visit. Idempotent per visitor per day via the unique index, so a
 * refresh doesn't inflate the number.
 */
export async function recordCampaignView(campaignId: string, hash: string, day: string) {
  await prisma.campaignPageView
    .create({ data: { campaignId, visitorHash: hash, viewedOn: new Date(`${day}T00:00:00`) } })
    .catch(() => {
      // Unique violation = already counted today. Nothing to do, and a failed
      // analytics write must never break the page it is measuring.
    });
}

export type CampaignActivity = {
  today: number;
  last7: number;
  last30: number;
  /** Oldest first, for a sparkline. */
  daily: { day: string; views: number }[];
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Visitor counts for one campaign, or for several combined. */
export async function getCampaignActivity(campaignIds: string[]): Promise<CampaignActivity> {
  if (campaignIds.length === 0) return { today: 0, last7: 0, last30: 0, daily: [] };

  const rows = await prisma.campaignPageView
    .findMany({
      where: { campaignId: { in: campaignIds }, viewedOn: { gte: daysAgo(29) } },
      select: { viewedOn: true },
    })
    .catch(() => []);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = row.viewedOn.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const today = activityDay();
  const sevenAgo = daysAgo(6).toISOString().slice(0, 10);

  let last7 = 0;
  for (const [day, views] of byDay) {
    if (day >= sevenAgo) last7 += views;
  }

  const daily = [...byDay.entries()]
    .map(([day, views]) => ({ day, views }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    today: byDay.get(today) ?? 0,
    last7,
    last30: rows.length,
    daily,
  };
}
