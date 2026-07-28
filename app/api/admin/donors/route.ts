import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { buildDonorWhere, donorStats, fetchDonorRows } from "@/lib/donors/server";

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
  };
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));

  const where = buildDonorWhere(filters);
  const [rows, total, stats, campaignsRaw] = await Promise.all([
    fetchDonorRows(where, { skip: (page - 1) * pageSize, take: pageSize }),
    prisma.donation.count({ where }),
    donorStats(where),
    prisma.campaign.findMany({ where: { donations: { some: {} } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 200 }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    stats,
    campaigns: campaignsRaw.map((c) => ({ id: c.id, title: c.title })),
  });
}
