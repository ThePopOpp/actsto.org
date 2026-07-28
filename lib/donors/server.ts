import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DonorRow = {
  id: string;
  createdAt: string;
  donorName: string;
  donorEmail: string | null;
  donorPhone: string | null;
  anonymous: boolean;
  message: string | null;
  campaignId: string | null;
  campaignTitle: string;
  campaignSlug: string | null;
  status: string;
  donationType: string;
  amount: number;
  orderId: string | null;
  receiptNumber: string | null;
  taxYear: number | null;
  userId: string | null;
};

export type DonorFilters = { q?: string; status?: string; campaignId?: string; from?: string; to?: string; missingReceipt?: boolean };

export function buildDonorWhere(p: DonorFilters): Prisma.DonationWhereInput {
  const and: Prisma.DonationWhereInput[] = [];
  if (p.missingReceipt) and.push({ status: "paid", taxReceipts: { none: {} } });
  else if (p.status && p.status !== "all") and.push({ status: p.status });
  if (p.campaignId) and.push({ campaignId: p.campaignId });
  if (p.from) and.push({ createdAt: { gte: new Date(p.from) } });
  if (p.to) {
    const d = new Date(p.to);
    d.setHours(23, 59, 59, 999);
    and.push({ createdAt: { lte: d } });
  }
  const q = p.q?.trim();
  if (q) {
    and.push({
      OR: [
        { donationDetail: { donorFirstName: { contains: q, mode: "insensitive" } } },
        { donationDetail: { donorLastName: { contains: q, mode: "insensitive" } } },
        { donationDetail: { donorEmail: { contains: q, mode: "insensitive" } } },
        { donationDetail: { publicDisplayName: { contains: q, mode: "insensitive" } } },
        { paymentProviderOrderId: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

const DONATION_INCLUDE = {
  campaign: { select: { title: true, slug: true } },
  donationDetail: { select: { donorFirstName: true, donorLastName: true, publicDisplayName: true, donorEmail: true, donorPhone: true } },
  taxReceipts: { orderBy: { createdAt: "desc" as const }, take: 1, select: { receiptNumber: true } },
} satisfies Prisma.DonationInclude;

export type DonorSort = { field: "createdAt" | "amount"; dir: "asc" | "desc" };

export async function fetchDonorRows(where: Prisma.DonationWhereInput, opts: { skip?: number; take?: number; sort?: DonorSort } = {}): Promise<DonorRow[]> {
  const orderBy = opts.sort ? { [opts.sort.field]: opts.sort.dir } : { createdAt: "desc" as const };
  const donations = await prisma.donation.findMany({ where, orderBy, skip: opts.skip, take: opts.take, include: DONATION_INCLUDE });

  const userIds = Array.from(new Set(donations.map((d) => d.userId).filter(Boolean))) as string[];
  const profiles = userIds.length
    ? await prisma.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, fullName: true, email: true, phone: true } })
    : [];
  const byUser = new Map(profiles.map((p) => [p.id, p]));

  return donations.map((d) => {
    const detail = d.donationDetail;
    const prof = d.userId ? byUser.get(d.userId) : undefined;
    const detailName = [detail?.donorFirstName, detail?.donorLastName].filter(Boolean).join(" ").trim();
    const donorName = d.anonymous
      ? "Anonymous"
      : detail?.publicDisplayName?.trim() || detailName || prof?.displayName || prof?.fullName || detail?.donorEmail || prof?.email || "Supporter";
    return {
      id: d.id,
      createdAt: d.createdAt.toISOString(),
      donorName: donorName || "Supporter",
      donorEmail: detail?.donorEmail ?? prof?.email ?? null,
      donorPhone: detail?.donorPhone ?? prof?.phone ?? null,
      anonymous: d.anonymous,
      message: d.donorMessage,
      campaignId: d.campaignId,
      campaignTitle: d.campaign?.title ?? "General fund",
      campaignSlug: d.campaign?.slug ?? null,
      status: d.status,
      donationType: d.donationType,
      amount: Number(d.amount ?? 0),
      orderId: d.paymentProviderOrderId,
      receiptNumber: d.taxReceipts[0]?.receiptNumber ?? null,
      taxYear: d.taxYear,
      userId: d.userId,
    };
  });
}

export async function donorStats(where: Prisma.DonationWhereInput) {
  const [total, paid, pending] = await Promise.all([
    prisma.donation.count({ where }),
    prisma.donation.aggregate({ where: { AND: [where, { status: "paid" }] }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.donation.count({ where: { AND: [where, { status: "pending" }] } }),
  ]);
  const paidSum = Number(paid._sum.amount ?? 0);
  const paidCount = paid._count._all;
  return { total, paidSum, paidCount, pending, avgGift: paidCount ? paidSum / paidCount : 0 };
}

/** Daily paid totals for the last 30 days (sparkline). */
export async function donorTrend(where: Prisma.DonationWhereInput): Promise<{ date: string; amount: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const donations = await prisma.donation.findMany({
    where: { AND: [where, { status: "paid", createdAt: { gte: since } }] },
    select: { createdAt: true, amount: true },
  });
  const byDay = new Map<string, number>();
  for (const d of donations) {
    const key = d.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(d.amount));
  }
  const out: { date: string; amount: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, amount: byDay.get(key) ?? 0 });
  }
  return out;
}

export type LeaderRow = {
  key: string;
  donorName: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  total: number;
  count: number;
  firstAt: string;
  lastAt: string;
};

/** Aggregate paid giving per donor (grouped by user id, else email). */
export async function donorLeaderboard(where: Prisma.DonationWhereInput): Promise<LeaderRow[]> {
  const donations = await prisma.donation.findMany({
    where: { AND: [where, { status: "paid" }] },
    orderBy: { createdAt: "asc" },
    take: 5000,
    include: { donationDetail: { select: { donorFirstName: true, donorLastName: true, publicDisplayName: true, donorEmail: true, donorPhone: true } } },
  });
  const userIds = Array.from(new Set(donations.map((d) => d.userId).filter(Boolean))) as string[];
  const profiles = userIds.length
    ? await prisma.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, fullName: true, email: true, phone: true } })
    : [];
  const byUser = new Map(profiles.map((p) => [p.id, p]));

  const map = new Map<string, LeaderRow>();
  for (const d of donations) {
    const detail = d.donationDetail;
    const prof = d.userId ? byUser.get(d.userId) : undefined;
    const email = detail?.donorEmail ?? prof?.email ?? null;
    const key = d.userId ?? (email ? `email:${email.toLowerCase()}` : `anon:${d.id}`);
    const detailName = [detail?.donorFirstName, detail?.donorLastName].filter(Boolean).join(" ").trim();
    const donorName = d.anonymous ? "Anonymous" : detail?.publicDisplayName?.trim() || detailName || prof?.displayName || prof?.fullName || email || "Supporter";
    const amount = Number(d.amount ?? 0);
    const iso = d.createdAt.toISOString();
    const existing = map.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
      existing.lastAt = iso;
      existing.email ??= email;
      existing.phone ??= detail?.donorPhone ?? prof?.phone ?? null;
    } else {
      map.set(key, { key, donorName: donorName || "Supporter", email, phone: detail?.donorPhone ?? prof?.phone ?? null, userId: d.userId, total: amount, count: 1, firstAt: iso, lastAt: iso });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
