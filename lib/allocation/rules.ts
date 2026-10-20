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
  schoolYear: string;
  /** Award amount minus what has already been sent against it (net of returns). */
  awardUnsent: number;
  /** Sent to the school by ACTSTO for this student and year, all funds, net of returns. */
  sentAllFunds: number;
  /** Sent by ACTSTO for this student and year from this award's fund, net of returns. */
  sentThisFund: number;
  /** Tuition after discounts, or the admin's override. Null when unknown. */
  tuitionCeiling: number | null;
  /** Other STOs' scholarships for this student and year, all programs (self-reported). */
  otherStoAll: number;
  /** Other STOs' disabled/displaced scholarships for this student and year. */
  otherStoDisabledDisplaced: number;
  /** Low-income grade-band cap for the year (per STO). Null when none applies or is set. */
  lowIncomeCap: number | null;
  /** Disabled/displaced cap (lesser of tuition and the 90% state aid amount), all STOs. */
  ddCap: number | null;
  /** ADOR's state aid matrix for this school year has been entered. */
  ddMatrixLoaded: boolean;
  /** Why the matrix gives no rate for this student (code or grade band), or null. */
  ddProblem?: string | null;
  /** Eligibility still holds at the moment of sending. */
  stillEligible: boolean;
  /** The student has an active ESA contract for this school year. */
  esaActive: boolean;
  /** The committee's approval is recorded on the award. */
  committeeApproved: boolean;
};

/**
 * Why this disbursement must be refused, or null when it may be sent. Going
 * over tuition only because of other STOs' self-reported scholarships is not
 * a refusal: see tuitionWarning.
 */
export function disbursementError(ctx: DisbursementContext): string | null {
  const { amount } = ctx;
  if (!(amount > 0)) return "Enter an amount above zero.";
  if (ctx.awardStatus === "reversed") return "This award was reversed.";
  if (!ctx.committeeApproved) {
    return "This award needs its review and the committee's approval (in the award's Decision section) before money can be sent to the school.";
  }
  if (ctx.esaActive || ctx.awardStatus === "held_esa") return "Active ESA: award held until the ESA is closed.";
  if (!ctx.stillEligible) {
    return "The student is no longer eligible for this fund for that school year, so nothing can be sent.";
  }
  if (amount > ctx.awardUnsent + 0.005) {
    return `Only ${usd(Math.max(0, ctx.awardUnsent))} of this award is left to send.`;
  }
  if (ctx.tuitionCeiling === null) {
    return "Enter this student's tuition for the year first. Money sent to the school can't exceed tuition.";
  }
  const ownRoom = ctx.tuitionCeiling - ctx.sentAllFunds;
  if (amount > ownRoom + 0.005) {
    return `That would exceed tuition: ${usd(ctx.tuitionCeiling)} tuition, ${usd(ctx.sentAllFunds)} already sent by ACTSTO, ${usd(Math.max(0, ownRoom))} of room left.`;
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
    if (!ctx.ddMatrixLoaded) return `Waiting for ADOR ${ctx.schoolYear} state aid matrix.`;
    if (ctx.ddCap === null) {
      return (
        ctx.ddProblem ??
        "No 90% state aid amount matches this student's category and grade. Check the student's grade, or the codes in the state aid matrix."
      );
    }
    const room = ctx.ddCap - ctx.otherStoDisabledDisplaced - ctx.sentThisFund;
    if (amount > room + 0.005) {
      return `That would exceed the disabled/displaced cap across all STOs: ${usd(ctx.ddCap)} cap, ${usd(ctx.otherStoDisabledDisplaced)} from other STOs, ${usd(ctx.sentThisFund)} already sent by ACTSTO, ${usd(Math.max(0, room))} of room left.`;
    }
  }
  return null;
}

/**
 * A warning (not a refusal) when the payment would take everything from all
 * STOs over tuition. Other STOs' amounts are self-reported, so staff may send
 * anyway with a recorded reason.
 */
export function tuitionWarning(ctx: DisbursementContext): string | null {
  if (ctx.tuitionCeiling === null || ctx.otherStoAll <= 0) return null;
  const room = ctx.tuitionCeiling - ctx.otherStoAll - ctx.sentAllFunds;
  if (ctx.amount <= room + 0.005) return null;
  return `With other STOs' scholarships this would exceed tuition: ${usd(ctx.tuitionCeiling)} tuition, ${usd(ctx.otherStoAll)} from other STOs (reported), ${usd(ctx.sentAllFunds)} sent by ACTSTO, ${usd(Math.max(0, room))} of room left.`;
}

/**
 * How much of an award can ever be paid: what's left under every limit,
 * counting other STOs. The rest shows as "awarded, not payable".
 */
export function payableRoom(
  ctx: Pick<
    DisbursementContext,
    "fundingSource" | "awardUnsent" | "sentAllFunds" | "sentThisFund" | "tuitionCeiling" | "lowIncomeCap" | "ddCap"
  > & { otherStoAll?: number; otherStoDisabledDisplaced?: number },
): number {
  let room = ctx.awardUnsent;
  if (ctx.tuitionCeiling !== null) room = Math.min(room, ctx.tuitionCeiling - (ctx.otherStoAll ?? 0) - ctx.sentAllFunds);
  if (ctx.fundingSource === "corporate_low_income" && ctx.lowIncomeCap !== null) {
    room = Math.min(room, ctx.lowIncomeCap - ctx.sentThisFund);
  }
  if (ctx.fundingSource === "corporate_disabled_displaced" && ctx.ddCap !== null) {
    room = Math.min(room, ctx.ddCap - (ctx.otherStoDisabledDisplaced ?? 0) - ctx.sentThisFund);
  }
  return Math.max(0, Math.round(room * 100) / 100);
}
