import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import {
  allocationCandidates,
  campaignFundRemaining,
  fundBalances,
} from "@/lib/allocation/server";
import { EXCLUDE_ARCHIVED_TESTS } from "@/lib/donors/server";
import { isFundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/allocation?source=&year=&schoolId=&campaignId=&includeIneligible=1
 *
 * Fund balances, the school years and schools to filter by, campaigns with
 * money in the chosen fund, and the students eligible for that fund.
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source") ?? "individual_original";
    const schoolId = url.searchParams.get("schoolId") || null;
    const campaignId = url.searchParams.get("campaignId") || null;
    const includeIneligible = url.searchParams.get("includeIneligible") === "1";

    const [balances, years, schools, campaignRows] = await Promise.all([
      fundBalances(),
      prisma.studentYearEligibility
        .findMany({ where: { revokedAt: null }, distinct: ["schoolYear"], select: { schoolYear: true } })
        .then((rows) => rows.map((r) => r.schoolYear).sort().reverse()),
      prisma.school.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.campaign.findMany({
        where: { donations: { some: { status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] } } },
        select: { id: true, title: true, isSchoolLevel: true, schoolId: true },
        orderBy: { title: "asc" },
      }),
    ]);
    const year = url.searchParams.get("year") || years[0] || "";

    const campaigns = isFundingSource(source)
      ? await Promise.all(
          campaignRows.map(async (c) => ({ ...c, remaining: await campaignFundRemaining(c.id, source) })),
        )
      : [];

    // Drawing from a student campaign lists its students; from a school-level
    // campaign, students at its school.
    const chosenCampaign = campaignRows.find((c) => c.id === campaignId) ?? null;
    const candidates =
      isFundingSource(source) && year
        ? await allocationCandidates(source, year, {
            includeIneligible,
            schoolId: chosenCampaign?.isSchoolLevel ? chosenCampaign.schoolId : schoolId,
            campaignId: chosenCampaign && !chosenCampaign.isSchoolLevel ? chosenCampaign.id : null,
          })
        : [];

    return NextResponse.json({ balances, years, year, schools, campaigns, candidates });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
