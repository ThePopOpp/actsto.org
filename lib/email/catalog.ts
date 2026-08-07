/**
 * Every email ACTSTO can send, in one list.
 *
 * The point of a single catalogue is that three questions have one answer each:
 * what triggers this, who is it for, and can the recipient turn it off. Those
 * answers used to live in whichever route happened to call `sendEmail`, which
 * is how an app ends up mailing someone who unsubscribed.
 *
 * `preference` is the gate. `null` means the email is required — receipts,
 * password resets, approval decisions. Everything else names the switch on
 * `communication_preferences` that has to be true before it sends. Nothing
 * should call `sendEmail` for a catalogue event without going through
 * `canSendCatalogEmail` in `lib/email/preferences.ts`.
 *
 * Client-safe: types and data only, no Prisma, no env.
 */

export type EmailCategory =
  | "transactional"
  | "campaign"
  | "donation"
  | "scholarship"
  | "product"
  | "marketing";

/**
 * The preference column that gates an email, or null when it's required.
 *
 * Kept as a union of literal column names so a typo is a compile error rather
 * than a silently-ungated send.
 */
export type EmailPreferenceKey =
  | "campaignUpdatesEnabled"
  | "campaignAlertsEnabled"
  | "donationUpdatesEnabled"
  | "scholarshipUpdatesEnabled"
  | "featuredCampaignsEnabled"
  | "productUpdatesEnabled"
  | "marketingEmailEnabled";

export type EmailAudience =
  | "all"
  | "parent"
  | "student"
  | "individual_donor"
  | "business_donor"
  | "admin";

export type EmailCatalogEntry = {
  /** Stable id. Stored on the template row; never rename one in place. */
  key: string;
  name: string;
  /** What it says, in a sentence. Shown in the admin list. */
  description: string;
  /** What causes it to send. Shown in the admin list — the most useful column. */
  trigger: string;
  category: EmailCategory;
  audience: EmailAudience[];
  /** null = required, cannot be switched off. */
  preference: EmailPreferenceKey | null;
  /** Roughly how often a given person receives it. Sets expectations in the UI. */
  cadence: "once" | "per-event" | "weekly" | "monthly" | "seasonal";
  /** Not yet wired to a trigger — the template exists, the emitter doesn't. */
  planned?: boolean;
};

export const EMAIL_CATALOG: EmailCatalogEntry[] = [
  // ── Account and access — required ─────────────────────────────────────────
  {
    key: "welcome_parent",
    name: "Welcome — Parent / Guardian",
    description: "Introduces the dashboard and the three things to do first.",
    trigger: "A parent or guardian account is created.",
    category: "transactional",
    audience: ["parent"],
    preference: null,
    cadence: "once",
  },
  {
    key: "welcome_student",
    name: "Welcome — Student",
    description: "Age-appropriate introduction; explains what a guardian controls.",
    trigger: "A student account is created.",
    category: "transactional",
    audience: ["student"],
    preference: null,
    cadence: "once",
  },
  {
    key: "welcome_individual_donor",
    name: "Welcome — Individual Donor",
    description: "Explains the Arizona tax credit and how to find a student to support.",
    trigger: "An individual donor account is created.",
    category: "transactional",
    audience: ["individual_donor"],
    preference: null,
    cadence: "once",
  },
  {
    key: "welcome_business_donor",
    name: "Welcome — Business Donor",
    description: "Corporate credit limits, EIN on file, and who to talk to.",
    trigger: "A business donor account is created.",
    category: "transactional",
    audience: ["business_donor"],
    preference: null,
    cadence: "once",
  },
  {
    key: "password_reset",
    name: "Password reset",
    description: "One-time link to set a new password.",
    trigger: "Someone requests a reset from the login page.",
    category: "transactional",
    audience: ["all"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "email_verification",
    name: "Verify your email",
    description: "Confirms the address before the account can transact.",
    trigger: "A new account is created, or the email is changed.",
    category: "transactional",
    audience: ["all"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "role_added",
    name: "New account type added",
    description: "Confirms a second role on the same login and what it unlocks.",
    trigger: "A hybrid user adds a role to their existing account.",
    category: "transactional",
    audience: ["all"],
    preference: null,
    cadence: "per-event",
  },

  // ── Campaign lifecycle ────────────────────────────────────────────────────
  {
    key: "campaign_submitted",
    name: "Campaign submitted for review",
    description: "Confirms receipt and sets the review-time expectation.",
    trigger: "A campaign is submitted for approval.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "campaign_approved",
    name: "Campaign approved — you're live",
    description: "The link, the share tools, and the first three things to do.",
    trigger: "A Super Admin approves a campaign.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "campaign_changes_requested",
    name: "Campaign needs changes",
    description: "What to fix, in plain language, with a link straight to the field.",
    trigger: "A Super Admin rejects or requests changes.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "campaign_new_live",
    name: "New campaign published",
    description: "A new student campaign is live — who they are and what they need.",
    trigger: "A campaign goes public.",
    category: "campaign",
    audience: ["individual_donor", "business_donor"],
    preference: "campaignUpdatesEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_goal_milestone",
    name: "Goal milestone reached",
    description: "Marks 25%, 50%, 75% and fully funded with the running totals.",
    trigger: "A donation pushes the campaign past a milestone.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: "campaignAlertsEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_ending_30_days",
    name: "Campaign ends in 30 days",
    description: "A month out: what's raised, what's left, and what usually helps.",
    trigger: "30 days before the campaign end date.",
    category: "campaign",
    audience: ["parent", "student", "individual_donor", "business_donor"],
    preference: "campaignAlertsEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_ending_1_week",
    name: "Campaign ends in 1 week",
    description: "The final push, with the exact gap remaining.",
    trigger: "7 days before the campaign end date.",
    category: "campaign",
    audience: ["parent", "student", "individual_donor", "business_donor"],
    preference: "campaignAlertsEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_complete_parent",
    name: "Campaign complete — Parent",
    description: "Final totals, donor count, and what happens with the funds next.",
    trigger: "A campaign reaches its end date or is fully funded.",
    category: "campaign",
    audience: ["parent"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "campaign_complete_student",
    name: "Campaign complete — Student",
    description: "The same news, written to the student.",
    trigger: "A campaign reaches its end date or is fully funded.",
    category: "campaign",
    audience: ["student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "campaign_complete_individual_donor",
    name: "Campaign complete — Individual Donor",
    description: "What their gift was part of, with the final numbers.",
    trigger: "A campaign they backed completes.",
    category: "campaign",
    audience: ["individual_donor"],
    preference: "donationUpdatesEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_complete_business_donor",
    name: "Campaign complete — Business Donor",
    description: "Outcome summary suitable for forwarding internally.",
    trigger: "A campaign they backed completes.",
    category: "campaign",
    audience: ["business_donor"],
    preference: "donationUpdatesEnabled",
    cadence: "per-event",
  },
  {
    key: "campaign_stalled",
    name: "No gifts in two weeks",
    description: "A nudge with the two or three actions that actually restart a campaign.",
    trigger: "14 days pass with no new donation on an active campaign.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: "campaignAlertsEnabled",
    cadence: "per-event",
    planned: true,
  },
  {
    key: "campaign_draft_abandoned",
    name: "Finish your campaign",
    description: "Names the steps left rather than saying 'incomplete'.",
    trigger: "A campaign draft sits untouched for 5 days.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: "campaignAlertsEnabled",
    cadence: "per-event",
    planned: true,
  },
  {
    key: "campaign_new_comment",
    name: "New comment or review",
    description: "Someone left a note on the campaign; links straight to moderation.",
    trigger: "A comment or review is posted.",
    category: "campaign",
    audience: ["parent", "student"],
    preference: "campaignUpdatesEnabled",
    cadence: "per-event",
    planned: true,
  },

  // ── Donations ─────────────────────────────────────────────────────────────
  {
    key: "donation_receipt",
    name: "Donation receipt",
    description: "The tax document. Amount, date, tax year, receipt number.",
    trigger: "A payment is verified server-side.",
    category: "donation",
    audience: ["individual_donor", "business_donor"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "donation_thank_you",
    name: "Thank you for giving",
    description: "The human note that goes with the receipt — who they helped.",
    trigger: "A payment is verified server-side.",
    category: "donation",
    audience: ["individual_donor", "business_donor"],
    preference: "donationUpdatesEnabled",
    cadence: "per-event",
  },
  {
    key: "donation_received_owner",
    name: "You received a donation",
    description: "Tells the family a gift arrived, and from whom if not anonymous.",
    trigger: "A donation to their campaign is verified.",
    category: "donation",
    audience: ["parent", "student"],
    preference: "donationUpdatesEnabled",
    cadence: "per-event",
  },
  {
    key: "donation_first_gift",
    name: "Your first gift arrived",
    description: "The one that matters most. Sent once per campaign.",
    trigger: "The first verified donation on a campaign.",
    category: "donation",
    audience: ["parent", "student"],
    preference: "donationUpdatesEnabled",
    cadence: "once",
    planned: true,
  },
  {
    key: "donation_payment_failed",
    name: "Your payment didn't go through",
    description: "What failed and how to retry. No blame, one button.",
    trigger: "A payment is declined or a webhook reports failure.",
    category: "donation",
    audience: ["individual_donor", "business_donor"],
    preference: null,
    cadence: "per-event",
    planned: true,
  },
  {
    key: "donor_year_end_summary",
    name: "Your giving this year",
    description: "Every gift in the tax year, totalled, ready for a return.",
    trigger: "Sent each January for the closing tax year.",
    category: "donation",
    audience: ["individual_donor", "business_donor"],
    preference: null,
    cadence: "seasonal",
    planned: true,
  },
  {
    key: "tax_credit_deadline",
    name: "Arizona tax-credit deadline",
    description: "The date, the current limits, and the time left to claim this year.",
    trigger: "Scheduled ahead of the April filing deadline.",
    category: "donation",
    audience: ["individual_donor", "business_donor"],
    preference: "campaignUpdatesEnabled",
    cadence: "seasonal",
    planned: true,
  },

  // ── Scholarships ──────────────────────────────────────────────────────────
  {
    key: "scholarship_window_open",
    name: "Applications are open",
    description: "The window is open, what's needed, and when it closes.",
    trigger: "A Super Admin opens an application window.",
    category: "scholarship",
    audience: ["parent", "student"],
    preference: "scholarshipUpdatesEnabled",
    cadence: "seasonal",
  },
  {
    key: "scholarship_window_closing",
    name: "Applications close soon",
    description: "A week out, addressed to families with an unfinished application.",
    trigger: "7 days before an application window closes.",
    category: "scholarship",
    audience: ["parent", "student"],
    preference: "scholarshipUpdatesEnabled",
    cadence: "seasonal",
    planned: true,
  },
  {
    key: "scholarship_received",
    name: "Application received",
    description: "Confirms submission and says what happens next, with dates.",
    trigger: "A scholarship application is submitted.",
    category: "scholarship",
    audience: ["parent", "student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "scholarship_documents_needed",
    name: "We need a document",
    description: "Names the specific missing document and links to the upload.",
    trigger: "A reviewer flags a missing or unreadable document.",
    category: "scholarship",
    audience: ["parent"],
    preference: null,
    cadence: "per-event",
    planned: true,
  },
  {
    key: "scholarship_awarded",
    name: "Scholarship awarded",
    description: "The amount, the school, the term, and what to do now.",
    trigger: "An award is issued.",
    category: "scholarship",
    audience: ["parent", "student"],
    preference: null,
    cadence: "per-event",
  },
  {
    key: "scholarship_declined",
    name: "Application decision",
    description: "A decline written with care, and the realistic next options.",
    trigger: "An application is declined.",
    category: "scholarship",
    audience: ["parent"],
    preference: null,
    cadence: "per-event",
  },

  // ── Product ───────────────────────────────────────────────────────────────
  {
    key: "product_tool_spotlight",
    name: "New in your dashboard",
    description: "One tool, what it does, and a 30-second path to trying it.",
    trigger: "Sent weekly when there's a tool worth introducing.",
    category: "product",
    audience: ["all"],
    preference: "productUpdatesEnabled",
    cadence: "weekly",
  },
  {
    key: "product_release_notes",
    name: "What's new on ACTSTO",
    description: "A short round-up of what shipped, in plain language.",
    trigger: "Sent on a release.",
    category: "product",
    audience: ["all"],
    preference: "productUpdatesEnabled",
    cadence: "monthly",
    planned: true,
  },
  {
    key: "profile_completion_nudge",
    name: "Finish setting up your account",
    description: "Names the specific fields left and why each one matters.",
    trigger: "A profile sits below 100% for 7 days.",
    category: "product",
    audience: ["all"],
    preference: "productUpdatesEnabled",
    cadence: "per-event",
    planned: true,
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    key: "featured_campaigns_digest",
    name: "Featured campaigns",
    description: "A handful of campaigns with live stats — raised, goal, days left.",
    trigger: "Sent weekly to donors who haven't opted out.",
    category: "marketing",
    audience: ["individual_donor", "business_donor"],
    preference: "featuredCampaignsEnabled",
    cadence: "weekly",
  },
  {
    key: "donor_impact_recap",
    name: "What your giving did",
    description: "A monthly look back at the students your gifts reached.",
    trigger: "Monthly, to donors with at least one gift.",
    category: "marketing",
    audience: ["individual_donor", "business_donor"],
    preference: "marketingEmailEnabled",
    cadence: "monthly",
    planned: true,
  },
  {
    key: "school_partner_update",
    name: "School partner update",
    description: "Enrolment, awards and scholarship totals for a partner school.",
    trigger: "Termly, to school administrators.",
    category: "marketing",
    audience: ["admin"],
    preference: "marketingEmailEnabled",
    cadence: "seasonal",
    planned: true,
  },
];

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  transactional: "Account & access",
  campaign: "Campaigns",
  donation: "Donations & receipts",
  scholarship: "Scholarships",
  product: "Product & tools",
  marketing: "Featured & marketing",
};

/**
 * The switches a user sees in their settings, in the order they see them.
 *
 * Required categories are deliberately absent: offering a toggle that does
 * nothing is worse than not offering one.
 */
export const EMAIL_PREFERENCE_GROUPS: {
  key: EmailPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: "campaignUpdatesEnabled",
    label: "Campaign updates",
    description: "New campaigns, comments and reviews, and tax-credit deadlines.",
  },
  {
    key: "campaignAlertsEnabled",
    label: "Campaign alerts",
    description: "Goal milestones, closing dates, and nudges when a campaign goes quiet.",
  },
  {
    key: "donationUpdatesEnabled",
    label: "Donation activity",
    description: "Thank-yous, gifts arriving on your campaign, and campaign outcomes.",
  },
  {
    key: "scholarshipUpdatesEnabled",
    label: "Scholarship updates",
    description: "Application windows opening and closing.",
  },
  {
    key: "featuredCampaignsEnabled",
    label: "Featured campaigns",
    description: "A weekly handful of campaigns that need support.",
  },
  {
    key: "productUpdatesEnabled",
    label: "New tools & product news",
    description: "New dashboard features and what changed in the app.",
  },
  {
    key: "marketingEmailEnabled",
    label: "Impact stories & partner news",
    description: "Occasional stories about where the money went.",
  },
];

export function getCatalogEntry(key: string): EmailCatalogEntry | null {
  return EMAIL_CATALOG.find((e) => e.key === key) ?? null;
}

export function catalogByCategory(category: EmailCategory): EmailCatalogEntry[] {
  return EMAIL_CATALOG.filter((e) => e.category === category);
}

/** Required email — no preference can suppress it. */
export function isRequiredEmail(key: string): boolean {
  return getCatalogEntry(key)?.preference === null;
}
