/**
 * Unit tests for the household income maths.
 *
 * Run with: npm run test:income
 *
 * These numbers end up on a tax-credit scholarship determination, so the
 * annualization is worth pinning down rather than eyeballing. No test runner is
 * installed in this repo; this is a plain tsx script that exits non-zero on
 * failure so CI can gate on it.
 */

import assert from "node:assert/strict";

import type { HouseholdMemberInput } from "@/lib/scholarship/income";

// Dynamic import so Node's ESM loader resolves the named exports after tsx has
// transformed the module — the same pattern generate-legal-default-html.mts uses.
const {
  buildIncomeSnapshot,
  categoryAnnual,
  formatCurrency,
  householdAnnualTotal,
  initialsOf,
  isIncomeFrequency,
  memberAnnualTotal,
  readIncomeSnapshot,
  toAnnual,
} = await import("@/lib/scholarship/income");

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

function member(overrides: Partial<HouseholdMemberInput> = {}): HouseholdMemberInput {
  return {
    fullName: "Test Person",
    roleLabel: null,
    workAmount: 0,
    workFrequency: "annually",
    supportAmount: 0,
    supportFrequency: "annually",
    retirementAmount: 0,
    retirementFrequency: "annually",
    otherAmount: 0,
    otherFrequency: "annually",
    ...overrides,
  };
}

console.log("toAnnual");

test("annually is unchanged", () => {
  assert.equal(toAnnual(52000, "annually"), 52000);
});

test("monthly multiplies by 12", () => {
  assert.equal(toAnnual(1000, "monthly"), 12000);
});

test("semimonthly multiplies by 24", () => {
  assert.equal(toAnnual(1000, "semimonthly"), 24000);
});

test("biweekly multiplies by 26", () => {
  assert.equal(toAnnual(1000, "biweekly"), 26000);
});

test("weekly multiplies by 52", () => {
  assert.equal(toAnnual(1000, "weekly"), 52000);
});

test("biweekly and semimonthly are not the same", () => {
  // 26 paychecks a year is not 24. Conflating them overstates or understates
  // household income by two pay periods, which can move an award.
  assert.notEqual(toAnnual(2000, "biweekly"), toAnnual(2000, "semimonthly"));
  assert.equal(toAnnual(2000, "biweekly") - toAnnual(2000, "semimonthly"), 4000);
});

test("rounds to whole dollars", () => {
  assert.equal(toAnnual(1234.567, "monthly"), 14815);
});

test("zero is zero, not NaN", () => {
  assert.equal(toAnnual(0, "weekly"), 0);
});

test("negative amounts floor at zero rather than subtracting income", () => {
  assert.equal(toAnnual(-500, "monthly"), 0);
});

test("NaN and Infinity do not leak into a total", () => {
  assert.equal(toAnnual(Number.NaN, "monthly"), 0);
  assert.equal(toAnnual(Number.POSITIVE_INFINITY, "monthly"), 0);
});

console.log("member and household totals");

test("a member with all-zero income totals zero", () => {
  assert.equal(memberAnnualTotal(member()), 0);
});

test("categories sum across mixed frequencies", () => {
  const m = member({
    workAmount: 2400,
    workFrequency: "monthly", // 28,800
    supportAmount: 200,
    supportFrequency: "weekly", // 10,400
    retirementAmount: 1500,
    retirementFrequency: "annually", // 1,500
    otherAmount: 100,
    otherFrequency: "biweekly", // 2,600
  });
  assert.equal(categoryAnnual(m, "work"), 28800);
  assert.equal(categoryAnnual(m, "support"), 10400);
  assert.equal(categoryAnnual(m, "retirement"), 1500);
  assert.equal(categoryAnnual(m, "other"), 2600);
  assert.equal(memberAnnualTotal(m), 43300);
});

test("household total sums every member, including zero-income ones", () => {
  const members = [
    member({ fullName: "Earner", workAmount: 60000, workFrequency: "annually" }),
    member({ fullName: "Child" }),
    member({ fullName: "Retired", retirementAmount: 1200, retirementFrequency: "monthly" }),
  ];
  assert.equal(householdAnnualTotal(members), 60000 + 0 + 14400);
});

test("an empty household totals zero", () => {
  assert.equal(householdAnnualTotal([]), 0);
});

console.log("income snapshot");

test("snapshot preserves the amount and frequency as entered", () => {
  const members = [
    member({ fullName: "Marcus Ellison", roleLabel: "Parent", workAmount: 5700, workFrequency: "monthly" }),
  ];
  const snap = buildIncomeSnapshot(members, new Date("2026-08-03T18:04:00Z"));

  assert.equal(snap.captured_at, "2026-08-03T18:04:00.000Z");
  assert.equal(snap.member_count, 1);
  assert.equal(snap.annual_total, 68400);
  assert.equal(snap.members[0].full_name, "Marcus Ellison");
  assert.equal(snap.members[0].role_label, "Parent");
  // The parent's own figure survives, not only the annualized one.
  assert.equal(snap.members[0].work.amount, 5700);
  assert.equal(snap.members[0].work.frequency, "monthly");
  assert.equal(snap.members[0].work.annual, 68400);
});

test("snapshot total matches the live total for the same members", () => {
  const members = [
    member({ fullName: "A", workAmount: 1000, workFrequency: "weekly" }),
    member({ fullName: "B", otherAmount: 300, otherFrequency: "biweekly" }),
  ];
  assert.equal(buildIncomeSnapshot(members).annual_total, householdAnnualTotal(members));
});

test("a snapshot is a frozen copy — later edits do not reach it", () => {
  const members = [member({ fullName: "A", workAmount: 1000, workFrequency: "monthly" })];
  const snap = buildIncomeSnapshot(members);
  members[0].workAmount = 9999;
  members.push(member({ fullName: "B" }));

  assert.equal(snap.annual_total, 12000);
  assert.equal(snap.member_count, 1);
});

test("readIncomeSnapshot rejects anything that is not a snapshot", () => {
  assert.equal(readIncomeSnapshot(null), null);
  assert.equal(readIncomeSnapshot("nope"), null);
  assert.equal(readIncomeSnapshot({}), null);
  assert.equal(readIncomeSnapshot({ members: [], annual_total: "0" }), null);
  assert.notEqual(readIncomeSnapshot({ members: [], annual_total: 0 }), null);
});

console.log("formatting");

test("currency has no cents by default", () => {
  assert.equal(formatCurrency(214600), "$214,600");
  assert.equal(formatCurrency(0), "$0");
});

test("currency shows cents when asked", () => {
  assert.equal(formatCurrency(12457.5, { cents: true }), "$12,457.50");
});

test("initials handle one, two and many names", () => {
  assert.equal(initialsOf("Marcus Ellison"), "ME");
  assert.equal(initialsOf("Priya"), "PR");
  assert.equal(initialsOf("Ana Maria Ruiz Delgado"), "AD");
  assert.equal(initialsOf("   "), "?");
});

test("isIncomeFrequency rejects unknown strings", () => {
  assert.equal(isIncomeFrequency("monthly"), true);
  assert.equal(isIncomeFrequency("fortnightly"), false);
  assert.equal(isIncomeFrequency(12), false);
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
