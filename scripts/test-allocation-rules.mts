/**
 * Unit tests for the allocation, cap, income-table and grade rules.
 *
 * Run with: npm run test:allocation
 *
 * These decide whether restricted tax-credit money may reach a student and
 * whether a payment to a school is allowed, so each rule is pinned down here:
 * ineligible allocations, over-cap and over-tuition payments, the income table
 * arithmetic (including the $50,052 typo), grade bands, gift splitting, and the
 * corporate "never a student" rule. Plain tsx script; exits non-zero on failure.
 */

import assert from "node:assert/strict";

const { awardAmountError, disbursementError, fundEligibilityError, payableRoom } = await import("@/lib/allocation/rules");
const { calculateLowIncome, incomeLimitFor, validateIncomeTable } = await import("@/lib/eligibility/income-table");
const { canonicalGrade, gradeBand, isK12, normalizeGradeInput } = await import("@/lib/grades");
const { splitIndividualGift, isCorporateProgram } = await import("@/lib/funding-sources");
const { sanitizeRecommendation } = await import("@/lib/donations/recommendations");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }
}

const NONE = { approvedApplication: true, overflow: false, low_income: false, disabled: false, displaced: false };

// ── Fund eligibility ─────────────────────────────────────────────────────────

test("restricted low-income money is refused for a student without the flag", () => {
  assert.match(fundEligibilityError("corporate_low_income", NONE) ?? "", /low-income eligibility/);
});
test("low-income money is allowed with an approved low-income flag", () => {
  assert.equal(fundEligibilityError("corporate_low_income", { ...NONE, low_income: true }), null);
});
test("disabled/displaced money accepts either flag", () => {
  assert.equal(fundEligibilityError("corporate_disabled_displaced", { ...NONE, disabled: true }), null);
  assert.equal(fundEligibilityError("corporate_disabled_displaced", { ...NONE, displaced: true }), null);
  assert.ok(fundEligibilityError("corporate_disabled_displaced", NONE));
});
test("overflow money needs the overflow qualification", () => {
  assert.ok(fundEligibilityError("individual_overflow", NONE));
  assert.equal(fundEligibilityError("individual_overflow", { ...NONE, overflow: true }), null);
});
test("every fund needs an approved application first", () => {
  assert.match(
    fundEligibilityError("individual_original", { ...NONE, approvedApplication: false }) ?? "",
    /no approved application/,
  );
  assert.ok(fundEligibilityError("corporate_low_income", { ...NONE, approvedApplication: false, low_income: true }));
});
test("original money only needs the approved application", () => {
  assert.equal(fundEligibilityError("individual_original", NONE), null);
});

// ── Award amounts ────────────────────────────────────────────────────────────

test("an award can't exceed the fund's unallocated balance", () => {
  assert.match(awardAmountError(500, 400) ?? "", /Only \$400/);
  assert.equal(awardAmountError(400, 400), null);
});
test("an award drawn from a campaign can't exceed that campaign's unallocated gifts", () => {
  assert.match(awardAmountError(300, 1000, 250) ?? "", /campaign/);
});
test("zero and negative awards are refused", () => {
  assert.ok(awardAmountError(0, 1000));
  assert.ok(awardAmountError(-5, 1000));
});

// ── Disbursements: tuition ceiling and caps ──────────────────────────────────

const base = {
  amount: 1000,
  fundingSource: "individual_original" as const,
  awardStatus: "awarded",
  awardUnsent: 5000,
  sentAllFunds: 0,
  sentThisFund: 0,
  tuitionCeiling: 10000,
  lowIncomeCap: null,
  ddCap: null,
  stillEligible: true,
};

test("a payment within tuition is allowed", () => {
  assert.equal(disbursementError(base), null);
});
test("all funds together can't exceed tuition", () => {
  assert.match(disbursementError({ ...base, sentAllFunds: 9500 }) ?? "", /exceed tuition/);
});
test("a payment needs a known tuition", () => {
  assert.match(disbursementError({ ...base, tuitionCeiling: null }) ?? "", /tuition/);
});
test("low-income payments stop at the grade-band cap", () => {
  const ctx = { ...base, fundingSource: "corporate_low_income" as const, lowIncomeCap: 6700, sentThisFund: 6000 };
  assert.match(disbursementError(ctx) ?? "", /low-income cap/);
  assert.equal(disbursementError({ ...ctx, amount: 700 }), null);
});
test("low-income payments need a cap on file", () => {
  assert.match(disbursementError({ ...base, fundingSource: "corporate_low_income" }) ?? "", /No low-income cap/);
});
test("disabled/displaced payments stop at the lesser of tuition and the entered cap", () => {
  const ctx = { ...base, fundingSource: "corporate_disabled_displaced" as const, ddCap: 7000, sentThisFund: 6500 };
  assert.match(disbursementError(ctx) ?? "", /disabled\/displaced cap/);
  assert.match(disbursementError({ ...base, fundingSource: "corporate_disabled_displaced" }) ?? "", /Enter this student's disabled/);
});
test("held, reversed and no-longer-eligible awards can't be paid", () => {
  assert.match(disbursementError({ ...base, awardStatus: "held_esa" }) ?? "", /ESA/);
  assert.match(disbursementError({ ...base, awardStatus: "reversed" }) ?? "", /reversed/);
  assert.match(disbursementError({ ...base, stillEligible: false }) ?? "", /no longer eligible/);
});
test("a payment can't exceed what is left on the award", () => {
  assert.match(disbursementError({ ...base, awardUnsent: 500 }) ?? "", /left to send/);
});
test("payable room is the tightest limit, so the rest reads as awarded, not payable", () => {
  assert.equal(
    payableRoom({
      fundingSource: "corporate_low_income",
      awardUnsent: 9000,
      sentAllFunds: 2000,
      sentThisFund: 0,
      tuitionCeiling: 12000,
      lowIncomeCap: 6700,
      ddCap: null,
    }),
    6700,
  );
});

// ── Income table ─────────────────────────────────────────────────────────────

const TABLE = {
  schoolYear: "2026/2027",
  additionalBase: 10508,
  additionalMax: 19440,
  rows: [
    { householdSize: 1, base185: 29526, maxIncome: 54623 },
    { householdSize: 2, base185: 40034, maxIncome: 74063 },
    { householdSize: 3, base185: 50542, maxIncome: 93503 },
    { householdSize: 4, base185: 61050, maxIncome: 112943 },
    { householdSize: 5, base185: 71558, maxIncome: 132382 },
    { householdSize: 6, base185: 82066, maxIncome: 151822 },
    { householdSize: 7, base185: 92574, maxIncome: 171262 },
    { householdSize: 8, base185: 103082, maxIncome: 190702 },
  ],
};

test("the confirmed 2026/27 table validates", () => {
  assert.deepEqual(validateIncomeTable(TABLE), []);
});
test("the circulated $50,052 typo is caught", () => {
  const typo = { ...TABLE, rows: TABLE.rows.map((r) => (r.householdSize === 3 ? { ...r, base185: 50052 } : r)) };
  assert.ok(validateIncomeTable(typo).some((e) => e.includes("Household size 3")));
});
test("households over 8 add the per-member increment", () => {
  assert.equal(incomeLimitFor(TABLE, 10), 190702 + 2 * 19440);
});
test("income at the limit qualifies; a dollar over does not", () => {
  assert.equal(calculateLowIncome(TABLE, 6, 151822)?.qualifies, true);
  assert.equal(calculateLowIncome(TABLE, 6, 151823)?.qualifies, false);
});

// ── Grades ───────────────────────────────────────────────────────────────────

test("free-text grades map to the shared list", () => {
  assert.equal(canonicalGrade("6th Grade"), "6th grade");
  assert.equal(canonicalGrade("9"), "9th grade");
  assert.equal(canonicalGrade("grade 3"), "3rd grade");
  assert.equal(canonicalGrade("K"), "Kindergarten");
  assert.equal(canonicalGrade("Pre-K"), "Preschool");
  assert.equal(canonicalGrade("sophomore"), null);
  assert.equal(normalizeGradeInput("sophomore"), "sophomore");
});
test("grade bands split K-8 from 9-12, with preschool in the lower band", () => {
  assert.equal(gradeBand("8th grade"), "k8");
  assert.equal(gradeBand("9th grade"), "9_12");
  assert.equal(gradeBand("Preschool"), "k8");
  assert.equal(gradeBand("All grades"), null);
});
test("displaced status applies K-12 only", () => {
  assert.equal(isK12("Preschool"), false);
  assert.equal(isK12("Kindergarten"), true);
});

// ── Donations ────────────────────────────────────────────────────────────────

test("an individual gift is Original up to the limit, Overflow after", () => {
  assert.deepEqual(splitIndividualGift(1571, 787, 0), [
    { fundingSource: "individual_original", amount: 787 },
    { fundingSource: "individual_overflow", amount: 784 },
  ]);
  assert.deepEqual(splitIndividualGift(500, 787, 600), [
    { fundingSource: "individual_original", amount: 187 },
    { fundingSource: "individual_overflow", amount: 313 },
  ]);
});
test("only the two corporate programs are valid corporate choices", () => {
  assert.equal(isCorporateProgram("corporate_low_income"), true);
  assert.equal(isCorporateProgram("individual_original"), false);
});
test("a corporate gift never keeps a student, only a school", () => {
  const out = sanitizeRecommendation({
    corporate: true,
    designate: true,
    studentIds: ["a", "b"],
    campaignStudentIds: ["a", "b"],
    schoolId: "school-1",
  });
  assert.deepEqual(out.studentIds, []);
  assert.equal(out.schoolId, "school-1");
  assert.equal(out.relationshipAckRequired, false);
});
test("a NO answer clears the students but keeps no acknowledgement requirement", () => {
  const out = sanitizeRecommendation({
    corporate: false,
    designate: false,
    studentIds: ["a"],
    campaignStudentIds: ["a"],
    schoolId: null,
  });
  assert.deepEqual(out.studentIds, []);
  assert.equal(out.relationshipAckRequired, false);
});
test("only the campaign's own students can be recommended", () => {
  const out = sanitizeRecommendation({
    corporate: false,
    designate: true,
    studentIds: ["a", "intruder"],
    campaignStudentIds: ["a", "b"],
    schoolId: null,
  });
  assert.deepEqual(out.studentIds, ["a"]);
  assert.equal(out.relationshipAckRequired, true);
});

console.log(`allocation rules: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
