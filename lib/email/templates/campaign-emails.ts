/**
 * Campaign lifecycle, donation, product and digest emails.
 *
 * Each builder takes real data and returns `{ subject, html, text }`. They all
 * go through `renderEmailLayout`, so every one of them carries the same
 * masthead, hero, signature and footer — the shell is not something an
 * individual template gets to reinvent.
 *
 * Two rules the copy follows throughout. Say the number: "$4,600 to go" beats
 * "we still need your help". And name the person: a campaign email that says
 * "your student" to someone whose daughter's name is on the page reads like it
 * came from a database, because it did.
 */

import {
  renderEmailLayout,
  renderEmailText,
  type EmailLayoutOptions,
} from "@/lib/email/templates/layout";
import {
  bigFigure,
  calloutBox,
  campaignCard,
  money,
  paragraph,
  progressBar,
  statRow,
  steps,
  type CampaignCard,
} from "@/lib/email/templates/blocks";

export type BuiltEmail = { subject: string; html: string; text: string };

export type CampaignFacts = {
  title: string;
  url: string;
  /** "Jace" or "Jace and Skye". */
  studentNames: string;
  schoolName: string;
  raised: number;
  goal: number;
  donorCount: number;
  daysLeft: number;
  /** Absolute URL. Omitted rather than rendering a broken image. */
  imageUrl?: string | null;
};

function remainingOf(campaign: CampaignFacts): number {
  return Math.max(0, campaign.goal - campaign.raised);
}

/** Renders both flavours from one options object, so they can't drift apart. */
function build(subject: string, options: EmailLayoutOptions): BuiltEmail {
  return {
    subject,
    html: renderEmailLayout(options),
    text: renderEmailText(options),
  };
}

// ── Campaign closing ─────────────────────────────────────────────────────────

/**
 * The 30-day and 1-week notices are one template with a different window.
 *
 * They differ in urgency, not in substance, and keeping them as one builder
 * means a wording fix lands on both instead of on whichever someone remembered.
 */
export function buildCampaignClosingEmail(args: {
  window: "30-days" | "1-week";
  firstName?: string | null;
  campaign: CampaignFacts;
  /** The family sees "your campaign"; a backer sees "a campaign you supported". */
  audience: "owner" | "supporter";
}): BuiltEmail {
  const { window, firstName, campaign, audience } = args;
  const isFinalWeek = window === "1-week";
  const remaining = remainingOf(campaign);
  const owner = audience === "owner";

  const subject = isFinalWeek
    ? `${campaign.daysLeft} ${campaign.daysLeft === 1 ? "day" : "days"} left — ${money(remaining)} to go`
    : `One month left for ${campaign.studentNames}`;

  const body = owner
    ? isFinalWeek
      ? [
          `Your campaign closes in ${campaign.daysLeft} ${campaign.daysLeft === 1 ? "day" : "days"}, and you're ${money(remaining)} from the goal.`,
          "This last week is where most campaigns make up the difference. The families who close the gap almost always do the same thing: they send one more personal message to people who haven't given yet.",
        ]
      : [
          `There's a month left on ${campaign.studentNames}'s campaign. You've raised ${money(campaign.raised)} of ${money(campaign.goal)} so far.`,
          "A month is enough time to change the outcome. The marketing tools in your dashboard will build a postcard, an email or a social post from your campaign in about a minute.",
        ]
    : [
        isFinalWeek
          ? `The campaign for ${campaign.studentNames} at ${campaign.schoolName} closes in ${campaign.daysLeft} ${campaign.daysLeft === 1 ? "day" : "days"}. It's ${money(remaining)} short.`
          : `The campaign for ${campaign.studentNames} at ${campaign.schoolName} has a month to go, and is ${money(remaining)} short of its goal.`,
        "If you're an Arizona taxpayer, a gift here is a tax credit rather than a donation — you're choosing where money you already owe ends up.",
      ];

  const bodyHtml = [
    ...body.map(paragraph),
    progressBar({
      raised: campaign.raised,
      goal: campaign.goal,
      donorCount: campaign.donorCount,
      daysLeft: campaign.daysLeft,
    }),
    owner && isFinalWeek
      ? calloutBox(
          "What works in the last week",
          "Message people individually rather than posting once more. A short note that names the person beats a broadcast every time.",
        )
      : "",
  ].join("\n");

  return build(subject, {
    preheader: `${money(campaign.raised)} raised of ${money(campaign.goal)}. ${money(remaining)} to go.`,
    eyebrow: isFinalWeek ? "Final week" : "One month left",
    title: isFinalWeek ? `${money(remaining)} to go` : `A month left for ${campaign.studentNames}`,
    subtitle: campaign.title,
    featuredImageUrl: campaign.imageUrl,
    featuredImageAlt: campaign.title,
    firstName,
    bodyHtml,
    body,
    cta: {
      label: owner ? "Open your campaign" : "Give before it closes",
      url: campaign.url,
    },
    reason: owner
      ? "You're receiving this because you run this campaign."
      : "You're receiving this because you supported this campaign.",
    showUnsubscribe: true,
  });
}

// ── Goal milestones ──────────────────────────────────────────────────────────

export function buildGoalMilestoneEmail(args: {
  milestone: 25 | 50 | 75 | 100;
  firstName?: string | null;
  campaign: CampaignFacts;
}): BuiltEmail {
  const { milestone, firstName, campaign } = args;
  const funded = milestone === 100;
  const remaining = remainingOf(campaign);

  const subject = funded
    ? `Fully funded — ${campaign.studentNames} made it`
    : `${milestone}% funded for ${campaign.studentNames}`;

  const body = funded
    ? [
        `${campaign.studentNames}'s campaign is fully funded. ${money(campaign.raised)} from ${campaign.donorCount} ${campaign.donorCount === 1 ? "person" : "people"}.`,
        `That's tuition at ${campaign.schoolName} — a year spent learning instead of wondering whether it was possible.`,
        "Your campaign stays open until its end date, and anything raised beyond the goal goes to the same place. We'll send the final summary when it closes.",
      ]
    : [
        `${campaign.studentNames}'s campaign just passed ${milestone}%.`,
        `${money(campaign.raised)} raised, ${money(remaining)} to go, ${campaign.donorCount} ${campaign.donorCount === 1 ? "person has" : "people have"} given.`,
        "Momentum is the thing that carries a campaign. A short update to the people who've already given is the cheapest way to keep it — they're the ones most likely to share it on.",
      ];

  const bodyHtml = [
    funded ? bigFigure("100%", "of goal reached") : bigFigure(`${milestone}%`, "of goal reached"),
    ...body.map(paragraph),
    statRow([
      { label: "Raised", value: money(campaign.raised) },
      { label: "Goal", value: money(campaign.goal) },
      { label: "Supporters", value: String(campaign.donorCount) },
    ]),
  ].join("\n");

  return build(subject, {
    preheader: funded
      ? `${money(campaign.raised)} raised from ${campaign.donorCount} supporters.`
      : `${money(campaign.raised)} of ${money(campaign.goal)}. ${money(remaining)} to go.`,
    eyebrow: funded ? "Fully funded" : "Milestone reached",
    title: funded ? "You made it" : `${milestone}% of the way there`,
    subtitle: campaign.title,
    featuredImageUrl: campaign.imageUrl,
    featuredImageAlt: campaign.title,
    firstName,
    bodyHtml,
    body,
    cta: { label: funded ? "See your campaign" : "Share your campaign", url: campaign.url },
    reason: "You're receiving this because you run this campaign.",
    showUnsubscribe: true,
  });
}

// ── Donations ────────────────────────────────────────────────────────────────

export function buildDonationReceivedEmail(args: {
  firstName?: string | null;
  campaign: CampaignFacts;
  amount: number;
  donorName: string | null;
  donorMessage?: string | null;
  /** First gift on this campaign — worth saying so. */
  isFirst?: boolean;
}): BuiltEmail {
  const { firstName, campaign, amount, donorName, donorMessage, isFirst } = args;
  const from = donorName?.trim() ? donorName.trim() : "Someone giving anonymously";

  const body = [
    isFirst
      ? `Your first gift just came in. ${from} gave ${money(amount)} to ${campaign.studentNames}'s campaign.`
      : `${from} gave ${money(amount)} to ${campaign.studentNames}'s campaign.`,
    donorMessage?.trim() ? `They left a note: “${donorMessage.trim()}”` : "",
    isFirst
      ? "The first gift is the hardest one to get, and it's the one that makes the rest easier — people give to campaigns that other people have already backed."
      : `You're now at ${money(campaign.raised)} of ${money(campaign.goal)}.`,
  ].filter(Boolean);

  const bodyHtml = [
    bigFigure(money(amount), isFirst ? "your first gift" : `from ${from}`),
    ...body.map(paragraph),
    progressBar({
      raised: campaign.raised,
      goal: campaign.goal,
      donorCount: campaign.donorCount,
      daysLeft: campaign.daysLeft,
    }),
    calloutBox(
      "Say thank you",
      "A note within a day or two is the single thing most likely to bring someone back for a second gift. Your dashboard has their details if they gave publicly.",
    ),
  ].join("\n");

  return build(isFirst ? `Your first gift — ${money(amount)}` : `${money(amount)} from ${from}`, {
    preheader: `${money(campaign.raised)} raised of ${money(campaign.goal)}.`,
    eyebrow: isFirst ? "First gift" : "New donation",
    title: isFirst ? "Your first gift arrived" : `${money(amount)} just came in`,
    subtitle: campaign.title,
    firstName,
    bodyHtml,
    body,
    cta: { label: "Open your campaign", url: campaign.url },
    reason: "You're receiving this because you run this campaign.",
    showUnsubscribe: true,
  });
}

// ── New campaign published ───────────────────────────────────────────────────

export function buildNewCampaignEmail(args: {
  firstName?: string | null;
  campaign: CampaignFacts;
  /** The family's own words, from the campaign story. */
  excerpt: string;
}): BuiltEmail {
  const { firstName, campaign, excerpt } = args;

  const body = [
    `A new campaign is live: ${campaign.studentNames} at ${campaign.schoolName}.`,
    excerpt,
    `They're raising ${money(campaign.goal)} for tuition. If you're an Arizona taxpayer, giving here is a tax credit rather than a donation — you're redirecting money you already owe the state.`,
  ];

  const bodyHtml = [
    ...body.map(paragraph),
    statRow([
      { label: "Goal", value: money(campaign.goal) },
      { label: "Raised", value: money(campaign.raised) },
      { label: "Days left", value: String(campaign.daysLeft) },
    ]),
  ].join("\n");

  return build(`New campaign: ${campaign.studentNames} at ${campaign.schoolName}`, {
    preheader: excerpt.slice(0, 120),
    eyebrow: "New campaign",
    title: campaign.title,
    subtitle: `${campaign.studentNames} · ${campaign.schoolName}`,
    featuredImageUrl: campaign.imageUrl,
    featuredImageAlt: campaign.title,
    firstName,
    bodyHtml,
    body,
    cta: { label: "Read their story", url: campaign.url },
    reason: "You're receiving this because you asked to hear about new campaigns.",
    showUnsubscribe: true,
  });
}

// ── Featured campaigns digest ────────────────────────────────────────────────

export function buildFeaturedCampaignsEmail(args: {
  firstName?: string | null;
  campaigns: CampaignCard[];
  /** Site-wide figures for the intro line. */
  totals?: { studentsSupported: number; raisedThisMonth: number };
}): BuiltEmail {
  const { firstName, campaigns, totals } = args;
  const closingSoon = campaigns.filter((c) => c.daysLeft > 0 && c.daysLeft <= 14).length;

  const body = [
    "Here are a few campaigns that could use support this week.",
    closingSoon > 0
      ? `${closingSoon} of them ${closingSoon === 1 ? "closes" : "close"} within a fortnight, so they're the ones where a gift changes the outcome rather than the total.`
      : "Every one of them is short of goal with time still on the clock.",
  ];

  const bodyHtml = [
    ...body.map(paragraph),
    totals
      ? statRow([
          { label: "Students supported", value: String(totals.studentsSupported) },
          { label: "Raised this month", value: money(totals.raisedThisMonth) },
        ])
      : "",
    ...campaigns.map(campaignCard),
  ].join("\n");

  return build(
    closingSoon > 0
      ? `${closingSoon} campaign${closingSoon === 1 ? "" : "s"} closing soon`
      : "Campaigns that need support this week",
    {
      preheader: campaigns
        .slice(0, 2)
        .map((c) => c.title)
        .join(" · "),
      eyebrow: "Featured campaigns",
      title: "Students who need a hand this week",
      subtitle: "Each one is a real family, a real school, and a real gap.",
      firstName,
      bodyHtml,
      body,
      cta: { label: "Browse all campaigns", url: "https://actsto.org/campaigns" },
      reason: "You're receiving this because featured campaigns are switched on in your settings.",
      showUnsubscribe: true,
    },
  );
}

// ── Product ──────────────────────────────────────────────────────────────────

export function buildToolSpotlightEmail(args: {
  firstName?: string | null;
  toolName: string;
  /** One sentence: what it does for them, not what it is. */
  summary: string;
  howItWorks: { title: string; body: string }[];
  ctaUrl: string;
  ctaLabel?: string;
  imageUrl?: string | null;
}): BuiltEmail {
  const { firstName, toolName, summary, howItWorks, ctaUrl, ctaLabel, imageUrl } = args;

  const body = [
    summary,
    "It's already in your dashboard — nothing to install and nothing to switch on.",
  ];

  const bodyHtml = [
    ...body.map(paragraph),
    steps(howItWorks),
    calloutBox(
      "Don't want these?",
      "Product notes are optional. Turn them off under Settings → Email preferences and you'll still get everything about your campaigns and donations.",
    ),
  ].join("\n");

  return build(`New in your dashboard: ${toolName}`, {
    preheader: summary.slice(0, 120),
    eyebrow: "New tool",
    title: toolName,
    subtitle: summary,
    featuredImageUrl: imageUrl,
    featuredImageAlt: toolName,
    firstName,
    bodyHtml,
    body,
    cta: { label: ctaLabel ?? `Try ${toolName}`, url: ctaUrl },
    reason: "You're receiving this because product updates are switched on in your settings.",
    showUnsubscribe: true,
  });
}

/** Sample data for previews. Obviously placeholder, so nobody mistakes it for real figures. */
export const SAMPLE_CAMPAIGN: CampaignFacts = {
  title: "Waters Family Fundraiser",
  url: "https://actsto.org/campaigns/waters-family-fundraiser",
  studentNames: "Jace and Skye",
  schoolName: "Valley Christian Schools",
  raised: 9350,
  goal: 15000,
  donorCount: 27,
  daysLeft: 6,
  imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
};

export const SAMPLE_FEATURED: CampaignCard[] = [
  {
    title: "Help Ava Finish the Year",
    studentLine: "Ava, 5th grade · Valley Christian Schools",
    url: "https://actsto.org/campaigns/sample-ava",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
    raised: 7400,
    goal: 12000,
    donorCount: 24,
    daysLeft: 9,
  },
  {
    title: "The Okafor Family",
    studentLine: "Daniel, 9th grade · Northwest Christian",
    url: "https://actsto.org/campaigns/sample-okafor",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80",
    raised: 3100,
    goal: 14000,
    donorCount: 11,
    daysLeft: 42,
  },
  {
    title: "Two Brothers, One School",
    studentLine: "Mateo and Luis, 3rd and 6th grade · Phoenix Christian",
    url: "https://actsto.org/campaigns/sample-brothers",
    imageUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80",
    raised: 16200,
    goal: 18000,
    donorCount: 58,
    daysLeft: 4,
  },
];
