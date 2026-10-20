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

const { awardAmountError, disbursementError, fundEligibilityError, payableRoom, tuitionWarning } = await import("@/lib/allocation/rules");
const { disabilityApprovalError } = await import("@/lib/award-policy/disability");
const { capCategory, checkMatrix, compareMatrices, ddGradeBand, parseAdorMatrix, rateFor, schoolYearFromFileName } = await import(
  "@/lib/award-policy/limits"
);
const { awardCardStatus, decisionApprovalError, normalizeDecision, roundOrDefault } = await import("@/lib/award-policy/decisions");
const { parseCsv } = await import("@/lib/csv");
const { existsSync, readFileSync } = await import("node:fs");
const { calculateLowIncome, incomeLimitFor, validateIncomeTable } = await import("@/lib/eligibility/income-table");
const { canonicalGrade, gradeBand, isK12, normalizeGradeInput } = await import("@/lib/grades");
const { splitIndividualGift, isCorporateProgram } = await import("@/lib/funding-sources");
const { sanitizeRecommendation } = await import("@/lib/donations/recommendations");
const { splitEvenCents, takeEvenly, recommendedRemaining, fundingOrder, fundFromPots, GENERAL_POOL } = await import(
  "@/lib/allocation/funding-plan"
);

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
  schoolYear: "2026/2027",
  awardUnsent: 5000,
  sentAllFunds: 0,
  sentThisFund: 0,
  tuitionCeiling: 10000,
  otherStoAll: 0,
  otherStoDisabledDisplaced: 0,
  lowIncomeCap: null,
  ddCap: null,
  ddMatrixLoaded: true,
  stillEligible: true,
  esaActive: false,
  committeeApproved: true,
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
test("disabled/displaced payments stop at the cap across all STOs, with the figures", () => {
  const ctx = { ...base, fundingSource: "corporate_disabled_displaced" as const, ddCap: 7000, sentThisFund: 3000, otherStoDisabledDisplaced: 3500 };
  const msg = disbursementError(ctx) ?? "";
  assert.match(msg, /across all STOs/);
  assert.match(msg, /\$7,000 cap/);
  assert.match(msg, /\$3,500 from other STOs/);
  assert.match(msg, /\$500 of room left/);
  assert.equal(disbursementError({ ...ctx, amount: 500 }), null);
  assert.match(disbursementError({ ...base, fundingSource: "corporate_disabled_displaced" }) ?? "", /No 90% state aid amount/);
});
test("disabled/displaced payments wait for the year's ADOR matrix", () => {
  const ctx = { ...base, fundingSource: "corporate_disabled_displaced" as const, ddCap: 7000, ddMatrixLoaded: false, schoolYear: "2027/2028" };
  assert.match(disbursementError(ctx) ?? "", /Waiting for ADOR 2027\/2028 state aid matrix/);
});
test("an active ESA blocks the payment, not the award", () => {
  assert.equal(disbursementError({ ...base, esaActive: true }), "Active ESA: award held until the ESA is closed.");
});
test("nothing is paid without the committee's approval", () => {
  assert.match(disbursementError({ ...base, committeeApproved: false }) ?? "", /committee/);
});
test("other STOs' scholarships over tuition warn rather than block", () => {
  const ctx = { ...base, otherStoAll: 9500 };
  assert.equal(disbursementError(ctx), null);
  assert.match(tuitionWarning(ctx) ?? "", /other STOs/);
  assert.equal(tuitionWarning({ ...ctx, amount: 500 }), null);
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


// ── Campaign funding arithmetic ──────────────────────────────────────────────

test("an even split keeps every cent", () => {
  assert.deepEqual(splitEvenCents(1000, 3), [334, 333, 333]);
  assert.equal(splitEvenCents(1, 4).reduce((a, b) => a + b, 0), 1);
});

test("taking evenly stops each balance at zero and re-spreads the rest", () => {
  const out = takeEvenly(new Map([["a", 100], ["b", 1000], ["c", 0]]), 600);
  assert.equal(out.balances.get("a"), 0);
  assert.equal(out.balances.get("b"), 500);
  assert.equal(out.balances.get("c"), 0);
  assert.equal(out.leftover, 0);
});

test("recommended remaining splits each gift among the students it named", () => {
  const out = recommendedRemaining({
    studentIds: ["s1", "s2"],
    gifts: [
      { amount: 100, recommendedStudentIds: ["s1", "s2"] },
      { amount: 30, recommendedStudentIds: ["s1"] },
      { amount: 20, recommendedStudentIds: [] },
    ],
    awards: [],
  });
  assert.deepEqual(out.students.map((s) => s.remaining), [80, 50]);
  assert.equal(out.noRecommendation, 20);
  assert.equal(out.campaignRemaining, 150);
});

test("an award to an outside student reduces the campaign's students evenly", () => {
  const out = recommendedRemaining({
    studentIds: ["s1", "s2"],
    gifts: [{ amount: 100, recommendedStudentIds: ["s1", "s2"] }, { amount: 10, recommendedStudentIds: [] }],
    awards: [{ studentId: "outsider", amount: 30.01 }],
  });
  assert.deepEqual(out.students.map((s) => s.remaining), [34.99, 35]);
  assert.equal(out.noRecommendation, 10);
  assert.equal(out.campaignRemaining, 79.99);
});

test("a student's award uses their share, then unrecommended money, then others", () => {
  const out = recommendedRemaining({
    studentIds: ["s1", "s2"],
    gifts: [{ amount: 40, recommendedStudentIds: ["s1"] }, { amount: 40, recommendedStudentIds: ["s2"] }, { amount: 10, recommendedStudentIds: [] }],
    awards: [{ studentId: "s1", amount: 60 }],
  });
  assert.deepEqual(out.students.map((s) => s.remaining), [0, 30]);
  assert.equal(out.noRecommendation, 0);
  assert.equal(out.campaignRemaining, 30);
});

test("the student amounts plus No recommendation always equal the campaign remaining", () => {
  const out = recommendedRemaining({
    studentIds: ["a", "b", "c"],
    gifts: [{ amount: 333.33, recommendedStudentIds: ["a", "b", "c"] }, { amount: 50, recommendedStudentIds: ["c"] }],
    awards: [{ studentId: "x", amount: 99.99 }, { studentId: "c", amount: 120 }],
  });
  const sum = out.students.reduce((s, r) => s + Math.round(r.remaining * 100), 0) + Math.round(out.noRecommendation * 100);
  assert.equal(sum, Math.round(out.campaignRemaining * 100));
  assert.equal(out.campaignRemaining, 163.34);
});

test("funding order: chosen campaign, own, recommended, others oldest first, general last", () => {
  const pots = [
    { key: GENERAL_POOL, label: "General", remaining: 100, oldestGiftAt: "2026-01-01" },
    { key: "old", label: "Old", remaining: 100, oldestGiftAt: "2026-02-01" },
    { key: "new", label: "New", remaining: 100, oldestGiftAt: "2026-05-01" },
    { key: "rec", label: "Rec", remaining: 100, oldestGiftAt: "2026-06-01" },
    { key: "own", label: "Own", remaining: 100, oldestGiftAt: "2026-07-01" },
  ];
  assert.deepEqual(
    fundingOrder(pots, { ownKeys: ["own"], recommendedKeys: ["rec"] }).map((p) => p.key),
    ["own", "rec", "old", "new", GENERAL_POOL],
  );
  assert.equal(fundingOrder(pots, { preferKey: "new", ownKeys: ["own"] })[0].key, "new");
});

test("one amount is funded across campaigns, and pots are not drawn twice", () => {
  const pots = [
    { key: "cannon", label: "Cannon", remaining: 3671, oldestGiftAt: null },
    { key: "valley", label: "Valley Christian", remaining: 2000, oldestGiftAt: null },
  ];
  const first = fundFromPots(4715, pots);
  assert.deepEqual(first.lines.map((l) => [l.key, l.amount]), [["cannon", 3671], ["valley", 1044]]);
  const second = fundFromPots(1000, pots);
  assert.deepEqual(second.lines.map((l) => [l.key, l.amount]), [["valley", 956]]);
  assert.equal(second.unfunded, 44);
});


// ── Award policy: disability verification and the cap category ───────────────

const CHECK = { documentType: "IEP", issuedByAzPublic: true, disabilityNamed: "Autism", spedCategory: "A", gradeBand: "k12" };
test("a complete K-12 IEP checklist can be approved", () => {
  assert.equal(disabilityApprovalError(CHECK), null);
});
test("documents not from an Arizona public school are denied", () => {
  assert.match(disabilityApprovalError({ ...CHECK, issuedByAzPublic: false }) ?? "", /Arizona public school/);
});
test("a 504 plan never qualifies a preschooler", () => {
  assert.match(disabilityApprovalError({ ...CHECK, documentType: "504", spedCategory: null, gradeBand: "preschool" }) ?? "", /K-12 only/);
  assert.equal(disabilityApprovalError({ ...CHECK, documentType: "504", spedCategory: null }), null);
});
test("a preschooler needs one of the five preschool disabilities", () => {
  assert.match(disabilityApprovalError({ ...CHECK, gradeBand: "preschool", spedCategory: "A" }) ?? "", /preschooler qualifies only/);
  assert.equal(disabilityApprovalError({ ...CHECK, gradeBand: "preschool", spedCategory: "SLI" }), null);
});
test("displaced students and 504 plans use regular education", () => {
  assert.equal(capCategory({ grade: "3rd grade", verifiedCategory: null, verifiedDocumentType: null, disabled: false, displaced: true }).category, "REG");
  assert.equal(capCategory({ grade: "3rd grade", verifiedCategory: "SLD", verifiedDocumentType: "504", disabled: true, displaced: false }).category, "REG");
  assert.equal(capCategory({ grade: "3rd grade", verifiedCategory: "SLD", verifiedDocumentType: "IEP", disabled: true, displaced: false }).category, "SLD");
});
test("a preschool category stops at kindergarten and flags an MET check", () => {
  const out = capCategory({ grade: "Kindergarten", verifiedCategory: "PSD", verifiedDocumentType: "IEP", disabled: true, displaced: false });
  assert.deepEqual(out, { category: "REG", needsMetCheck: true });
  assert.equal(capCategory({ grade: "Preschool", verifiedCategory: "PSD", verifiedDocumentType: "IEP", disabled: true, displaced: false }).category, "PSD");
});
test("matrix grade bands: ADOR's five", () => {
  assert.equal(ddGradeBand("Preschool"), "preschool");
  assert.equal(ddGradeBand("Kindergarten"), "k");
  assert.equal(ddGradeBand("1st grade"), "1_3");
  assert.equal(ddGradeBand("3rd grade"), "1_3");
  assert.equal(ddGradeBand("4th grade"), "4_8");
  assert.equal(ddGradeBand("8th grade"), "4_8");
  assert.equal(ddGradeBand("9th grade"), "9_12");
  assert.equal(ddGradeBand("12th grade"), "9_12");
  assert.equal(ddGradeBand(null), null);
});

const ADOR_CSV = `﻿Special Education Category,Preschool,Kindergarten,1st - 3rd,4th - 8th,9th - 12th
Preschooler,3403.13,,,,
HI,14600.62,14150.00,28299.99,27830.59,28346.93
"MD, A, SID - SC",,17006.28,34012.56,33543.16,34059.50
MDSSI,,21604.03,43208.06,42738.66,43255.00
OI R,,10364.30,20728.60,20259.21,20775.55
PS D,11840.55,,,,
"ED, MIID, SLD, SLI, OHI, DD",,3637.84,7275.66,6806.27,7322.61
EDP,,14269.69,28539.38,28069.98,28586.32
MOID,,13328.55,26657.09,26187.70,26704.04
VI,14682.76,14232.14,28464.27,27994.88,28511.22
Regular Education (displaced pupils or children with a 504 plan),,2952.51,5905.02,5435.63,5951.96

`;
const adorFile = "docs/updates/act-updates/FY2026-2027_DD_Scholarship_Payment_Matrix.csv";
const adorText = existsSync(adorFile) ? readFileSync(adorFile, "utf8") : ADOR_CSV;

test("ADOR's FY2026-2027 file imports as published, no hand editing", () => {
  for (const text of [ADOR_CSV, adorText]) {
    const out = parseAdorMatrix(parseCsv(text));
    assert.deepEqual(out.errors, []);
    assert.equal(out.rows.length, 11);
    const multi = out.rows.find((r) => r.rowLabel === "ED, MIID, SLD, SLI, OHI, DD")!;
    assert.deepEqual(multi.codes, ["ED", "MIID", "SLD", "SLI", "OHI", "DD"]);
    assert.equal(multi.amounts.preschool, null);
    assert.equal(multi.amounts["1_3"], 7275.66);
    assert.deepEqual(out.rows.find((r) => r.rowLabel === "Preschooler")!.codes, ["P"]);
    assert.deepEqual(out.rows.find((r) => r.rowLabel === "PS D")!.codes, ["PSD"]);
    assert.deepEqual(out.rows.find((r) => r.rowLabel === "MD, A, SID - SC")!.codes, ["MD", "A", "SID-SC"]);
    const reg = out.rows.filter((r) => r.isRegularEducation);
    assert.equal(reg.length, 1);
    assert.deepEqual(reg[0].codes, ["REG"]);
    const check = checkMatrix(out.rows);
    assert.deepEqual(check.errors, []);
    // SID-SC and OIR aren't codes we knew: a warning to acknowledge, not an error.
    assert.ok(check.warnings.some((w) => w.includes("SID-SC")));
  }
});
test("matrix headers match flexibly; a missing band rejects the file", () => {
  const out = parseAdorMatrix(parseCsv('Category,PRESCHOOL,kindergarten,1st–3rd,Grades 4-8,9TH-12TH\nHI,"$1,000",2,3,4,5'));
  assert.deepEqual(out.errors, []);
  assert.equal(out.rows[0].amounts.preschool, 1000);
  assert.equal(out.rows[0].amounts["9_12"], 5);
  const missing = parseAdorMatrix(parseCsv("Category,Preschool,Kindergarten,1st - 3rd,4th - 8th\nHI,1,2,3,4"));
  assert.equal(missing.rows.length, 0);
  assert.match(missing.errors[0], /9th - 12th/);
  const bad = parseAdorMatrix(parseCsv("Category,Preschool,Kindergarten,1st - 3rd,4th - 8th,9th - 12th\nHI,abc,0,3,4,5"));
  assert.equal(bad.errors.length, 2);
});
test("matrix validation: codes in one row only, exactly one Regular Education row", () => {
  const rows = parseAdorMatrix(parseCsv(ADOR_CSV)).rows;
  const dup = rows.map((r) => (r.rowLabel === "VI" ? { ...r, codes: ["VI", "HI"] } : r));
  assert.ok(checkMatrix(dup).errors.some((e) => e.includes("HI appears in two rows")));
  assert.ok(checkMatrix(rows.filter((r) => !r.isRegularEducation)).errors.some((e) => /no Regular Education/.test(e)));
  assert.deepEqual(checkMatrix(rows, ["SID-SC", "OIR"]).warnings, []);
});
test("school year from ADOR's file name", () => {
  assert.equal(schoolYearFromFileName("FY2026-2027_DD_Scholarship_Payment_Matrix.csv"), "2026/2027");
  assert.equal(schoolYearFromFileName("FY 2027-28 matrix.xlsx"), "2027/2028");
  assert.equal(schoolYearFromFileName("FY2028.xlsx"), "2027/2028");
  assert.equal(schoolYearFromFileName("matrix.csv"), null);
});
test("cap lookup: code row, Regular Education, blank cell blocks with a message", () => {
  const rows = parseAdorMatrix(parseCsv(ADOR_CSV)).rows;
  assert.equal(rateFor(rows, "SLD", "4_8").amount, 6806.27);
  assert.equal(rateFor(rows, "REG", "k").amount, 2952.51);
  assert.equal(rateFor(rows, "PSD", "preschool").amount, 11840.55);
  const blank = rateFor(rows, "SLI", "preschool");
  assert.equal(blank.amount, null);
  assert.equal(blank.problem, "No state aid rate for SLI in Preschool: check the category.");
  assert.match(rateFor(rows, "TBI", "1_3").problem ?? "", /No state aid rate for TBI in 1st - 3rd/);
  assert.match(rateFor(rows, "HI", null).problem ?? "", /grade/);
  // Preschool categories become Regular Education at kindergarten, with a MET check.
  const k = capCategory({ grade: "Kindergarten", verifiedCategory: "P", verifiedDocumentType: "IEP", disabled: true, displaced: false });
  assert.deepEqual(k, { category: "REG", needsMetCheck: true });
});
test("year-over-year changes over 15% are flagged", () => {
  const next = parseAdorMatrix(parseCsv(ADOR_CSV)).rows;
  const prior = next.map((r) => (r.rowLabel === "HI" ? { ...r, amounts: { ...r.amounts, k: 10000 } } : r));
  const changes = compareMatrices(prior, next);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].band, "k");
  assert.equal(changes[0].flagged, true);
  assert.equal(compareMatrices(next, next).length, 0);
});

test("decision records: financial need first and on by default; one review; round optional", () => {
  const empty = normalizeDecision({});
  assert.equal(empty.factors.financialNeed, true);
  assert.equal(normalizeDecision({ factors: { financialNeed: false } }).factors.financialNeed, false);
  const committee = { round: "", meetingDate: "2026-10-20", vote: "4-0", recusals: [] };
  assert.match(decisionApprovalError({ reviewed: false, committee }) ?? "", /reviewed/);
  assert.equal(decisionApprovalError({ reviewed: true, committee }), null);
  assert.match(decisionApprovalError({ reviewed: true, committee: { ...committee, vote: "" } }) ?? "", /vote/);
  assert.match(decisionApprovalError({ reviewed: true, committee: { ...committee, recusals: [{ member: "A", reason: "" }] } }) ?? "", /recusal/);
  assert.equal(roundOrDefault(committee), "Committee 2026-10-20");
  assert.equal(roundOrDefault({ ...committee, round: "Fall" }), "Fall");
});
test("award card status", () => {
  const card = { reversed: false, stage: "awarded" as const, awarded: 1000, sent: 0, esaActive: false };
  assert.equal(awardCardStatus(card), "Awarded");
  assert.equal(awardCardStatus({ ...card, stage: "reviewed" }), "Reviewed");
  assert.equal(awardCardStatus({ ...card, stage: "approved" }), "Approved");
  assert.equal(awardCardStatus({ ...card, stage: "approved", esaActive: true }), "Held: active ESA");
  assert.equal(awardCardStatus({ ...card, stage: "approved", sent: 1000 }), "Sent to school");
  assert.equal(awardCardStatus({ ...card, reversed: true }), "Reversed");
});
test("a blank matrix cell blocks disabled/displaced payment with its message, never a $0 cap", () => {
  const ctx = { ...base, fundingSource: "corporate_disabled_displaced" as const, ddMatrixLoaded: true, ddCap: null };
  assert.equal(
    disbursementError({ ...ctx, ddProblem: "No state aid rate for SLI in Preschool: check the category." }),
    "No state aid rate for SLI in Preschool: check the category.",
  );
});

console.log(`allocation rules: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
