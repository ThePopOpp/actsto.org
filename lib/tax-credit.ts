export type TaxYear = "2025" | "2026";
export type FilingStatus = "single" | "married";

/** Statutory-style caps for UI; confirm annually with legal / AZ DOR guidance. */
export const TAX_CREDIT_MAX: Record<
  TaxYear,
  { single: number; married: number }
> = {
  "2025": { single: 1459, married: 2918 },
  "2026": { single: 1571, married: 3131 },
};

export function getMaxForYearAndFiling(
  taxYear: TaxYear,
  filing: FilingStatus
): number {
  const row = TAX_CREDIT_MAX[taxYear];
  return filing === "single" ? row.single : row.married;
}

/** 2026 statutory-style original / overflow split (sums to TAX_CREDIT_MAX["2026"]). */
const ORIGINAL_OVERFLOW_2026 = {
  single: { original: 787, overflow: 784 },
  married: { original: 1570, overflow: 1561 },
} as const;

/**
 * Original vs overflow caps for a tax year (each column sums to TAX_CREDIT_MAX for that year).
 * 2026 uses published-style splits; 2025 is derived with the same ratios so totals match our caps.
 */
export function getOriginalOverflowForYear(taxYear: TaxYear): {
  single: { original: number; overflow: number; combined: number };
  married: { original: number; overflow: number; combined: number };
} {
  if (taxYear === "2026") {
    const max = TAX_CREDIT_MAX["2026"];
    return {
      single: {
        original: ORIGINAL_OVERFLOW_2026.single.original,
        overflow: ORIGINAL_OVERFLOW_2026.single.overflow,
        combined: max.single,
      },
      married: {
        original: ORIGINAL_OVERFLOW_2026.married.original,
        overflow: ORIGINAL_OVERFLOW_2026.married.overflow,
        combined: max.married,
      },
    };
  }
  const max = TAX_CREDIT_MAX["2025"];
  const rSingle = ORIGINAL_OVERFLOW_2026.single.original / TAX_CREDIT_MAX["2026"].single;
  const rMarried = ORIGINAL_OVERFLOW_2026.married.original / TAX_CREDIT_MAX["2026"].married;
  const singleOriginal = Math.round(rSingle * max.single);
  const marriedOriginal = Math.round(rMarried * max.married);
  return {
    single: {
      original: singleOriginal,
      overflow: max.single - singleOriginal,
      combined: max.single,
    },
    married: {
      original: marriedOriginal,
      overflow: max.married - marriedOriginal,
      combined: max.married,
    },
  };
}

/**
 * Capacity used toward the annual cap from other STOs plus prior ACT gifts this tax year,
 * then how much of this donation counts as current-year credit vs carry-forward (A.R.S. § 43-1089).
 */
export function summarizeTaxCredit(args: {
  taxYear: TaxYear;
  filing: FilingStatus;
  otherStoTotal: number;
  /** Gifts to this ACT toward the same credit already made this tax year */
  priorActDonationsThisYear?: number;
  actDonation: number;
}) {
  const max = getMaxForYearAndFiling(args.taxYear, args.filing);
  const other = Math.max(0, args.otherStoTotal);
  const priorAct = Math.max(0, args.priorActDonationsThisYear ?? 0);
  const usedTowardCap = other + priorAct;
  const remainingCapacity = Math.max(0, max - usedTowardCap);
  const donation = Math.max(0, args.actDonation);
  const eligibleCredit = Math.min(donation, remainingCapacity);
  const futureCarryForward = Math.max(0, donation - eligibleCredit);
  return {
    maxCredit: max,
    /** Capacity left for this gift after other STO + prior ACT gifts */
    remainingCapacityBeforeGift: remainingCapacity,
    eligibleCredit,
    /** Portion of this gift that exceeds remaining cap — carried forward up to 5 years */
    futureCarryForward,
    taxDeductionDisplay: eligibleCredit,
    usedTowardCapBeforeThisGift: usedTowardCap,
  };
}
