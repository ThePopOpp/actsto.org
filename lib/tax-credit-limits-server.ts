import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TAX_CREDIT_LIMITS,
  type FilingStatus,
  type TaxCreditLimitConfig,
  type TaxYear,
} from "@/lib/tax-credit";

const TAX_YEARS: TaxYear[] = ["2025", "2026"];
const FILING_STATUSES: FilingStatus[] = ["single", "married"];

function dollars(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : value && typeof value === "object" && "toString" in value
          ? Number.parseFloat(value.toString())
          : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getTaxCreditLimitConfig(): Promise<TaxCreditLimitConfig> {
  const rows = await prisma.taxCreditLimit.findMany().catch(() => []);
  const next: TaxCreditLimitConfig = structuredClone(DEFAULT_TAX_CREDIT_LIMITS);

  for (const row of rows) {
    const year = String(row.taxYear) as TaxYear;
    const filing = row.filingStatus as FilingStatus;
    if (!TAX_YEARS.includes(year) || !FILING_STATUSES.includes(filing)) continue;
    const fallback = next[year][filing];
    next[year][filing] = {
      original: dollars(row.originalCreditLimit, fallback.original),
      overflow: dollars(row.overflowCreditLimit, fallback.overflow),
      combined: dollars(row.combinedLimit, fallback.combined),
    };
  }

  return next;
}
