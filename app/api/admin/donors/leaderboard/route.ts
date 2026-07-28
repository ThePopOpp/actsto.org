import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { buildDonorWhere, donorLeaderboard } from "@/lib/donors/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const where = buildDonorWhere({
    q: url.searchParams.get("q") ?? undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const donors = await donorLeaderboard(where);
  return NextResponse.json({ donors });
}
