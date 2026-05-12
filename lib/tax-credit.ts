export type TaxYear = "2025" | "2026";
export type FilingStatus = "single" | "married";
export type TaxCreditLimitConfig = Record<TaxYear, {
  single: { original: number; overflow: number; combined: number };
  married: { original: number; overflow: number; combined: number };
}>;

/** Statutory-style caps for UI; confirm annually with legal / AZ DOR guidance. */
export const TAX_CREDIT_MAX: Record<
  TaxYear,
  { single: number; married: number }
> = {
  "2025": { single: 1535, married: 3062 },
  "2026": { single: 1571, married: 3131 },
};

export const DEFAULT_TAX_CREDIT_LIMITS: TaxCreditLimitConfig = {
  "2025": {
    single: { original: 769, overflow: 766, combined: 1535 },
    married: { original: 1535, overflow: 1527, combined: 3062 },
  },
  "2026": {
    single: { original: 787, overflow: 784, combined: 1571 },
    married: { original: 1570, overflow: 1561, combined: 3131 },
  },
};

export function combinedLimitsFromConfig(
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
): Record<TaxYear, { single: number; married: number }> {
  return {
    "2025": {
      single: limits["2025"].single.combined,
      married: limits["2025"].married.combined,
    },
    "2026": {
      single: limits["2026"].single.combined,
      married: limits["2026"].married.combined,
    },
  };
}

export function getMaxForYearAndFiling(
  taxYear: TaxYear,
  filing: FilingStatus,
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
): number {
  return limits[taxYear][filing].combined;
}

/** Original vs overflow caps for a tax year. */
export function getOriginalOverflowForYear(
  taxYear: TaxYear,
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
) {
  return limits[taxYear];
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
  limits?: TaxCreditLimitConfig;
}) {
  const max = getMaxForYearAndFiling(args.taxYear, args.filing, args.limits);
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
