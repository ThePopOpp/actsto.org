/**
 * The Musk Scholars Fund proposal as an email.
 *
 * Tables and inline styles only: Gmail and Outlook ignore flexbox and grid,
 * which the design export used. Georgia stands in for Fraunces (web fonts
 * don't load in most mail clients). Pure, so scripts/test-proposal-content.mts
 * can check it.
 */

import {
  ASK,
  AVERAGE_SCHOLARSHIP,
  CONTACT_URL,
  impactRows,
  LETTER,
  LONG_HEADLINE,
  NOT_AN_ENDORSEMENT,
  PROPOSAL_COLORS as C,
  type Signer,
} from "@/lib/proposals/musk-scholars-fund/content";

export const DEFAULT_SUBJECT = "A proposal: The Musk Scholars Fund at Arizona Christian Tuition";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export function buildProposalEmail(opts: { signer: Signer; landingUrl: string | null; siteUrl: string; subject?: string }) {
  const { signer, landingUrl, siteUrl } = opts;
  const subject = (opts.subject ?? "").trim() || DEFAULT_SUBJECT;
  const logoUrl = `${siteUrl.replace(/\/$/, "")}/actsto-logo-light.png`;
  const sign = [signer.name, signer.title].map((v) => v?.trim()).filter(Boolean) as string[];
  const reach = ["Arizona Christian Tuition", signer.phone?.trim(), signer.email?.trim()].filter(Boolean) as string[];
  const callHref = signer.email?.trim()
    ? `mailto:${signer.email.trim()}?subject=${encodeURIComponent("Musk Scholars Fund: intro call")}`
    : CONTACT_URL;

  const para = (text: string, extra = "") =>
    `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.ink};${extra}">${esc(text)}</p>`;
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:${primary ? C.red : C.white};color:${primary ? C.white : C.red};border:1px solid ${C.red};font-family:${SANS};font-size:16px;font-weight:600;text-decoration:none">${esc(label)}</a>`;

  const rows = impactRows()
    .map((r, i, all) => {
      const bg = r.proposed ? C.navy : C.white;
      const fg = r.proposed ? C.white : C.ink;
      const border = i < all.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
      const cell = `padding:10px 16px;font-family:${SANS};font-size:15px;color:${fg};background:${bg};${border}${r.proposed ? "font-weight:600;" : ""}`;
      return `<tr><td style="${cell}">${esc(r.proposed ? `${r.label} · proposed` : r.label)}</td><td align="right" style="${cell}text-align:right">${r.studentYears.toLocaleString("en-US")}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.pale}">
<div style="display:none;max-height:0;overflow:hidden">${esc(LETTER.ask)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pale}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="592" cellpadding="0" cellspacing="0" style="width:100%;max-width:592px;background:${C.white};border:1px solid ${C.line};border-radius:12px;overflow:hidden">
  <tr><td style="padding:24px 32px;border-bottom:1px solid ${C.line}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${esc(logoUrl)}" alt="Arizona Christian Tuition" height="36" style="display:block;height:36px;width:auto;border:0"></td>
      <td align="right" style="font-family:${SANS};font-size:13px;color:${C.subtle}">Private proposal</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${C.navy};padding:40px 32px">
    <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${C.red};color:${C.white};font-family:${SANS};font-size:13px;font-weight:600">For Elon Musk</span>
    <h1 style="margin:14px 0 0;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:600;color:${C.white}">${esc(LONG_HEADLINE)}</h1>
  </td></tr>
  <tr><td style="padding:32px 32px 14px">
    ${para(LETTER.salutation)}
    ${LETTER.paragraphs.map((p) => para(p)).join("\n    ")}
    ${para(LETTER.ask, `font-weight:600;color:${C.navy}`)}
  </td></tr>
  <tr><td style="padding:0 32px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:10px;border-collapse:separate;overflow:hidden">
      <tr><td style="padding:10px 16px;background:${C.paler};border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;font-weight:600;color:${C.muted}">Gift</td>
          <td align="right" style="padding:10px 16px;background:${C.paler};border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;font-weight:600;color:${C.muted};text-align:right">Student-years of tuition</td></tr>
      ${rows}
    </table>
    <p style="margin:8px 0 0;font-family:${SANS};font-size:12px;color:${C.subtle}">At ACT's $${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")} target average scholarship.</p>
  </td></tr>
  <tr><td style="padding:24px 32px">
    ${para(LETTER.giving)}
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${landingUrl ? `<td style="padding:0 10px 10px 0">${button(landingUrl, "View the full proposal", true)}</td>` : ""}
      <td style="padding:0 0 10px">${button(callHref, ASK.cta, !landingUrl)}</td>
    </tr></table>
    <p style="margin:18px 0 0;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.ink}">${esc(LETTER.closing)}${sign.length ? `<br>${esc(sign[0])}` : ""}<br><span style="color:${C.muted}">${esc([...sign.slice(1), ...reach].join(" · "))}</span></p>
  </td></tr>
  <tr><td style="padding:20px 32px;background:${C.paler};border-top:1px solid ${C.line};font-family:${SANS};font-size:12px;line-height:1.55;color:${C.subtle}">
    Deductions subject to IRS limits; Arizona credits subject to statutory caps. Scholarships are awarded by ACT under Arizona STO rules. Not tax advice. ${esc(NOT_AN_ENDORSEMENT)} · actsto.org
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    LONG_HEADLINE,
    "",
    LETTER.salutation,
    "",
    ...LETTER.paragraphs.flatMap((p) => [p, ""]),
    LETTER.ask,
    "",
    ...impactRows().map((r) => `${r.proposed ? `${r.label} (proposed)` : r.label}: ${r.studentYears.toLocaleString("en-US")} student-years of tuition`),
    `(At ACT's $${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")} target average scholarship.)`,
    "",
    LETTER.giving,
    "",
    ...(landingUrl ? [`View the full proposal: ${landingUrl}`] : []),
    `${ASK.cta}: ${signer.email?.trim() || CONTACT_URL}`,
    "",
    LETTER.closing,
    ...sign.slice(0, 1),
    [...sign.slice(1), ...reach].join(" · "),
    "",
    "Deductions subject to IRS limits; Arizona credits subject to statutory caps. Not tax advice.",
    NOT_AN_ENDORSEMENT,
  ].join("\n");

  return { subject, html, text };
}
