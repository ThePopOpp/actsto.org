/**
 * Reusable body components for email templates.
 *
 * These sit between `renderEmailLayout` (the branded shell — masthead, hero,
 * signature, footer) and an individual template (the words). Anything that more
 * than one email needs to draw belongs here, so a progress bar looks the same
 * in a milestone email as it does in a closing-soon email.
 *
 * Tables and inline styles throughout, for the usual reason: Gmail and Outlook
 * strip `<style>` blocks, ignore CSS variables, and have opinions about flexbox.
 */

import { EMAIL_BRAND, escapeHtml } from "@/lib/email/templates/layout";

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_SERIF = "Georgia,'Times New Roman',serif";

export function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 15px;font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${EMAIL_BRAND.ink}">${text}</p>`;
}

/**
 * A single oversized figure — the thing the email is about.
 *
 * Used where one number carries the message: the gap remaining, the percentage
 * funded, the total raised. Anything more than one number belongs in `statRow`.
 */
export function bigFigure(value: string, caption: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px">
    <tr>
      <td align="center" style="padding:26px 20px;background:${EMAIL_BRAND.paper};border-radius:12px;border:1px solid ${EMAIL_BRAND.line}">
        <p style="margin:0;font-family:${FONT_SERIF};font-size:44px;line-height:1.05;font-weight:700;color:${EMAIL_BRAND.navy}">${escapeHtml(value)}</p>
        <p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:14px;color:${EMAIL_BRAND.inkSoft}">${escapeHtml(caption)}</p>
      </td>
    </tr>
  </table>`;
}

/**
 * Two to four figures side by side.
 *
 * A table rather than divs: Outlook's word engine collapses inline-block, and
 * these have to stay on one row down to about 480px.
 */
export function statRow(stats: { label: string; value: string }[]): string {
  if (stats.length === 0) return "";
  const width = `${(100 / stats.length).toFixed(2)}%`;
  const cells = stats
    .map(
      (s) => `
      <td width="${width}" align="center" style="padding:16px 8px;vertical-align:top">
        <p style="margin:0;font-family:${FONT_SERIF};font-size:24px;font-weight:700;color:${EMAIL_BRAND.navy};line-height:1.1">${escapeHtml(s.value)}</p>
        <p style="margin:5px 0 0;font-family:${FONT_SANS};font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:${EMAIL_BRAND.inkFaint}">${escapeHtml(s.label)}</p>
      </td>`,
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;background:${EMAIL_BRAND.paper};border-radius:12px;border:1px solid ${EMAIL_BRAND.line}">
    <tr>${cells}</tr>
  </table>`;
}

/**
 * Raised-against-goal bar.
 *
 * The bar is a two-cell table with a percentage width, which is the only
 * approach that renders in every client — a div with a background gradient
 * disappears in Outlook.
 */
export function progressBar(args: {
  raised: number;
  goal: number;
  donorCount?: number;
  daysLeft?: number | null;
}): string {
  const { raised, goal, donorCount, daysLeft } = args;
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  // A sliver at 0%, so an empty bar still reads as a bar rather than a rule.
  const fill = Math.max(2, percent);
  const meta = [
    donorCount !== undefined
      ? `${donorCount} ${donorCount === 1 ? "supporter" : "supporters"}`
      : null,
    daysLeft !== undefined && daysLeft !== null && daysLeft > 0
      ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
      : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px">
    <tr>
      <td style="padding-bottom:9px;font-family:${FONT_SANS};font-size:14px;color:${EMAIL_BRAND.inkSoft}">
        <strong style="color:${EMAIL_BRAND.ink};font-size:16px">${money(raised)}</strong> raised of ${money(goal)} &middot; ${percent}%
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.line};border-radius:99px">
          <tr>
            <td width="${fill}%" style="background:${EMAIL_BRAND.red};border-radius:99px;height:10px;line-height:10px;font-size:0">&nbsp;</td>
            <td style="font-size:0;line-height:10px">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
    ${
      meta
        ? `<tr><td style="padding-top:9px;font-family:${FONT_SANS};font-size:13px;color:${EMAIL_BRAND.inkFaint}">${meta}</td></tr>`
        : ""
    }
  </table>`;
}

export type CampaignCard = {
  title: string;
  studentLine: string;
  url: string;
  imageUrl?: string | null;
  raised: number;
  goal: number;
  donorCount: number;
  daysLeft: number;
};

/**
 * One campaign in a digest — photo, name, and the numbers that decide whether
 * someone clicks.
 */
export function campaignCard(campaign: CampaignCard): string {
  const percent =
    campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border:1px solid ${EMAIL_BRAND.line};border-radius:12px;overflow:hidden">
    ${
      campaign.imageUrl
        ? `<tr><td style="padding:0">
             <a href="${escapeHtml(campaign.url)}" style="display:block">
               <img src="${escapeHtml(campaign.imageUrl)}" alt="" width="600"
                    style="display:block;width:100%;height:150px;object-fit:cover;object-position:50% 30%;border:0">
             </a>
           </td></tr>`
        : ""
    }
    <tr>
      <td style="padding:16px 18px">
        <a href="${escapeHtml(campaign.url)}" style="text-decoration:none">
          <p style="margin:0;font-family:${FONT_SERIF};font-size:18px;font-weight:700;color:${EMAIL_BRAND.navy}">${escapeHtml(campaign.title)}</p>
        </a>
        <p style="margin:4px 0 12px;font-family:${FONT_SANS};font-size:13px;color:${EMAIL_BRAND.inkSoft}">${escapeHtml(campaign.studentLine)}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.line};border-radius:99px">
          <tr>
            <td width="${Math.max(2, percent)}%" style="background:${EMAIL_BRAND.red};border-radius:99px;height:7px;line-height:7px;font-size:0">&nbsp;</td>
            <td style="font-size:0;line-height:7px">&nbsp;</td>
          </tr>
        </table>

        <p style="margin:9px 0 0;font-family:${FONT_SANS};font-size:13px;color:${EMAIL_BRAND.inkSoft}">
          <strong style="color:${EMAIL_BRAND.ink}">${money(campaign.raised)}</strong> of ${money(campaign.goal)}
          &middot; ${campaign.donorCount} ${campaign.donorCount === 1 ? "supporter" : "supporters"}
          ${campaign.daysLeft > 0 ? `&middot; ${campaign.daysLeft} ${campaign.daysLeft === 1 ? "day" : "days"} left` : "&middot; closing"}
        </p>
      </td>
    </tr>
  </table>`;
}

/** Numbered steps — "here's how it works", in three moves. */
export function steps(items: { title: string; body: string }[]): string {
  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td width="34" valign="top" style="padding:0 12px 16px 0">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td width="26" height="26" align="center"
                    style="background:${EMAIL_BRAND.navy};border-radius:50%;font-family:${FONT_SANS};font-size:13px;font-weight:700;color:#ffffff">${i + 1}</td></tr>
          </table>
        </td>
        <td valign="top" style="padding:0 0 16px">
          <p style="margin:0 0 3px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${EMAIL_BRAND.ink}">${escapeHtml(item.title)}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${EMAIL_BRAND.inkSoft}">${escapeHtml(item.body)}</p>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px">${rows}</table>`;
}

/** A quiet aside — context that shouldn't compete with the main message. */
export function calloutBox(title: string, body: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px">
    <tr>
      <td style="padding:15px 17px;background:${EMAIL_BRAND.paper};border-left:3px solid ${EMAIL_BRAND.red};border-radius:0 8px 8px 0">
        <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:13px;font-weight:700;color:${EMAIL_BRAND.navy}">${escapeHtml(title)}</p>
        <p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${EMAIL_BRAND.inkSoft}">${escapeHtml(body)}</p>
      </td>
    </tr>
  </table>`;
}
