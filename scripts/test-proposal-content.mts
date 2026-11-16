/**
 * Unit tests for the Musk Scholars Fund proposal content and email.
 *
 * Run with: npm run test:proposal
 *
 * The same words and numbers feed the landing page, email, one-pager, deck and
 * X card, so the shared pieces are pinned here: the impact math, the signer
 * (never a "[Your name]" placeholder), an email mail clients can render
 * (tables, no flexbox or grid), and the link token's shape.
 */

import assert from "node:assert/strict";

const content = await import("@/lib/proposals/musk-scholars-fund/content");
const { buildProposalEmail, DEFAULT_SUBJECT } = await import("@/lib/proposals/musk-scholars-fund/email");
const { impactRows, missingSignerFields, signerLine, signerContact, TOKEN_PATTERN, EMPTY_SIGNER, NOT_AN_ENDORSEMENT } = content;

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

const signer = { name: "Jane Sample", title: "Executive Director", phone: "(602) 555-0100", email: "jane@example.org" };
const LANDING = "https://actsto.org/p/AbCdEfGhIjKlMnOp";

test("impact is gift ÷ $4,000, with $5M marked as proposed", () => {
  const rows = impactRows();
  assert.deepEqual(
    rows.map((r) => [r.label, r.studentYears, r.proposed]),
    [
      ["$1M", 250, false],
      ["$5M", 1250, true],
      ["$25M", 6250, false],
      ["$100M", 25000, false],
    ],
  );
  assert.equal(impactRows(5000)[1].studentYears, 1000);
});

test("signer lines leave blanks out instead of printing placeholders", () => {
  assert.equal(signerLine(signer), "Jane Sample, Executive Director");
  assert.equal(signerLine({ ...EMPTY_SIGNER, name: "Jane" }), "Jane");
  assert.equal(signerLine(EMPTY_SIGNER), "");
  assert.equal(signerContact({ ...EMPTY_SIGNER, phone: "555" }), "Arizona Christian Tuition · 555");
  assert.deepEqual(missingSignerFields({ ...signer, phone: " " }), ["phone"]);
});

test("the email carries the signer, the link, the ask and the not-an-endorsement line", () => {
  const { subject, html, text } = buildProposalEmail({ signer, landingUrl: LANDING, siteUrl: "https://actsto.org" });
  assert.equal(subject, DEFAULT_SUBJECT);
  for (const s of [html, text]) {
    assert.ok(s.includes("Jane Sample"));
    assert.ok(s.includes(LANDING));
    assert.ok(s.includes("$5M founding gift"));
    assert.ok(s.includes("1,250"));
    assert.ok(!/\[(Your name|Title|phone)\]/i.test(s), "placeholder left in");
  }
  assert.ok(html.includes(NOT_AN_ENDORSEMENT));
  assert.ok(html.includes("https://actsto.org/actsto-logo-light.png"));
  assert.ok(html.includes("mailto:jane@example.org"));
});

test("the email uses tables, not flexbox or grid (mail clients drop them)", () => {
  const { html } = buildProposalEmail({ signer, landingUrl: LANDING, siteUrl: "https://actsto.org" });
  assert.ok(!/display:\s*(flex|grid)/i.test(html));
  assert.ok(html.includes('role="presentation"'));
});

test("with the link off there's no proposal button, and the call button falls back to the contact page", () => {
  const { html } = buildProposalEmail({ signer: EMPTY_SIGNER, landingUrl: null, siteUrl: "https://actsto.org" });
  assert.ok(!html.includes("View the full proposal"));
  assert.ok(html.includes("https://actsto.org/contact"));
});

test("subject is editable, and HTML in it is escaped", () => {
  const { subject, html } = buildProposalEmail({ signer, landingUrl: LANDING, siteUrl: "https://actsto.org", subject: "Hi <b>there</b>" });
  assert.equal(subject, "Hi <b>there</b>");
  assert.ok(html.includes("<title>Hi &lt;b&gt;there&lt;/b&gt;</title>"));
});

test("link tokens are 16 URL-safe characters", () => {
  assert.ok(TOKEN_PATTERN.test("AbCdEfGhIjKl-_09"));
  assert.ok(!TOKEN_PATTERN.test("preview"));
  assert.ok(!TOKEN_PATTERN.test("AbCdEfGhIjKl/_09"));
});

test("no non-breaking hyphens: the render fonts have no glyph for them", () => {
  const all = JSON.stringify(content);
  assert.ok(!all.includes("‑"));
});

console.log(`proposal content: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
