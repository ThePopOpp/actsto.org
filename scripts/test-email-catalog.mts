/**
 * Tests for the email catalogue and the preference gate.
 *
 * Run with: npm run test:email
 *
 * The gate is the reason this file exists. Every other bug in an email system is
 * cosmetic; sending to someone who opted out is a complaint, and in the wrong
 * jurisdiction a fine. The decision logic is pure so it can be tested exactly,
 * and these cases pin down each branch of it.
 */

import assert from "node:assert/strict";

const {
  EMAIL_CATALOG,
  EMAIL_PREFERENCE_GROUPS,
  EMAIL_CATEGORY_LABELS,
  getCatalogEntry,
  isRequiredEmail,
} = await import("@/lib/email/catalog");
const { decideCatalogSend, DEFAULT_EMAIL_PREFERENCES } = await import("@/lib/email/preference-rules");
const { buildCampaignClosingEmail, buildGoalMilestoneEmail, buildDonationReceivedEmail, buildFeaturedCampaignsEmail, buildNewCampaignEmail, buildToolSpotlightEmail, SAMPLE_CAMPAIGN, SAMPLE_FEATURED } =
  await import("@/lib/email/templates/campaign-emails");

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

const allOff = {
  ...DEFAULT_EMAIL_PREFERENCES,
  marketingEmailEnabled: false,
  donationUpdatesEnabled: false,
  campaignUpdatesEnabled: false,
  campaignAlertsEnabled: false,
  featuredCampaignsEnabled: false,
  productUpdatesEnabled: false,
  scholarshipUpdatesEnabled: false,
};

// ── Catalogue shape ──────────────────────────────────────────────────────────

console.log("catalogue");

test("keys are unique", () => {
  const keys = EMAIL_CATALOG.map((e) => e.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate catalogue key");
});

test("every entry names a trigger and an audience", () => {
  for (const entry of EMAIL_CATALOG) {
    assert.ok(entry.trigger.length > 0, `${entry.key} has no trigger`);
    assert.ok(entry.audience.length > 0, `${entry.key} has no audience`);
    assert.ok(entry.description.length > 0, `${entry.key} has no description`);
    assert.ok(EMAIL_CATEGORY_LABELS[entry.category], `${entry.key} has an unknown category`);
  }
});

test("every optional email's preference has a switch users can see", () => {
  const shown = new Set(EMAIL_PREFERENCE_GROUPS.map((g) => g.key));
  for (const entry of EMAIL_CATALOG) {
    if (entry.preference === null) continue;
    assert.ok(
      shown.has(entry.preference),
      `${entry.key} is gated on "${entry.preference}", which has no switch in the settings UI — it would be unturnoffable in practice`,
    );
  }
});

test("every switch controls at least one email", () => {
  for (const group of EMAIL_PREFERENCE_GROUPS) {
    const controls = EMAIL_CATALOG.filter((e) => e.preference === group.key);
    assert.ok(controls.length > 0, `"${group.label}" controls nothing — a switch that does nothing`);
  }
});

test("receipts and account mail are required", () => {
  for (const key of [
    "donation_receipt",
    "password_reset",
    "email_verification",
    "campaign_approved",
    "scholarship_awarded",
  ]) {
    assert.ok(getCatalogEntry(key), `${key} is missing from the catalogue`);
    assert.ok(isRequiredEmail(key), `${key} must not be suppressible by a preference`);
  }
});

test("nothing marketing-shaped is marked required", () => {
  for (const entry of EMAIL_CATALOG) {
    if (entry.category !== "marketing") continue;
    assert.notEqual(
      entry.preference,
      null,
      `${entry.key} is marketing and must be opt-out-able`,
    );
  }
});

// ── The gate ─────────────────────────────────────────────────────────────────

console.log("preference gate");

test("required mail sends even with everything switched off", () => {
  const off = { ...allOff, emailOptIn: false };
  const decision = decideCatalogSend("donation_receipt", off);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "required");
});

test("a global opt-out stops optional mail", () => {
  const decision = decideCatalogSend("featured_campaigns_digest", {
    ...DEFAULT_EMAIL_PREFERENCES,
    emailOptIn: false,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "global-opt-out");
});

test("a category switch stops just that category", () => {
  const prefs = { ...DEFAULT_EMAIL_PREFERENCES, featuredCampaignsEnabled: false };
  assert.equal(decideCatalogSend("featured_campaigns_digest", prefs).allowed, false);
  assert.equal(decideCatalogSend("campaign_goal_milestone", prefs).allowed, true);
});

test("an unknown event fails closed", () => {
  const decision = decideCatalogSend("not_a_real_event", DEFAULT_EMAIL_PREFERENCES);
  assert.equal(decision.allowed, false, "a typo'd key must not send to everyone");
  assert.equal(decision.reason, "unknown-event");
});

test("no stored preferences falls back to the defaults", () => {
  // Marketing is off by default, so it must not send; campaign alerts are on.
  assert.equal(decideCatalogSend("donor_impact_recap", null).allowed, false);
  assert.equal(decideCatalogSend("campaign_goal_milestone", null).allowed, true);
});

test("every catalogue entry produces a decision", () => {
  for (const entry of EMAIL_CATALOG) {
    const decision = decideCatalogSend(entry.key, DEFAULT_EMAIL_PREFERENCES);
    assert.notEqual(decision.reason, "unknown-event", `${entry.key} was not recognised`);
  }
});

// ── Rendering ────────────────────────────────────────────────────────────────

console.log("rendering");

const BUILDERS: [string, () => { subject: string; html: string; text: string }][] = [
  ["closing/1-week", () => buildCampaignClosingEmail({ window: "1-week", audience: "owner", firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN })],
  ["closing/30-days", () => buildCampaignClosingEmail({ window: "30-days", audience: "supporter", firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN })],
  ["milestone/50", () => buildGoalMilestoneEmail({ milestone: 50, firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN })],
  ["milestone/100", () => buildGoalMilestoneEmail({ milestone: 100, firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN })],
  ["donation-received", () => buildDonationReceivedEmail({ firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN, amount: 250, donorName: "Marcus Bell" })],
  ["new-campaign", () => buildNewCampaignEmail({ firstName: "Jeremy", campaign: SAMPLE_CAMPAIGN, excerpt: "An excerpt." })],
  ["featured", () => buildFeaturedCampaignsEmail({ firstName: "Jeremy", campaigns: SAMPLE_FEATURED })],
  ["tool-spotlight", () => buildToolSpotlightEmail({ firstName: "Jeremy", toolName: "Marketing", summary: "Does a thing.", howItWorks: [{ title: "One", body: "Do it." }], ctaUrl: "https://actsto.org" })],
];

test("every builder produces a subject, html and text", () => {
  for (const [name, build] of BUILDERS) {
    const email = build();
    assert.ok(email.subject.length > 0, `${name} has no subject`);
    assert.ok(email.html.includes("<!doctype html>"), `${name} is not a complete document`);
    assert.ok(email.text.length > 0, `${name} has no plain-text alternative`);
  }
});

test("every email carries the branded shell", () => {
  for (const [name, build] of BUILDERS) {
    const { html } = build();
    // Masthead, hero and footer come from the shared layout. An email that
    // renders without them means a builder has bypassed renderEmailLayout.
    assert.ok(html.includes("actsto"), `${name} is missing the masthead`);
    assert.ok(/<h1[^>]*>/.test(html), `${name} is missing the hero title`);
    assert.ok(html.includes("Arizona Christian Tuition"), `${name} is missing the signature`);
  }
});

test("the greeting uses the recipient's name", () => {
  const { html } = buildGoalMilestoneEmail({
    milestone: 50,
    firstName: "Sarah",
    campaign: SAMPLE_CAMPAIGN,
  });
  assert.ok(html.includes("Hello Sarah,"), "greeting did not personalise");
});

test("a missing name degrades to a usable greeting", () => {
  const { html } = buildGoalMilestoneEmail({
    milestone: 50,
    firstName: null,
    campaign: SAMPLE_CAMPAIGN,
  });
  assert.ok(html.includes("Hello there,"), "greeting broke without a name");
  assert.ok(!html.includes("Hello ,"), "rendered an empty greeting");
});

test("a campaign title containing markup is escaped", () => {
  const { html } = buildGoalMilestoneEmail({
    milestone: 50,
    firstName: "Sarah",
    campaign: { ...SAMPLE_CAMPAIGN, title: '<script>alert("x")</script>' },
  });
  assert.ok(!html.includes("<script>"), "raw script tag reached the email");
  assert.ok(html.includes("&lt;script&gt;"), "title was not escaped");
});

test("a zero goal doesn't render NaN", () => {
  const { html } = buildCampaignClosingEmail({
    window: "1-week",
    audience: "owner",
    firstName: "Sarah",
    campaign: { ...SAMPLE_CAMPAIGN, goal: 0, raised: 0 },
  });
  assert.ok(!html.includes("NaN"), "a campaign with no goal rendered NaN");
});

test("a campaign with no photo renders no image tag", () => {
  const { html } = buildNewCampaignEmail({
    firstName: "Sarah",
    campaign: { ...SAMPLE_CAMPAIGN, imageUrl: null },
    excerpt: "An excerpt.",
  });
  // The masthead logo is an <img>; there should be exactly that one and no
  // featured image with an empty src.
  assert.ok(!html.includes('src=""'), "rendered an image with an empty src");
});

test("optional emails tell the reader why they got it", () => {
  const { html } = buildFeaturedCampaignsEmail({ firstName: "Sarah", campaigns: SAMPLE_FEATURED });
  assert.ok(
    html.toLowerCase().includes("receiving this because"),
    "an optional email must say why it was sent",
  );
});

// ── The shell ────────────────────────────────────────────────────────────────

console.log("layout shell");

const { renderEmailLayout } = await import("@/lib/email/templates/layout");

test("the shell renders every section of the agreed layout", () => {
  const html = renderEmailLayout({
    preheader: "Preview line",
    eyebrow: "Welcome",
    title: "Hero title",
    subtitle: "Hero subtitle",
    featuredImageUrl: "https://example.com/photo.jpg",
    featuredImageAlt: "A photo",
    firstName: "Sarah",
    bodyHtml: "<p>Body content.</p>",
    cta: { label: "Open your dashboard", url: "https://actsto.org/dashboard" },
    reason: "You're receiving this because you have an account.",
    showUnsubscribe: true,
  });

  // Nav bar with logo → hero (eyebrow, title, subtitle) → featured photo →
  // greeting → body → CTA → signature → footer → sub-footer.
  assert.ok(html.includes("act-favicon.png"), "no logo in the masthead");
  assert.ok(html.includes("Welcome"), "no eyebrow");
  assert.ok(html.includes("Hero title"), "no hero title");
  assert.ok(html.includes("Hero subtitle"), "no hero subtitle");
  assert.ok(html.includes("https://example.com/photo.jpg"), "no featured photo");
  assert.ok(html.includes("Hello Sarah,"), "no personalised greeting");
  assert.ok(html.includes("Body content."), "no body");
  assert.ok(html.includes("Open your dashboard"), "no call to action");
  assert.ok(html.includes("Arizona Christian Tuition"), "no signature");
  assert.ok(html.includes("Preview line"), "no preheader");
});

test("the featured photo is omitted rather than left broken", () => {
  const html = renderEmailLayout({
    preheader: "x",
    title: "Hero",
    firstName: "Sarah",
    bodyHtml: "<p>Body.</p>",
    featuredImageUrl: null,
  });
  assert.ok(!html.includes('src=""'), "rendered an image with an empty src");
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
