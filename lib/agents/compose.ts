import "server-only";

import { unsubscribeUrl } from "@/lib/consent/unsubscribe-link";
import { escapeHtml } from "@/lib/email/templates/layout";

// Pure pieces of agent outreach (no database), so they can be unit-tested:
// the AI disclosure footer, the unsubscribe headers, and who it's sent as.

export const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://actsto.org").replace(/\/$/, "");

const postal = () => process.env.ACT_POSTAL_ADDRESS || "Arizona Christian Tuition · Arizona, USA";

export function composeAgentEmail(opts: { bodyText: string; personaName: string | null; toEmail: string; origin?: string }) {
  const unsub = unsubscribeUrl(opts.origin ?? siteOrigin(), opts.toEmail);
  const who = opts.personaName ? `${opts.personaName}, an AI assistant for Arizona Christian Tuition` : "an AI assistant for Arizona Christian Tuition";
  const disclosure = `This message was written by ${who} and reviewed by our staff. Reply to reach a person.`;

  const text = `${opts.bodyText.trim()}\n\n--\n${disclosure}\n${postal()}\nUnsubscribe: ${unsub}`;
  const paragraphs = opts.bodyText
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const small = "font-family:Arial,sans-serif;font-size:12px;color:#5b6b82;margin:0 0 4px";
  const html =
    `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#091b36;max-width:600px">${paragraphs}` +
    `<hr style="border:0;border-top:1px solid #dbe5f1;margin:24px 0 12px">` +
    `<p style="${small}">${escapeHtml(disclosure)}</p>` +
    `<p style="${small}">${escapeHtml(postal())}</p>` +
    `<p style="${small}"><a href="${escapeHtml(unsub)}" style="color:#5b6b82">Unsubscribe</a></p></div>`;
  const headers = { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return { text, html, headers, unsubscribeUrl: unsub };
}

/**
 * Who an agent's email goes out as. Sending as the agent's own mailbox only
 * works when it shares the provider's verified domain; otherwise it goes from
 * the verified default and replies go to the agent.
 */
export function senderFor(mailbox: string | null, personaName: string | null, verifiedFromEmail: string): { from?: { name: string; email: string }; replyTo?: string } {
  if (!mailbox) return {};
  const domain = (e: string) => e.split("@")[1]?.toLowerCase() ?? "";
  const name = personaName ? `${personaName} (AI assistant) · ACTSTO` : "ACTSTO AI assistant";
  if (verifiedFromEmail && domain(verifiedFromEmail) === domain(mailbox)) return { from: { name, email: mailbox }, replyTo: mailbox };
  return { replyTo: mailbox };
}
