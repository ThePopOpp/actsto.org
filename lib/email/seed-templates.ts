import "server-only";

import { prisma } from "@/lib/prisma";
import { EMAIL_CATALOG, type EmailCatalogEntry } from "@/lib/email/catalog";
import type { BlogBlock, BlogBlockProps, BlogBlockType } from "@/lib/blog/blocks";
import { blocksToHtml } from "@/lib/blog/blocks";

/**
 * Installs the catalogue as editable template rows.
 *
 * The code builders in `lib/email/templates/` are the source of truth for
 * *structure* — the shell, the progress bars, the stat panels. These rows are
 * the source of truth for *words*: subject line, hero copy, body paragraphs.
 * Editing one here changes what sends without a deploy, which is the whole
 * point of having them in a table.
 *
 * Idempotent by `catalogKey`. Re-running never duplicates, and — importantly —
 * never overwrites. Once a row exists, whatever a Super Admin has since written
 * in it wins over whatever is in this file. A seeder that clobbers edits is a
 * seeder nobody dares run twice.
 */

type SeedBody = {
  subject: string;
  preheader: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Body paragraphs. Merge fields are fine — they're substituted at send time. */
  paragraphs: string[];
};

const SITE = "https://actsto.org";

/**
 * Default copy per catalogue entry.
 *
 * Anything absent here still gets a row, built from the catalogue's own name and
 * description — an editable stub beats a missing template, because a missing one
 * means the event silently sends nothing.
 */
const SEED_COPY: Record<string, SeedBody> = {
  welcome_parent: {
    subject: "Welcome to ACTSTO — here's where to start",
    preheader: "Three things to do first, and what each one unlocks.",
    eyebrow: "Welcome",
    heroTitle: "Let's get {{first_name}} set up",
    heroSubtitle: "Your dashboard is ready. Here's the shortest path through it.",
    ctaLabel: "Open your dashboard",
    ctaUrl: `${SITE}/dashboard/parent`,
    paragraphs: [
      "Thanks for joining ACTSTO. You're here to make a Christ-centered education affordable for your family, and the fastest route to that is a campaign people can actually share.",
      "Add your student first — their name, grade and school are what everything else hangs off. Then add a photo and write a few honest sentences about why this matters. Families who do both raise noticeably more than families who do neither.",
      "When you're ready, submit the campaign for review. We look at every one by hand, usually within two business days.",
    ],
  },
  welcome_student: {
    subject: "Welcome to ACTSTO",
    preheader: "What you can do here, and what a parent or guardian handles.",
    eyebrow: "Welcome",
    heroTitle: "Hi {{first_name}} — welcome",
    heroSubtitle: "Here's what your account does.",
    ctaLabel: "Open your dashboard",
    ctaUrl: `${SITE}/dashboard/student`,
    paragraphs: [
      "Your account lets you see your campaign, read the messages people leave, and add updates about how the year is going.",
      "A parent or guardian handles anything to do with money, documents or your personal details. That's on purpose — you shouldn't have to think about the paperwork.",
      "If something looks wrong or you're not sure about a message you've received, tell your parent or guardian. You can always reach us at hello@actsto.org.",
    ],
  },
  welcome_individual_donor: {
    subject: "Welcome — here's how the Arizona tax credit works",
    preheader: "Redirect tax you already owe to a student's tuition.",
    eyebrow: "Welcome",
    heroTitle: "Your giving, redirected",
    heroSubtitle: "Arizona lets you choose where part of your state tax goes.",
    ctaLabel: "Find a student to support",
    ctaUrl: `${SITE}/campaigns`,
    paragraphs: [
      "Thanks for joining, {{first_name}}. Most people are surprised by how the Arizona tax credit works, so here's the short version.",
      "Instead of sending a portion of your state tax to the state, you can send it to a student's tuition and claim it back dollar-for-dollar as a credit. For most Arizona filers, that makes a gift here cost-neutral — you're not giving money away, you're choosing where money you already owe ends up.",
      "We email a receipt the moment a gift is verified, and a summary of everything you gave each January, in time for your return.",
    ],
  },
  welcome_business_donor: {
    subject: "Welcome — corporate tax-credit giving",
    preheader: "Limits, approvals, and who to talk to.",
    eyebrow: "Welcome",
    heroTitle: "Corporate giving, made simple",
    heroSubtitle: "Arizona's corporate credit works differently — here's what to know.",
    ctaLabel: "Open your dashboard",
    ctaUrl: `${SITE}/dashboard/business`,
    paragraphs: [
      "Thanks for registering, {{first_name}}. Corporate tax-credit giving in Arizona runs on a different set of limits from individual giving, and the state approves contributions against an annual cap.",
      "Add your EIN and billing details to your profile and we'll handle the approval paperwork. We'll tell you where you stand against the cap before anything is committed.",
      "If it's easier to talk it through, reply to this email and we'll set up a call.",
    ],
  },
  campaign_approved: {
    subject: "Your campaign is live",
    preheader: "Here's your link, and the three things to do first.",
    eyebrow: "Approved",
    heroTitle: "You're live",
    heroSubtitle: "{{campaign_title}} is now public.",
    ctaLabel: "See your campaign",
    ctaUrl: "{{campaign_url}}",
    paragraphs: [
      "Your campaign has been approved and is now public at {{campaign_url}}.",
      "Three things, in order of how much they matter. Send the link to ten people personally — not a broadcast, ten individual messages. Then post it once publicly. Then use the marketing tools in your dashboard to build a postcard or an email you can keep sending.",
      "Campaigns that get their first gift in the first 48 hours finish funded far more often than those that don't. It's worth the evening.",
    ],
  },
  campaign_changes_requested: {
    subject: "A few changes needed on your campaign",
    preheader: "Small edits, then resubmit — we'll look again quickly.",
    eyebrow: "Needs changes",
    heroTitle: "Almost there",
    heroSubtitle: "A couple of things to adjust before {{campaign_title}} goes live.",
    ctaLabel: "Edit your campaign",
    ctaUrl: "{{campaign_url}}",
    paragraphs: [
      "Thanks for submitting {{campaign_title}}. Before it goes public, we need a few changes — the details are in your dashboard, next to the fields concerned.",
      "This is routine and it isn't a rejection. Most campaigns need at least one adjustment, usually because a photo is too small or a detail about the school needs confirming.",
      "Resubmit when you're ready and we'll look again, normally the same day.",
    ],
  },
  scholarship_window_open: {
    subject: "Scholarship applications are open",
    preheader: "What you'll need, and when it closes.",
    eyebrow: "Applications open",
    heroTitle: "Applications are open",
    heroSubtitle: "One application per student, per school year.",
    ctaLabel: "Start an application",
    ctaUrl: `${SITE}/dashboard/parent/apply`,
    paragraphs: [
      "The scholarship application window is now open, {{first_name}}.",
      "You'll need household income details and a document for each source of income. Nothing has to be finished in one sitting — the application saves as you go, and you can come back to it.",
      "Applications are reviewed after the window closes, not as they arrive, so applying early doesn't advantage you. Applying at all does.",
    ],
  },
  scholarship_awarded: {
    subject: "Your scholarship has been awarded",
    preheader: "The amount, the school, and what happens next.",
    eyebrow: "Awarded",
    heroTitle: "You've been awarded a scholarship",
    heroSubtitle: "Here are the details and the next step.",
    ctaLabel: "See your award",
    ctaUrl: `${SITE}/dashboard/parent`,
    paragraphs: [
      "We're glad to tell you that a scholarship has been awarded for the coming school year.",
      "The award is paid directly to the school on your behalf — you don't need to move any money. The details, including the amount and the term it covers, are in your dashboard.",
      "If anything changes with enrolment, tell us as soon as you can so the payment goes to the right place.",
    ],
  },
  scholarship_declined: {
    subject: "About your scholarship application",
    preheader: "Our decision, and what's still open to you.",
    eyebrow: "Application decision",
    heroTitle: "About your application",
    heroSubtitle: "We weren't able to award a scholarship this year.",
    ctaLabel: "See your options",
    ctaUrl: `${SITE}/dashboard/parent`,
    paragraphs: [
      "Thank you for applying. We weren't able to award a scholarship for this school year, and I'm sorry — I know that isn't the message you were hoping for.",
      "Applications outnumber the funds available, and a decline reflects that arithmetic rather than anything about your family or your student.",
      "Two things remain open. You can start a campaign, which raises tuition directly from people who know you and from donors looking for a student to support. And you can apply again next year — reapplying is expected, not held against you.",
    ],
  },
  donation_receipt: {
    subject: "Your donation receipt",
    preheader: "Keep this for your Arizona tax return.",
    eyebrow: "Receipt",
    heroTitle: "Thank you — here's your receipt",
    heroSubtitle: "Keep this for your records.",
    ctaLabel: "View your receipt",
    ctaUrl: `${SITE}/dashboard/donor/receipts`,
    paragraphs: [
      "Thank you for your gift of {{donation_amount}}, {{first_name}}. This email is your receipt — receipt number {{receipt_number}}, tax year {{tax_year}}.",
      "Arizona Christian Tuition Organization is a certified School Tuition Organization. Your contribution may be claimed as a dollar-for-dollar credit against your Arizona state tax liability, subject to the annual limits for your filing status.",
      "We're not able to give tax advice. Your accountant can confirm how this applies to your return.",
    ],
  },
};

/** Turns seed copy into a block document the editor can open. */
function toBlocks(catalogKey: string, seed: SeedBody): BlogBlock[] {
  const parts: [BlogBlockType, BlogBlockProps][] = [
    ...seed.paragraphs.map(
      (text) => ["paragraph", { content: text, align: "left" }] as [BlogBlockType, BlogBlockProps],
    ),
    [
      "button",
      {
        buttonText: seed.ctaLabel,
        buttonUrl: seed.ctaUrl,
        buttonBgColor: "#001138",
        buttonColor: "#ffffff",
        align: "left",
      },
    ],
  ];
  return parts.map(([type, props], i) => ({ id: `${catalogKey}-${i}`, type, props }));
}

/**
 * Falls back to the catalogue's own name and description.
 *
 * An editable stub beats a missing template: a missing one means the event has
 * nothing to send, and that failure is invisible until someone asks why they
 * never got an email.
 */
function stubFor(entry: EmailCatalogEntry): SeedBody {
  return {
    subject: entry.name,
    preheader: entry.description,
    eyebrow: entry.name,
    heroTitle: entry.name,
    heroSubtitle: entry.description,
    ctaLabel: "Open ACTSTO",
    ctaUrl: `${SITE}/dashboard`,
    paragraphs: [
      `Hello {{first_name}},`,
      entry.description,
      "This template hasn't been written yet — edit it here and it will be used the next time this email sends.",
    ],
  };
}

export type SeedResult = { created: number; skipped: number; total: number };

export async function seedEmailTemplates(createdByEmail: string | null): Promise<SeedResult> {
  const existing = await prisma.emailTemplate.findMany({
    where: { catalogKey: { not: null } },
    select: { catalogKey: true },
  });
  const have = new Set(existing.map((row) => row.catalogKey));

  let created = 0;
  for (const entry of EMAIL_CATALOG) {
    if (have.has(entry.key)) continue;

    const seed = SEED_COPY[entry.key] ?? stubFor(entry);
    const blocks = toBlocks(entry.key, seed);

    await prisma.emailTemplate.create({
      data: {
        catalogKey: entry.key,
        title: entry.name,
        subject: seed.subject,
        preheader: seed.preheader,
        category: entry.category,
        audienceRole: entry.audience[0] ?? "all",
        eyebrow: seed.eyebrow,
        heroTitle: seed.heroTitle,
        heroSubtitle: seed.heroSubtitle,
        ctaLabel: seed.ctaLabel,
        ctaUrl: seed.ctaUrl,
        blocks: blocks as unknown as object,
        content: blocksToHtml(blocks),
        // Written copy is ready to use; auto-generated stubs are not, and
        // shouldn't be presented as though someone approved them.
        status: SEED_COPY[entry.key] ? "ready" : "draft",
        createdByEmail,
      },
    });
    created += 1;
  }

  return { created, skipped: EMAIL_CATALOG.length - created, total: EMAIL_CATALOG.length };
}
