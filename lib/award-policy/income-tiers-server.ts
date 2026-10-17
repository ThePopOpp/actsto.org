import "server-only";

import { readIncomeRows } from "@/lib/eligibility/income-table";
import { isFundingSource, type FundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";
import type { StoProgramKey } from "@/lib/sto-reporting";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Which reported program each fund's payments belong to. */
const PROGRAM_OF: Partial<Record<FundingSource, StoProgramKey>> = {
  individual_original: "original_individual",
  unrestricted: "original_individual",
  individual_overflow: "switcher_individual",
  corporate_low_income: "low_income_corporate",
  corporate_disabled_displaced: "disabled_displaced_corporate",
};

export type IncomeTierFigures = Record<
  StoProgramKey,
  { totalPaid: number; upTo185: number; from185To342: number; above342: number; incomeUnknown: number }
>;

/**
 * Scholarships PAID in a fiscal (calendar) year, by program and family income
 * tier, for the website reporting requirement and the ADOR annual report.
 *
 * Built from disbursements (net of returns) and the household income the
 * family certified on that school year's application. The tiers use that
 * year's low-income table: 185% of poverty is its reduced-price lunch figure,
 * and 342.25% of poverty is 1.85 times that (the low-income limit).
 */
export async function incomeTierFigures(fiscalYear: string): Promise<IncomeTierFigures> {
  const year = Number(fiscalYear);
  const from = new Date(`${year}-01-01T00:00:00-07:00`);
  const to = new Date(`${year + 1}-01-01T00:00:00-07:00`);
  const payments = await prisma.scholarshipPayment.findMany({
    where: { status: "sent", paidAt: { gte: from, lt: to } },
    select: {
      amount: true,
      returnedAmount: true,
      award: { select: { fundingSource: true, studentId: true, schoolYear: true, applicationId: true } },
    },
  });

  const figures = Object.fromEntries(
    (["original_individual", "switcher_individual", "low_income_corporate", "disabled_displaced_corporate"] as StoProgramKey[]).map((k) => [
      k,
      { totalPaid: 0, upTo185: 0, from185To342: 0, above342: 0, incomeUnknown: 0 },
    ]),
  ) as IncomeTierFigures;

  const tableCache = new Map<string, Awaited<ReturnType<typeof prisma.lowIncomeTable.findUnique>>>();
  const incomeCache = new Map<string, { income: number; size: number } | null>();

  for (const p of payments) {
    const amount = round2(Number(p.amount) - Number(p.returnedAmount));
    if (amount <= 0) continue;
    const source = isFundingSource(p.award.fundingSource) ? p.award.fundingSource : "unrestricted";
    const program = PROGRAM_OF[source];
    if (!program) continue;
    const row = figures[program];
    row.totalPaid = round2(row.totalPaid + amount);

    const schoolYear = p.award.schoolYear ?? "";
    const key = `${p.award.studentId}|${schoolYear}`;
    if (!incomeCache.has(key)) {
      const application = await prisma.scholarshipApplication.findFirst({
        where: p.award.applicationId
          ? { id: p.award.applicationId }
          : { studentId: p.award.studentId, schoolYear, status: { notIn: ["draft", "withdrawn"] } },
        orderBy: { createdAt: "desc" },
        select: { incomeSnapshot: true },
      });
      const snap = (application?.incomeSnapshot ?? null) as { annual_total?: number; member_count?: number } | null;
      incomeCache.set(
        key,
        typeof snap?.annual_total === "number" && typeof snap?.member_count === "number"
          ? { income: snap.annual_total, size: snap.member_count }
          : null,
      );
    }
    const household = incomeCache.get(key) ?? null;
    if (!tableCache.has(schoolYear)) {
      tableCache.set(schoolYear, await prisma.lowIncomeTable.findUnique({ where: { schoolYear } }).catch(() => null));
    }
    const table = tableCache.get(schoolYear) ?? null;
    if (!household || !table) {
      row.incomeUnknown = round2(row.incomeUnknown + amount);
      continue;
    }
    const rows = readIncomeRows(table.rows).sort((a, b) => a.householdSize - b.householdSize);
    const exact = rows.find((r) => r.householdSize === household.size);
    const largest = rows[rows.length - 1];
    const base185 = exact
      ? exact.base185
      : largest && household.size > largest.householdSize
        ? largest.base185 + (household.size - largest.householdSize) * Number(table.additionalBase)
        : null;
    if (!base185) {
      row.incomeUnknown = round2(row.incomeUnknown + amount);
      continue;
    }
    if (household.income <= base185) row.upTo185 = round2(row.upTo185 + amount);
    else if (household.income <= base185 * 1.85) row.from185To342 = round2(row.from185To342 + amount);
    else row.above342 = round2(row.above342 + amount);
  }
  return figures;
}
