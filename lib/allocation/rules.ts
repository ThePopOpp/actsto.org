/**
 * The allocation rules as pure functions, so they can be tested without a
 * database and so the server and the admin screen explain a refusal the same
 * way. Client-safe.
 *
 * Two different limits, deliberately kept apart:
 *   - Awards (allocations) are unlimited, but restricted money may only be
 *     awarded to a student eligible for that fund.
 *   - What is SENT TO THE SCHOOL is limited: all funds together may not exceed
 *     the year's tuition, low-income money may not exceed the grade-band cap,
 *     and disabled/displaced money may not exceed that student's entered cap.
 */

import { FUND_REQUIREMENT, FUNDING_SOURCE_LABEL, type FundingSource } from "@/lib/funding-sources";

export type StudentEligibility = {
  approvedApplication: boolean;
  overflow: boolean;
  low_income: boolean;
  disabled: boolean;
  displaced: boolean;
};

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Why this student can't receive this fund, or null when they can. */
export function fundEligibilityError(source: FundingSource, eligibility: StudentEligibility): string | null {
  if (!eligibility.approvedApplication) {
    return "This student has no approved application for that school year, so nothing can be awarded yet.";
  }
  const requirement = FUND_REQUIREMENT[source];
  const ok = requirement.anyOf.some((need) =>
    need === "approved_application" ? eligibility.approvedApplication : eligibility[need],
  );
  return ok ? null : `${FUNDING_SOURCE_LABEL[source]} money can only go to a student with ${requirement.text}.`;
}

/** Why an award of `amount` can't be drawn from a fund, or null. */
export function awardAmountError(amount: number, fundRemaining: number, campaignRemaining?: number | null): string | null {
  if (!(amount > 0)) return "Enter an amount above zero.";
  if (amount > fundRemaining + 0.005) {
    return `Only ${usd(Math.max(0, fundRemaining))} of that fund is unallocated.`;
  }
  if (campaignRemaining !== undefined && campaignRemaining !== null && amount > campaignRemaining + 0.005) {
    return `Only ${usd(Math.max(0, campaignRemaining))} of that campaign's donations to this fund is unallocated.`;
  }
  return null;
}

export type DisbursementContext = {
  amount: number;
  fundingSource: FundingSource;
  awardStatus: string;
  /** Award amount minus what has already been sent against it. */
  awardUnsent: number;
  /** Sent to the school for this student and year, all funds. */
  sentAllFunds: number;
  /** Sent for this student and year from this award's fund. */
  sentThisFund: number;
  /** Tuition after discounts, or the admin's override. Null when unknown. */
  tuitionCeiling: number | null;
  /** Low-income grade-band cap for the year. Null when none applies or is set. */
  lowIncomeCap: number | null;
  /** Per-student disabled/displaced cap. Null when not entered. */
  ddCap: number | null;
  /** Eligibility still holds at the moment of sending. */
  stillEligible: boolean;
};

/** Why this disbursement must be refused, or null when it may be sent. */
export function disbursementError(ctx: DisbursementContext): string | null {
  const { amount } = ctx;
  if (!(amount > 0)) return "Enter an amount above zero.";
  if (ctx.awardStatus === "reversed") return "This award was reversed.";
  if (ctx.awardStatus === "held_esa") {
    return "This award is on hold for ESA documentation. Release the hold before sending money to the school.";
  }
  if (!ctx.stillEligible) {
    return "The student is no longer eligible for this fund for that school year, so nothing can be sent.";
  }
  if (amount > ctx.awardUnsent + 0.005) {
    return `Only ${usd(Math.max(0, ctx.awardUnsent))} of this award is left to send.`;
  }
  if (ctx.tuitionCeiling === null) {
    return "Enter this student's tuition for the year first. Money sent to the school can't exceed tuition.";
  }
  const tuitionRoom = ctx.tuitionCeiling - ctx.sentAllFunds;
  if (amount > tuitionRoom + 0.005) {
    return `That would exceed tuition: ${usd(ctx.tuitionCeiling)} tuition, ${usd(ctx.sentAllFunds)} already sent from all funds, ${usd(Math.max(0, tuitionRoom))} of room left.`;
  }
  if (ctx.fundingSource === "corporate_low_income") {
    if (ctx.lowIncomeCap === null) {
      return "No low-income cap is set for this student's grade band and school year. Add it on Scholarship caps, and check the student's grade.";
    }
    const room = ctx.lowIncomeCap - ctx.sentThisFund;
    if (amount > room + 0.005) {
      return `That would exceed the low-income cap: ${usd(ctx.lowIncomeCap)} cap, ${usd(ctx.sentThisFund)} already sent, ${usd(Math.max(0, room))} of room left.`;
    }
  }
  if (ctx.fundingSource === "corporate_disabled_displaced") {
    if (ctx.ddCap === null) {
      return "Enter this student's disabled/displaced cap (the lesser of tuition or 90% of state aid) before sending this money.";
    }
    const cap = Math.min(ctx.ddCap, ctx.tuitionCeiling);
    const room = cap - ctx.sentThisFund;
    if (amount > room + 0.005) {
      return `That would exceed the disabled/displaced cap: ${usd(cap)} cap, ${usd(ctx.sentThisFund)} already sent, ${usd(Math.max(0, room))} of room left.`;
    }
  }
  return null;
}

/**
 * How much of an award can ever be paid: what's left under every limit. The
 * rest shows as "awarded, not payable" so staff and parents see why.
 */
export function payableRoom(ctx: Omit<DisbursementContext, "amount" | "awardStatus" | "stillEligible">): number {
  let room = ctx.awardUnsent;
  if (ctx.tuitionCeiling !== null) room = Math.min(room, ctx.tuitionCeiling - ctx.sentAllFunds);
  if (ctx.fundingSource === "corporate_low_income" && ctx.lowIncomeCap !== null) {
    room = Math.min(room, ctx.lowIncomeCap - ctx.sentThisFund);
  }
  if (ctx.fundingSource === "corporate_disabled_displaced" && ctx.ddCap !== null) {
    room = Math.min(room, Math.min(ctx.ddCap, ctx.tuitionCeiling ?? ctx.ddCap) - ctx.sentThisFund);
  }
  return Math.max(0, Math.round(room * 100) / 100);
}
