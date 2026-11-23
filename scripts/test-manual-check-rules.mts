/**
 * Unit tests for check (offline) donations recorded by a Super Admin.
 *
 * Run with: npm run test:checks
 *
 * Pins down the rules from docs/scott-spaulding/ACTSTO-manual-check-donations-spec.md
 * that don't need a database: the Jan 1 to Apr 15 tax-year window and its
 * date edge cases (spec 12), required fields, funds by donor type, split gifts
 * that must add up exactly, the business "never a student" rule, the
 * relationship acknowledgment, and how a check shows where a PayPal id would.
 * Plain tsx script; exits non-zero on failure.
 */

import assert from "node:assert/strict";

const { normalizeManualCheck, taxYearChoice, inPriorYearWindow, splitRemaining, parseUsd } = await import(
  "@/lib/donations/manual-check-rules"
);
const { paymentReference, paymentMethodLabel } = await import("@/lib/donations/payment-methods");

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

const TODAY = "2027-05-01";
const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

const individual = {
  donorType: "individual",
  firstName: "Jane",
  lastName: "Donor",
  addressLine1: "1 Main St",
  city: "Phoenix",
  state: "az",
  zip: "85001",
  email: "jane@example.com",
  amount: "1500.00",
  method: "check",
  checkNumber: "1234",
  checkDate: "2026-11-20",
  dateReceived: "2026-11-22",
  splits: [{ fundingSource: "individual_original", amount: "1500" }],
  taxYear: 2026,
  filingStatus: "single",
};

const business = {
  donorType: "business",
  businessName: "Acme LLC",
  ein: "123456789",
  contactFirstName: "Pat",
  contactLastName: "Owner",
  addressLine1: "9 Commerce Way",
  city: "Mesa",
  state: "AZ",
  zip: "85201",
  amount: "10000",
  method: "check",
  checkNumber: "5001",
  checkDate: "2026-10-01",
  dateReceived: "2026-10-03",
  splits: [{ fundingSource: "corporate_low_income", amount: "10000" }],
  taxYear: 2026,
};

function ok(input: Record<string, unknown>) {
  const r = normalizeManualCheck(input, TODAY);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r;
}
function bad(input: Record<string, unknown>, field?: string) {
  const r = normalizeManualCheck(input, TODAY);
  assert.equal(r.ok, false, "expected a validation error");
  if (!r.ok && field) assert.equal(r.field, field, r.error);
  return r;
}

// ── Tax year window (spec 5.7, test plan 12) ─────────────────────────────────

test("Jan 1 and Apr 15 are inside the prior-year window; Apr 16 and Dec 31 are not", () => {
  assert.equal(inPriorYearWindow("2027-01-01"), true);
  assert.equal(inPriorYearWindow("2027-04-15"), true);
  assert.equal(inPriorYearWindow("2027-04-16"), false);
  assert.equal(inPriorYearWindow("2026-12-31"), false);
});
test("a check dated Dec 31 and received Jan 3 defaults to the check's year but requires a choice", () => {
  const c = taxYearChoice("2026-12-31", "2027-01-03");
  assert.equal(c.defaultYear, 2026);
  assert.equal(c.choiceRequired, true);
  assert.deepEqual(c.options, [2026, 2027]);
});
test("a check dated Jan 2 offers the prior and current year", () => {
  const c = taxYearChoice("2027-01-02", "2027-01-05");
  assert.equal(c.defaultYear, 2027);
  assert.equal(c.choiceRequired, true);
  assert.deepEqual(c.options, [2026, 2027]);
});
test("Apr 15 requires a choice; Apr 16 doesn't", () => {
  assert.equal(taxYearChoice("2027-04-15", "2027-04-20").choiceRequired, true);
  const late = taxYearChoice("2027-04-16", "2027-04-20");
  assert.equal(late.choiceRequired, false);
  assert.equal(late.defaultYear, 2027);
});
test("without a check date the default follows the date received", () => {
  assert.equal(taxYearChoice(null, "2026-08-01").defaultYear, 2026);
});
test("in the window, saving without an explicit tax year choice is refused", () => {
  bad({ ...individual, checkDate: "2027-02-01", dateReceived: "2027-02-03", taxYear: 2027 }, "taxYear");
  ok({ ...individual, checkDate: "2027-02-01", dateReceived: "2027-02-03", taxYear: 2026, taxYearConfirmed: true });
});
test("in the window, only the prior or current year is accepted", () => {
  bad({ ...individual, checkDate: "2027-02-01", dateReceived: "2027-02-03", taxYear: 2025, taxYearConfirmed: true }, "taxYear");
});
test("outside the window the tax year stays editable but near the check's year", () => {
  ok({ ...individual, taxYear: 2027 });
  bad({ ...individual, taxYear: 2029 }, "taxYear");
  bad({ ...individual, taxYear: "" }, "taxYear");
});

// ── Required fields ──────────────────────────────────────────────────────────

test("a complete individual check is valid and normalized", () => {
  const r = ok(individual);
  assert.equal(r.value.state, "AZ");
  assert.equal(r.value.amount, 1500);
  assert.equal(r.value.emailReceipt, false);
  assert.equal(r.warnings.length, 0);
});
test("donor name, address, ZIP and filing status are required for an individual", () => {
  bad({ ...individual, lastName: "" }, "firstName");
  bad({ ...individual, city: "" }, "addressLine1");
  bad({ ...individual, zip: "8500" }, "zip");
  bad({ ...individual, filingStatus: undefined }, "filingStatus");
});
test("no email is allowed with a warning, and the receipt is never emailed", () => {
  const r = ok({ ...individual, email: "", emailReceipt: true });
  assert.equal(r.value.emailReceipt, false);
  assert.match(r.warnings[0], /download or print/);
});
test("a check number is required for a check and a cashier's check, optional for a money order", () => {
  bad({ ...individual, checkNumber: "" }, "checkNumber");
  bad({ ...individual, method: "cashiers_check", checkNumber: "" }, "checkNumber");
  ok({ ...individual, method: "money_order", checkNumber: "" });
  bad({ ...individual, method: "paypal" }, "method");
});
test("the date received can't be in the future, and deposit can't precede receipt", () => {
  bad({ ...individual, dateReceived: "2027-05-02" }, "dateReceived");
  bad({ ...individual, dateDeposited: "2026-11-21" }, "dateDeposited");
  bad({ ...individual, dateReceived: "2026-02-30" }, "dateReceived");
});
test("amounts are positive with at most two decimals", () => {
  bad({ ...individual, amount: "0" }, "amount");
  bad({ ...individual, amount: "12.345" }, "amount");
  assert.equal(parseUsd("$1,500.50"), 1500.5);
});
test("over $100,000 needs a confirmation", () => {
  const big = { ...individual, amount: "150000", splits: [{ fundingSource: "individual_overflow", amount: "150000" }] };
  const r = bad(big, "amount");
  assert.equal(!r.ok && r.needsConfirm, "large_amount");
  ok({ ...big, confirmLargeAmount: true });
});

// ── Funds and split gifts (spec 5.4) ─────────────────────────────────────────

test("a funding source is required", () => {
  bad({ ...individual, splits: [] }, "splits");
});
test("a split must add up to the check exactly", () => {
  bad({ ...individual, splits: [{ fundingSource: "individual_original", amount: "1000" }, { fundingSource: "individual_overflow", amount: "499.99" }] }, "splits");
  bad({ ...individual, splits: [{ fundingSource: "individual_original", amount: "1000" }, { fundingSource: "individual_overflow", amount: "600" }] }, "splits");
  const r = ok({ ...individual, splits: [{ fundingSource: "individual_original", amount: "1000" }, { fundingSource: "individual_overflow", amount: "500" }] });
  assert.equal(r.value.splits.length, 2);
});
test("the $22,000 example split (Original, Overflow, Unrestricted) is accepted", () => {
  ok({
    ...individual,
    amount: "22000",
    splits: [
      { fundingSource: "individual_original", amount: "1570" },
      { fundingSource: "individual_overflow", amount: "1561" },
      { fundingSource: "unrestricted", amount: "18869" },
    ],
  });
});
test("remaining shows what is left to assign", () => {
  assert.equal(splitRemaining(1500, [{ fundingSource: "individual_original", amount: "1000" }]), 500);
});
test("individuals can't use corporate funds and businesses can't use individual funds", () => {
  bad({ ...individual, splits: [{ fundingSource: "corporate_low_income", amount: "1500" }] }, "splits");
  bad({ ...business, splits: [{ fundingSource: "individual_original", amount: "10000" }] }, "splits");
  bad({ ...business, splits: [{ fundingSource: "corporate_other", amount: "10000" }] }, "splits");
});

// ── Business (spec 5.5, 7.3) ─────────────────────────────────────────────────

test("a business check needs legal name, 9-digit EIN and a contact name", () => {
  const r = ok(business);
  assert.equal(r.value.ein, "12-3456789");
  assert.equal(r.value.filingStatus, null);
  bad({ ...business, ein: "12345" }, "ein");
  bad({ ...business, businessName: "" }, "businessName");
  bad({ ...business, contactLastName: "" }, "contactFirstName");
});
test("a business check can recommend a school but never a student", () => {
  ok({ ...business, schoolId: UUID_A });
  bad({ ...business, campaignId: UUID_A, studentIds: [UUID_B] }, "studentIds");
});

// ── Individual recommendations ───────────────────────────────────────────────

test("recommending a student needs the relationship acknowledgment and how it was given", () => {
  const rec = { ...individual, campaignId: UUID_A, studentIds: [UUID_B] };
  bad(rec, "relationshipAck");
  bad({ ...rec, relationshipAck: true }, "relationshipAck");
  const r = ok({ ...rec, relationshipAck: true, relationshipAckMethod: "staff_attested" });
  assert.equal(r.value.relationshipAck, true);
});
test("students need a campaign", () => {
  bad({ ...individual, studentIds: [UUID_B], relationshipAck: true, relationshipAckMethod: "paper_form" }, "campaignId");
});
test("SMS consent is never set from this form and public display defaults off", () => {
  const r = ok(individual);
  assert.equal(r.value.showNamePublicly, false);
  assert.equal("smsConsent" in r.value, false);
});

// ── Display ──────────────────────────────────────────────────────────────────

test("a check shows as Check #number where a PayPal id would", () => {
  assert.equal(paymentReference({ paymentProvider: "check", checkNumber: "1234" }), "Check #1234");
  assert.equal(paymentReference({ paymentProvider: "money_order", checkNumber: null }), "Money order");
  assert.equal(paymentReference({ paymentProvider: "paypal", paymentProviderCaptureId: "CAP1", paymentProviderOrderId: "ORD1" }), "CAP1");
  assert.equal(paymentMethodLabel("cashiers_check"), "Cashier's check");
});

console.log(`manual check rules: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
