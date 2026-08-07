/**
 * Ready-to-send campaign emails, rendered from campaign data + a design variant.
 *
 * These are *not* transactional emails from ACTSTO — they're written in the
 * family's own voice for them to paste into Gmail, Outlook or their own mailing
 * tool. So: no ACTSTO masthead, no unsubscribe footer, no tracking. Just the
 * message, signed by the sender.
 *
 * Table layout with inline styles for the same reason `lib/email/templates` uses
 * them — inboxes strip <style> blocks and ignore CSS variables. Here it matters
 * doubly, because the HTML also has to survive a copy-paste into a compose box.
 *
 * Client-safe: no env, no server imports.
 */

import { formatMoney, type MarketingContent } from "@/lib/marketing/campaign-content";
import type { MarketingVariant } from "@/lib/marketing/design-variants";

export type EmailTemplateId =
  | "announcement"
  | "tax-credit"
  | "progress"
  | "final-push"
  | "thank-you";

export type EmailTemplateMeta = {
  id: EmailTemplateId;
  name: string;
  description: string;
  /** When in the campaign this one earns its send. */
  timing: string;
};

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: "announcement",
    name: "Campaign announcement",
    description: "Introduces the student and asks friends and family to take a first look.",
    timing: "Send once, right after the campaign is approved.",
  },
  {
    id: "tax-credit",
    name: "How the tax credit works",
    description: "Explains that an Arizona tax credit redirects taxes they already owe.",
    timing: "Best for people who haven't given through a tax credit before.",
  },
  {
    id: "progress",
    name: "Progress update",
    description: "Shows how far the campaign has come and what's still left to raise.",
    timing: "Every two to three weeks while the campaign runs.",
  },
  {
    id: "final-push",
    name: "Final push",
    description: "Names the deadline and the exact gap remaining.",
    timing: "The last week — and again the day before it closes.",
  },
  {
    id: "thank-you",
    name: "Thank you",
    description: "Thanks everyone who gave and tells them what their gift did.",
    timing: "Within a few days of the campaign closing.",
  },
];

export type RenderedEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The parts each template fills in; the shell below handles the rest. */
type EmailBody = {
  subject: string;
  preheader: string;
  kicker?: string;
  headline: string;
  /** Paragraphs, plain text. Escaped on the way into HTML. */
  paragraphs: string[];
  ctaLabel: string;
  /** Show the raised/goal bar under the copy. */
  showProgress: boolean;
  /** Small facts strip: [label, value] pairs. */
  facts?: [string, string][];
  signOff: string;
};

function bodyFor(id: EmailTemplateId, c: MarketingContent): EmailBody {
  const student = c.studentFirstName;
  const school = c.schoolName || "their school";
  const sender = c.parentName || "The family";
  const days = c.daysLeft;

  switch (id) {
    case "announcement":
      return {
        subject: `Help ${student} get to ${school} this year`,
        preheader: `${c.tagline || c.excerpt}`.slice(0, 120),
        kicker: "A note from our family",
        headline: c.title,
        paragraphs: [
          `Hi friends —`,
          c.excerpt ||
            `We've started a scholarship campaign to help ${student} continue at ${school}.`,
          c.description ||
            `Every gift goes directly toward tuition, and Arizona's tax-credit program means most of what you give comes back to you at tax time.`,
          `If you have a minute, take a look at the campaign page. Even sharing it with one other person helps more than you'd think.`,
        ],
        ctaLabel: "See the campaign",
        showProgress: false,
        facts: [
          ["Student", `${student}${c.gradeDisplay ? ` · ${c.gradeDisplay}` : ""}`],
          ["School", school],
          ["Goal", formatMoney(c.goal)],
        ],
        signOff: sender,
      };

    case "tax-credit":
      return {
        subject: `A gift that costs you nothing — ${student}'s tuition`,
        preheader: "Arizona lets you redirect taxes you already owe to a student's tuition.",
        kicker: "Arizona tax credit",
        headline: "Redirect your Arizona taxes to a student",
        paragraphs: [
          `Hi friends —`,
          `Arizona has a program most people have never heard of: instead of sending a portion of your state tax to the state, you can send it to a student's tuition and claim it back dollar-for-dollar as a credit.`,
          `That means a gift to ${student}'s campaign is, for most Arizona filers, cost-neutral. You're not giving money away — you're choosing where money you already owe ends up.`,
          `The campaign page walks through the current limits and takes care of the receipt you'll need at tax time.`,
        ],
        ctaLabel: "See how it works",
        showProgress: false,
        facts: [
          ["Student", student],
          ["School", school],
          ["Receipt", "Emailed automatically"],
        ],
        signOff: sender,
      };

    case "progress":
      return {
        subject: `${c.percent}% of the way there for ${student}`,
        preheader: `${formatMoney(c.raised)} raised toward ${formatMoney(c.goal)}.`,
        kicker: "Campaign update",
        headline: `We're ${c.percent}% of the way there`,
        paragraphs: [
          `Hi friends —`,
          `A quick update: ${c.donorCount} ${c.donorCount === 1 ? "person has" : "people have"} given so far, and ${student}'s campaign has raised ${formatMoney(c.raised)} of the ${formatMoney(c.goal)} goal.`,
          `That leaves ${formatMoney(c.remaining)} to go${days > 0 ? `, with ${days} ${days === 1 ? "day" : "days"} left` : ""}. If you've been meaning to give, now's a good moment.`,
          `And if giving isn't the right fit — forwarding this to one person who might is just as helpful.`,
        ],
        ctaLabel: "Give toward the goal",
        showProgress: true,
        signOff: sender,
      };

    case "final-push":
      return {
        subject:
          days > 0
            ? `${days} ${days === 1 ? "day" : "days"} left — ${formatMoney(c.remaining)} to go`
            : `Last call — ${formatMoney(c.remaining)} to go for ${student}`,
        preheader: `${student}'s campaign closes soon and we're ${formatMoney(c.remaining)} short.`,
        kicker: days > 0 ? `${days} ${days === 1 ? "day" : "days"} left` : "Closing now",
        headline: `${formatMoney(c.remaining)} to go`,
        paragraphs: [
          `Hi friends —`,
          `${student}'s campaign closes ${days > 0 ? `in ${days} ${days === 1 ? "day" : "days"}` : "today"}, and we're ${formatMoney(c.remaining)} short of the ${formatMoney(c.goal)} goal.`,
          `We're genuinely close. If everyone reading this gave what they could, we'd finish it.`,
          `Thank you for carrying this with us.`,
        ],
        ctaLabel: "Close the gap",
        showProgress: true,
        signOff: sender,
      };

    case "thank-you":
      return {
        subject: `Thank you — from ${student} and our family`,
        preheader: `${formatMoney(c.raised)} raised. Here's what it does.`,
        kicker: "Thank you",
        headline: "You did this",
        paragraphs: [
          `Hi friends —`,
          `${c.donorCount} ${c.donorCount === 1 ? "person" : "people"} gave to ${student}'s campaign, and together you raised ${formatMoney(c.raised)}.`,
          `That's tuition. It's a seat in a classroom at ${school}, and a year ${student} gets to spend learning instead of worrying about whether it's possible.`,
          `We're grateful. Truly.`,
        ],
        ctaLabel: "See the campaign",
        showProgress: true,
        signOff: sender,
      };
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

function progressBar(c: MarketingContent, v: MarketingVariant): string {
  const pct = Math.max(2, c.percent); // a sliver, so 0% still reads as a bar
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
      <tr><td style="padding-bottom:8px;font-family:${v.bodyFont};font-size:14px;color:${v.inkSoft};">
        <strong style="color:${v.ink};">${formatMoney(c.raised)}</strong> raised of ${formatMoney(c.goal)} &middot; ${c.percent}%
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${v.line};border-radius:999px;">
          <tr><td width="${pct}%" style="background:${v.accent};border-radius:999px;height:10px;line-height:10px;font-size:0;">&nbsp;</td>
              <td style="font-size:0;line-height:10px;">&nbsp;</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-top:8px;font-family:${v.bodyFont};font-size:13px;color:${v.inkSoft};">
        ${c.donorCount} ${c.donorCount === 1 ? "supporter" : "supporters"}${c.daysLeft > 0 ? ` &middot; ${c.daysLeft} ${c.daysLeft === 1 ? "day" : "days"} left` : ""}
      </td></tr>
    </table>`;
}

function factsStrip(facts: [string, string][], v: MarketingVariant): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;border-top:1px solid ${v.line};">
      ${facts
        .map(
          ([label, value]) => `<tr>
        <td style="padding:10px 0 0;font-family:${v.bodyFont};font-size:13px;color:${v.inkSoft};width:38%;">${escapeHtml(label)}</td>
        <td style="padding:10px 0 0;font-family:${v.bodyFont};font-size:14px;color:${v.ink};font-weight:600;">${escapeHtml(value)}</td>
      </tr>`,
        )
        .join("")}
    </table>`;
}

function renderHtml(body: EmailBody, c: MarketingContent, v: MarketingVariant): string {
  const kicker = body.kicker || v.kicker;
  const onBand = v.band !== v.surface;

  const hero = c.imageUrl
    ? `<tr><td style="padding:0;">
         <img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.title)}" width="600"
              style="display:block;width:100%;max-width:600px;height:${v.heroHeight}px;object-fit:cover;object-position:50% 30%;border:0;" />
       </td></tr>`
    : "";

  // The headline block sits on the variant's band colour when the variant has
  // one; on Clean the band equals the surface, so it reads as plain type.
  const headlineBlock = `
    <tr><td style="background:${v.band};padding:${onBand ? "28px 32px" : "28px 32px 8px"};">
      ${
        kicker
          ? `<p style="margin:0 0 8px;font-family:${v.bodyFont};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${onBand ? v.bandInk : v.accent};opacity:${onBand ? ".85" : "1"};">${escapeHtml(kicker)}</p>`
          : ""
      }
      <h1 style="margin:0;font-family:${v.headingFont};font-size:${v.titleSize}px;line-height:1.2;font-weight:700;color:${onBand ? v.bandInk : v.ink};">${escapeHtml(body.headline)}</h1>
      ${
        c.tagline
          ? `<p style="margin:10px 0 0;font-family:${v.bodyFont};font-size:15px;line-height:1.5;color:${onBand ? v.bandInk : v.inkSoft};opacity:${onBand ? ".9" : "1"};">${escapeHtml(c.tagline)}</p>`
          : ""
      }
    </td></tr>`;

  const paragraphs = body.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${v.bodyFont};font-size:16px;line-height:1.65;color:${v.ink};">${escapeHtml(p)}</p>`,
    )
    .join("");

  const cta = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;">
      <tr><td style="background:${v.accent};border-radius:${v.radius}px;">
        <a href="${escapeHtml(c.donateUrl)}"
           style="display:inline-block;padding:14px 28px;font-family:${v.bodyFont};font-size:16px;font-weight:600;color:${v.accentInk};text-decoration:none;">${escapeHtml(body.ctaLabel)}</a>
      </td></tr>
    </table>
    <p style="margin:12px 0 0;font-family:${v.bodyFont};font-size:13px;color:${v.inkSoft};">
      Or open <a href="${escapeHtml(c.url)}" style="color:${v.accent};">${escapeHtml(c.url)}</a>
    </p>`;

  // Preheader: hidden text the inbox shows next to the subject line.
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(body.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${v.canvas};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
           style="width:100%;max-width:600px;background:${v.surface};border-radius:${v.radius}px;overflow:hidden;${v.canvas === v.surface ? `border:1px solid ${v.line};` : ""}">
      ${v.heroWeight === "dominant" ? hero + headlineBlock : headlineBlock + hero}
      <tr><td style="padding:28px 32px 32px;">
        ${paragraphs}
        ${body.showProgress ? progressBar(c, v) : ""}
        ${body.facts ? factsStrip(body.facts, v) : ""}
        ${cta}
        <p style="margin:28px 0 0;font-family:${v.bodyFont};font-size:16px;line-height:1.6;color:${v.ink};">
          With gratitude,<br /><strong>${escapeHtml(body.signOff)}</strong>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function renderText(body: EmailBody, c: MarketingContent): string {
  const lines = [body.headline.toUpperCase(), ""];
  if (c.tagline) lines.push(c.tagline, "");
  lines.push(...body.paragraphs.flatMap((p) => [p, ""]));
  if (body.showProgress) {
    lines.push(
      `${formatMoney(c.raised)} raised of ${formatMoney(c.goal)} (${c.percent}%) from ${c.donorCount} ${c.donorCount === 1 ? "supporter" : "supporters"}.`,
      "",
    );
  }
  if (body.facts) {
    lines.push(...body.facts.map(([label, value]) => `${label}: ${value}`), "");
  }
  lines.push(`${body.ctaLabel}: ${c.donateUrl}`, "", "With gratitude,", body.signOff);
  return lines.join("\n");
}

export function renderMarketingEmail(
  id: EmailTemplateId,
  content: MarketingContent,
  variant: MarketingVariant,
): RenderedEmail {
  const body = bodyFor(id, content);
  return {
    subject: body.subject,
    preheader: body.preheader,
    html: renderHtml(body, content, variant),
    text: renderText(body, content),
  };
}

/** Standalone document, for the download-as-.html option. */
export function wrapEmailDocument(email: RenderedEmail): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;">
${email.html}
</body>
</html>`;
}
