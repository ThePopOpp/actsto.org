import { NextResponse } from "next/server";

import { incomeTierFigures } from "@/lib/award-policy/income-tiers-server";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sto-reporting/calculate?fiscalYear=2025
 *
 * Scholarships paid in that year by program and family income tier, from
 * disbursements and the applications' certified income. A starting point for
 * the website figures and the ADOR annual report; staff check them before
 * publishing.
 */
export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const fiscalYear = new URL(request.url).searchParams.get("fiscalYear") ?? "";
  if (!/^\d{4}$/.test(fiscalYear)) return NextResponse.json({ error: "Choose the fiscal year." }, { status: 400 });
  return NextResponse.json({ fiscalYear, figures: await incomeTierFigures(fiscalYear) });
}
