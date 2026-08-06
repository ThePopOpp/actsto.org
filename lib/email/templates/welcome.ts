import {
  renderEmailLayout,
  renderEmailText,
  type EmailLayoutOptions,
} from "@/lib/email/templates/layout";

/**
 * Sample 1 — the registration welcome.
 *
 * One template, four voices. A parent applying for tuition help and a business
 * donor offsetting a tax liability have almost nothing in common, so the eyebrow,
 * the promise and the next step all change by role. Sending everyone the same
 * "Welcome to ACTSTO" wastes the one email people reliably open.
 *
 * Transactional: no unsubscribe, since it confirms an account they just made.
 */

export type WelcomeRole = "parent" | "student" | "donor_individual" | "donor_business";

const COPY: Record<
  WelcomeRole,
  { eyebrow: string; title: string; subtitle: string; body: string[]; cta: { label: string; path: string } }
> = {
  parent: {
    eyebrow: "Welcome to ACTSTO",
    title: "Your family's account is ready",
    subtitle: "Apply for a scholarship, and raise support from people who want to help.",
    body: [
      "Thanks for creating an account. From here you can add your students, apply for a tuition scholarship, and start a campaign that friends and family can give to directly.",
      "Two things worth doing first: add each of your children under Students, then start your scholarship application. The application saves as you go, so you can leave it and come back.",
      "If anything is unclear, reply to this email — a person reads it.",
    ],
    cta: { label: "Set up your family", path: "/dashboard/parent" },
  },
  student: {
    eyebrow: "Welcome to ACTSTO",
    title: "Your student account is ready",
    subtitle: "Share your story and follow your campaign as it grows.",
    body: [
      "Your account is set up and linked to your family. You can update your profile, help write your campaign story, and see the support coming in.",
      "Your parent or guardian still manages the scholarship application and anything financial — your part is the story, and it matters more than you'd think. Donors read them.",
    ],
    cta: { label: "Open your dashboard", path: "/dashboard/student" },
  },
  donor_individual: {
    eyebrow: "Welcome to ACTSTO",
    title: "Thank you for standing with Arizona families",
    subtitle: "Redirect the state taxes you already owe into a child's education.",
    body: [
      "Your account is ready. Browse campaigns to find a family whose story resonates, or give to the general fund and let our team direct it where the need is greatest.",
      "Arizona's private school tax credit is dollar-for-dollar — a credit, not a deduction. Within your annual limit, what you give comes back to you at tax time. Most people are surprised by that, and it's the single most important thing to understand about giving here.",
      "Every receipt you'll need is generated automatically and kept in your dashboard.",
    ],
    cta: { label: "Browse campaigns", path: "/campaigns" },
  },
  donor_business: {
    eyebrow: "Welcome to ACTSTO",
    title: "Your business account is ready",
    subtitle: "Corporate tax-credit giving, with the paperwork handled.",
    body: [
      "Your business account is set up. You can record pledges, manage your company details, and keep every receipt and compliance document in one place.",
      "Corporate contributions work differently from individual ones — they run on approvals and caps set by the Arizona Department of Revenue, and timing matters. Our team will walk you through it rather than leaving you to read the statute.",
      "Tell us your target contribution and tax year, and we'll take it from there.",
    ],
    cta: { label: "Open your dashboard", path: "/dashboard/business" },
  },
};

export function buildWelcomeEmail(args: {
  role: WelcomeRole;
  firstName?: string | null;
  siteUrl?: string;
}): { subject: string; html: string; text: string } {
  const site = (args.siteUrl ?? process.env.APP_URL ?? "https://actsto.org").replace(/\/$/, "");
  const copy = COPY[args.role];

  const options: EmailLayoutOptions = {
    preheader: copy.subtitle,
    eyebrow: copy.eyebrow,
    title: copy.title,
    subtitle: copy.subtitle,
    firstName: args.firstName,
    body: copy.body,
    cta: { label: copy.cta.label, url: `${site}${copy.cta.path}` },
    reason: "You're receiving this because you created an ACTSTO.org account.",
    // Account confirmation — not something to opt out of.
    showUnsubscribe: false,
  };

  return {
    subject: copy.title,
    html: renderEmailLayout(options),
    text: renderEmailText(options),
  };
}
