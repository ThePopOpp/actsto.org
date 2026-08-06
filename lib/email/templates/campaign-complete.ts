import {
  EMAIL_BRAND,
  escapeHtml,
  renderEmailLayout,
  renderEmailText,
  type EmailLayoutOptions,
} from "@/lib/email/templates/layout";

/**
 * Sample 2 — campaign completion.
 *
 * The one email where numbers carry the message, so they get a panel of their
 * own rather than being buried in a sentence. Same figures, four different
 * meanings: a parent hears relief, a student hears that people showed up, a
 * donor hears what their gift added up to.
 *
 * Optional mail — carries an unsubscribe link.
 */

export type CampaignCompleteAudience = "parent" | "student" | "donor_individual" | "donor_business";

export type CampaignCompleteStats = {
  campaignTitle: string;
  campaignUrl: string;
  studentNames: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  /** Days from launch to close. Omit if unknown rather than guessing. */
  daysRunning?: number;
  featuredImageUrl?: string | null;
};

const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v || 0);

/** The figures, as a panel. Tables because email clients don't do flexbox. */
function statsPanel(stats: CampaignCompleteStats): string {
  const pct = stats.goalAmount > 0 ? Math.round((stats.raisedAmount / stats.goalAmount) * 100) : 0;

  const cell = (label: string, value: string) => `
    <td width="33%" align="center" style="padding:16px 8px">
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${EMAIL_BRAND.navy}">${escapeHtml(value)}</p>
      <p style="margin:3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.7px;text-transform:uppercase;color:${EMAIL_BRAND.inkFaint}">${escapeHtml(label)}</p>
    </td>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:6px 0 20px;background:${EMAIL_BRAND.paper};border:1px solid ${EMAIL_BRAND.line};border-radius:12px">
    <tr>
      ${cell("Raised", money(stats.raisedAmount))}
      ${cell("Of goal", `${pct}%`)}
      ${cell(stats.donorCount === 1 ? "Donor" : "Donors", String(stats.donorCount))}
    </tr>
    ${
      stats.daysRunning
        ? `<tr><td colspan="3" align="center" style="padding:0 12px 15px">
             <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${EMAIL_BRAND.inkSoft}">
               ${stats.donorCount} ${stats.donorCount === 1 ? "person" : "people"} gave over ${stats.daysRunning} days
             </p></td></tr>`
        : ""
    }
  </table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${EMAIL_BRAND.ink}">${escapeHtml(text)}</p>`;
}

export function buildCampaignCompleteEmail(args: {
  audience: CampaignCompleteAudience;
  firstName?: string | null;
  stats: CampaignCompleteStats;
}): { subject: string; html: string; text: string } {
  const { audience, stats } = args;
  const funded = stats.raisedAmount >= stats.goalAmount && stats.goalAmount > 0;

  const voice: Record<
    CampaignCompleteAudience,
    { eyebrow: string; title: string; subtitle: string; opening: string[]; closing: string[]; cta: string }
  > = {
    parent: {
      eyebrow: "Campaign complete",
      title: funded ? "You reached your goal" : "Your campaign has closed",
      subtitle: `Here's where ${escapeHtml(stats.studentNames)}'s campaign finished.`,
      opening: funded
        ? [`Your campaign for ${stats.studentNames} has closed, fully funded. Here's how it finished.`]
        : [`Your campaign for ${stats.studentNames} has closed. Here's how it finished.`],
      closing: funded
        ? [
            "Every one of those gifts came from someone who read your story and decided it mattered. That's worth sitting with for a moment.",
            "Our team will be in touch about how funds are applied to tuition. If anything looks wrong, tell us straight away.",
          ]
        : [
            "Falling short of a goal doesn't mean the campaign failed — every dollar raised still goes toward tuition, and families often do better in a second year once their story is out there.",
            "Our team will be in touch about how what you raised is applied, and we'd genuinely like to talk about next year.",
          ],
      cta: "View your campaign",
    },
    student: {
      eyebrow: "Campaign complete",
      title: funded ? "People showed up for you" : "Your campaign has closed",
      subtitle: "Here's what your campaign raised.",
      opening: ["Your campaign has closed. Here's what happened."],
      closing: [
        "Behind that donor number are real people — some you know, some you don't — who read about you and chose to help. That's not a small thing.",
        "Keep working hard. It's being noticed.",
      ],
      cta: "See your campaign",
    },
    donor_individual: {
      eyebrow: "Thank you",
      title: "The campaign you supported has closed",
      subtitle: `${escapeHtml(stats.campaignTitle)} finished with your help.`,
      opening: [`A campaign you gave to — ${stats.campaignTitle} — has closed. Here's where it landed.`],
      closing: [
        "Your gift is part of that total. Thank you.",
        "Your tax receipt is in your dashboard whenever you need it for filing. If you'd like to support another family this year, there are always more waiting.",
      ],
      cta: "Find another family",
    },
    donor_business: {
      eyebrow: "Thank you",
      title: "A campaign your company supported has closed",
      subtitle: `${escapeHtml(stats.campaignTitle)} finished with your help.`,
      opening: [`A campaign your company supported — ${stats.campaignTitle} — has closed. Here's the result.`],
      closing: [
        "Your contribution is part of that total, and it went directly toward tuition for an Arizona family.",
        "Your receipts and compliance documents are in your dashboard. We'll be in touch ahead of next year's corporate cap so you're not caught by the timing.",
      ],
      cta: "View your giving",
    },
  };

  const v = voice[audience];

  const bodyHtml = [
    ...v.opening.map(paragraph),
    statsPanel(stats),
    ...v.closing.map(paragraph),
  ].join("\n");

  const options: EmailLayoutOptions = {
    preheader: `${stats.campaignTitle} — ${money(stats.raisedAmount)} raised from ${stats.donorCount} ${stats.donorCount === 1 ? "donor" : "donors"}`,
    eyebrow: v.eyebrow,
    title: v.title,
    subtitle: v.subtitle,
    featuredImageUrl: stats.featuredImageUrl ?? null,
    featuredImageAlt: stats.campaignTitle,
    firstName: args.firstName,
    bodyHtml,
    cta: { label: v.cta, url: stats.campaignUrl },
    reason: "You're receiving this because you're connected to this campaign.",
    showUnsubscribe: true,
  };

  return {
    subject: funded
      ? `${stats.campaignTitle} reached its goal`
      : `${stats.campaignTitle} has closed`,
    html: renderEmailLayout(options),
    text: renderEmailText({ ...options, body: [...v.opening, ...v.closing] }),
  };
}
