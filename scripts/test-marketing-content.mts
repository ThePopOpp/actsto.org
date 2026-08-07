/**
 * Tests for the marketing content derivation and email rendering.
 *
 * Run with: npm run test:marketing
 *
 * Two things here are worth pinning down rather than eyeballing. First the
 * arithmetic — a campaign with no goal set must not render "NaN%" on something a
 * family is about to email their whole address book. Second the escaping: a
 * campaign title is user-supplied and ends up inside generated HTML.
 */

import assert from "node:assert/strict";

import type { Campaign } from "@/lib/campaigns";

const { buildMarketingContent, joinNames, formatMoney } = await import(
  "@/lib/marketing/campaign-content"
);
const { renderMarketingEmail, EMAIL_TEMPLATES, wrapEmailDocument } = await import(
  "@/lib/marketing/email-templates"
);
const { MARKETING_VARIANTS, getVariant, DEFAULT_VARIANT_ID } = await import(
  "@/lib/marketing/design-variants"
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

function campaignOf(overrides: Partial<Campaign> = {}): Campaign {
  return {
    slug: "test-campaign",
    title: "Test Campaign",
    tagline: "A tagline",
    excerpt: "An excerpt",
    description: "A description",
    goal: 10000,
    raised: 2500,
    donorCount: 4,
    daysLeft: 30,
    endDate: "2026-12-31",
    image: "https://example.com/photo.jpg",
    gallery: [],
    students: [
      {
        firstName: "Jace",
        lastName: "Waters",
        gradeDisplay: "5th Grade",
        school: "Valley Christian Schools",
        individualGoal: 10000,
        individualRaised: 2500,
      },
    ],
    school: { name: "Valley Christian Schools", address: "", website: "" },
    parent: { name: "The Waters Family", email: "p@example.com", phone: "" },
    ...overrides,
  } as Campaign;
}

const ORIGIN = "https://actsto.org";

// ── Content derivation ───────────────────────────────────────────────────────

console.log("content derivation");

test("derives totals, percent and remaining", () => {
  const c = buildMarketingContent(campaignOf(), ORIGIN);
  assert.equal(c.goal, 10000);
  assert.equal(c.raised, 2500);
  assert.equal(c.remaining, 7500);
  assert.equal(c.percent, 25);
});

test("a zero goal yields 0% rather than NaN", () => {
  const c = buildMarketingContent(campaignOf({ goal: 0, raised: 500 }), ORIGIN);
  assert.equal(c.percent, 0);
  assert.equal(c.remaining, 0);
  assert.ok(!Number.isNaN(c.percent));
});

test("caps percent at 100 when a campaign overshoots", () => {
  const c = buildMarketingContent(campaignOf({ goal: 1000, raised: 4000 }), ORIGIN);
  assert.equal(c.percent, 100);
  assert.equal(c.remaining, 0);
});

test("negative or missing figures clamp to zero", () => {
  const c = buildMarketingContent(campaignOf({ goal: -5, raised: -100, daysLeft: -3 }), ORIGIN);
  assert.equal(c.goal, 0);
  assert.equal(c.raised, 0);
  assert.equal(c.daysLeft, 0);
});

test("prefers a nickname over the legal first name", () => {
  const c = buildMarketingContent(
    campaignOf({
      students: [
        {
          firstName: "Jonathan",
          lastName: "Waters",
          nickname: "Jace",
          gradeDisplay: "5th Grade",
          school: "Valley Christian Schools",
          individualGoal: 0,
          individualRaised: 0,
        },
      ],
    }),
    ORIGIN,
  );
  assert.equal(c.studentFirstName, "Jace");
});

test("falls back to a usable phrase with no students", () => {
  const c = buildMarketingContent(campaignOf({ students: [] }), ORIGIN);
  assert.equal(c.studentFirstName, "our student");
  assert.equal(c.studentNames, "our student");
});

test("builds absolute campaign and donate URLs", () => {
  const c = buildMarketingContent(campaignOf(), "https://actsto.org/");
  assert.equal(c.url, "https://actsto.org/campaigns/test-campaign");
  assert.equal(c.donateUrl, "https://actsto.org/campaigns/test-campaign?give=1");
});

test("joins names for a sentence", () => {
  assert.equal(joinNames(["Jace"]), "Jace");
  assert.equal(joinNames(["Jace", "Ellie"]), "Jace and Ellie");
  assert.equal(joinNames(["Jace", "Ellie", "Sam"]), "Jace, Ellie and Sam");
  assert.equal(joinNames(["", "  "]), "");
});

test("formats money without cents", () => {
  assert.equal(formatMoney(7500), "$7,500");
  assert.equal(formatMoney(0), "$0");
  assert.equal(formatMoney(1234.6), "$1,235");
});

// ── Email rendering ──────────────────────────────────────────────────────────

console.log("email rendering");

const variant = getVariant(DEFAULT_VARIANT_ID);

test("every template renders a subject, html and text", () => {
  const content = buildMarketingContent(campaignOf(), ORIGIN);
  for (const template of EMAIL_TEMPLATES) {
    const email = renderMarketingEmail(template.id, content, variant);
    assert.ok(email.subject.length > 0, `${template.id} subject`);
    assert.ok(email.preheader.length > 0, `${template.id} preheader`);
    assert.ok(email.html.includes("<table"), `${template.id} html`);
    assert.ok(email.text.length > 0, `${template.id} text`);
  }
});

test("every template renders under every variant", () => {
  const content = buildMarketingContent(campaignOf(), ORIGIN);
  for (const v of MARKETING_VARIANTS) {
    for (const template of EMAIL_TEMPLATES) {
      const email = renderMarketingEmail(template.id, content, v);
      assert.ok(email.html.includes(v.accent), `${template.id}/${v.id} accent colour`);
    }
  }
});

test("escapes a campaign title containing markup", () => {
  const content = buildMarketingContent(
    campaignOf({ title: '<script>alert("x")</script>', tagline: "Tom & Jerry" }),
    ORIGIN,
  );
  const email = renderMarketingEmail("announcement", content, variant);
  assert.ok(!email.html.includes("<script>"), "raw script tag leaked into html");
  assert.ok(email.html.includes("&lt;script&gt;"), "title was not escaped");
  assert.ok(email.html.includes("Tom &amp; Jerry"), "ampersand was not escaped");
});

test("the donate link points at the campaign", () => {
  const content = buildMarketingContent(campaignOf(), ORIGIN);
  const email = renderMarketingEmail("final-push", content, variant);
  assert.ok(email.html.includes(content.donateUrl));
  assert.ok(email.text.includes(content.donateUrl));
});

test("progress emails state the real numbers", () => {
  const content = buildMarketingContent(campaignOf({ goal: 10000, raised: 2500 }), ORIGIN);
  const email = renderMarketingEmail("progress", content, variant);
  assert.ok(email.subject.includes("25%"));
  assert.ok(email.text.includes("$2,500"));
  assert.ok(email.text.includes("$10,000"));
});

test("a campaign with no photo still renders", () => {
  const content = buildMarketingContent(campaignOf({ image: "" }), ORIGIN);
  const email = renderMarketingEmail("announcement", content, variant);
  assert.ok(!email.html.includes("<img"), "empty src rendered an image tag");
});

test("the downloadable document is a complete html file", () => {
  const content = buildMarketingContent(campaignOf(), ORIGIN);
  const doc = wrapEmailDocument(renderMarketingEmail("thank-you", content, variant));
  assert.ok(doc.startsWith("<!doctype html>"));
  assert.ok(doc.includes("</html>"));
});

// ── Variants ─────────────────────────────────────────────────────────────────

console.log("variants");

test("getVariant falls back to the default for an unknown id", () => {
  assert.equal(getVariant("nonsense").id, DEFAULT_VARIANT_ID);
  assert.equal(getVariant(null).id, DEFAULT_VARIANT_ID);
  assert.equal(getVariant(undefined).id, DEFAULT_VARIANT_ID);
});

test("every variant carries the colours the renderers read", () => {
  for (const v of MARKETING_VARIANTS) {
    for (const key of ["canvas", "surface", "band", "bandInk", "ink", "accent", "accentInk", "line"] as const) {
      assert.match(v[key], /^#[0-9a-f]{6}$/i, `${v.id}.${key} must be a hex colour for email`);
    }
  }
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
