import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { campaignContext, campaignLedger, potsFor } from "@/lib/allocation/campaign-funds";
import { allocationCandidates, fundBalances } from "@/lib/allocation/server";
import { isFundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/allocation?source=&year=&schoolId=&campaignId=&includeIneligible=1
 *
 * Fund balances, the campaign × fund ledger, the campaigns (and general pool)
 * with money in the chosen fund, every student eligible for that fund, and,
 * when a campaign is chosen, its students and what donors recommended for them.
 *
 * Choosing a campaign never narrows the student list: a campaign's money may
 * go to any eligible student. Its own and recommended students are marked.
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source") ?? "individual_original";
    const schoolId = url.searchParams.get("schoolId") || null;
    const campaignKey = url.searchParams.get("campaignId") || null;
    const includeIneligible = url.searchParams.get("includeIneligible") === "1";

    const [balances, ledger, years, schools] = await Promise.all([
      fundBalances(),
      campaignLedger(),
      prisma.studentYearEligibility
        .findMany({ where: { revokedAt: null }, distinct: ["schoolYear"], select: { schoolYear: true } })
        .then((rows) => rows.map((r) => r.schoolYear).sort().reverse()),
      prisma.school.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    const year = url.searchParams.get("year") || years[0] || "";

    if (!isFundingSource(source)) {
      return NextResponse.json({ error: "Choose a fund." }, { status: 400 });
    }

    const pots = ledger.rows
      .filter((r) => r.fundingSource === source)
      .map((r) => ({
        key: r.key,
        title: r.label,
        isSchoolLevel: r.isSchoolLevel,
        schoolId: r.schoolId,
        received: r.received,
        remaining: r.remaining,
      }));
    const context = campaignKey ? await campaignContext(campaignKey, source, ledger) : null;

    // A school-level campaign's own students are the eligible students at its school.
    const candidates = year
      ? await allocationCandidates(source, year, { includeIneligible, schoolId })
      : [];

    return NextResponse.json({
      balances,
      years,
      year,
      schools,
      campaigns: pots,
      context,
      candidates,
      ledger: ledger.rows,
      unattached: ledger.unattached,
      potCount: potsFor(ledger, source).length,
    });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
