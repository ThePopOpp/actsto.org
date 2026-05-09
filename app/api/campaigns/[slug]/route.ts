import { NextResponse } from "next/server";

import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { getActSession } from "@/lib/auth/session-server";
import type { Campaign } from "@/lib/campaigns";
import { prisma } from "@/lib/prisma";

const DIRECTORY_ID = "default";

function isCampaign(value: unknown): value is Campaign {
  return Boolean(
    value &&
      typeof value === "object" &&
      "slug" in value &&
      "title" in value &&
      "parent" in value,
  );
}

async function loadRows(): Promise<AdminCampaignRow[]> {
  const row = await prisma.adminCampaignDirectory.findUnique({ where: { id: DIRECTORY_ID } });
  if (!row) return seedAdminCampaignRows();
  return Array.isArray(row.rows) ? (row.rows as AdminCampaignRow[]) : [];
}

function canEditCampaign(sessionEmail: string, campaign: Campaign) {
  if (canAccessSuperAdminDashboard(sessionEmail)) return true;
  return campaign.parent.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as { campaign?: unknown } | null;
  if (!isCampaign(body?.campaign)) {
    return NextResponse.json({ error: "Body must include a campaign." }, { status: 400 });
  }

  const rows = await loadRows();
  const previous = rows.find((row) => row.slug === slug);
  const campaign = body.campaign;
  const authCampaign = previous ?? campaign;

  if (!canEditCampaign(session.email, authCampaign)) {
    return NextResponse.json({ error: "You do not have access to edit this campaign." }, { status: 403 });
  }

  const nextRow: AdminCampaignRow = {
    ...campaign,
    moderationStatus: previous?.moderationStatus ?? "pending",
    reviewer: previous?.reviewer ?? "Unassigned",
  };
  const nextRows = rows.filter((row) => row.slug !== slug && row.slug !== campaign.slug);
  nextRows.push(nextRow);

  await prisma.adminCampaignDirectory.upsert({
    where: { id: DIRECTORY_ID },
    create: { id: DIRECTORY_ID, rows: nextRows },
    update: { rows: nextRows },
  });

  return NextResponse.json({ campaign: nextRow });
}
