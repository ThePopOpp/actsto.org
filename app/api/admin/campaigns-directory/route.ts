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
  if (!row) {
    return NextResponse.json({ rows: seedAdminCampaignRows(), persisted: false });
  }
  return NextResponse.json({ rows: row.rows, persisted: true });
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
