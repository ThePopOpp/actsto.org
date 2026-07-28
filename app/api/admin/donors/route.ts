import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { buildDonorWhere, donorStats, donorTrend, fetchDonorRows, type DonorSort } from "@/lib/donors/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    missingReceipt: url.searchParams.get("missingReceipt") === "1",
  };
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(1000, Math.max(10, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const sortField = url.searchParams.get("sortField") === "amount" ? "amount" : "createdAt";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const sort: DonorSort = { field: sortField, dir: sortDir };

  const where = buildDonorWhere(filters);
  const [rows, total, stats, trend, campaignsRaw] = await Promise.all([
    fetchDonorRows(where, { skip: (page - 1) * pageSize, take: pageSize, sort }),
    prisma.donation.count({ where }),
    donorStats(where),
    donorTrend(where),
    prisma.campaign.findMany({ where: { donations: { some: {} } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 200 }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    stats,
    trend,
    campaigns: campaignsRaw.map((c) => ({ id: c.id, title: c.title })),
  });
}
