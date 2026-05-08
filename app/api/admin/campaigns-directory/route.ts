import { NextResponse } from "next/server";

import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

const DIRECTORY_ID = "default";

function isAdminCampaignRowArray(x: unknown): x is AdminCampaignRow[] {
  return Array.isArray(x);
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const row = await prisma.adminCampaignDirectory.findUnique({ where: { id: DIRECTORY_ID } });
  const rows = row ? (row.rows as AdminCampaignRow[]) : seedAdminCampaignRows();
  const liveDonationTotals = await getDonationTotalsBySlug(rows.map((campaign) => campaign.slug));

  if (!row) {
    return NextResponse.json({
      rows,
      liveDonationTotals: Object.fromEntries(liveDonationTotals),
      persisted: false,
    });
  }
  return NextResponse.json({
    rows,
    liveDonationTotals: Object.fromEntries(liveDonationTotals),
    persisted: true,
  });
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { rows?: unknown } | null;
  const rows = body?.rows;
  if (!isAdminCampaignRowArray(rows)) {
    return NextResponse.json({ error: "Body must include a rows array." }, { status: 400 });
  }

  await prisma.adminCampaignDirectory.upsert({
    where: { id: DIRECTORY_ID },
    create: { id: DIRECTORY_ID, rows },
    update: { rows },
  });

  return NextResponse.json({ ok: true });
}

async function getDonationTotalsBySlug(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, { raised: number; donorCount: number }>();

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
      slugs,
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
