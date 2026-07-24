import "server-only";

import { sendSmtpEmail } from "@/lib/email/smtp";
import type { Automation } from "@/lib/business-cards/types";

type LeadInput = { name?: string; email?: string; phone?: string; company?: string; message?: string };

type CardInfo = {
  ownerEmail: string;
  ownerName: string | null;
  cardName: string;
  displayName: string | null;
  automations: Automation[];
};

function leadSummary(lead: LeadInput): string {
  return [
    lead.name && `Name: ${lead.name}`,
    lead.email && `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.company && `Company: ${lead.company}`,
    lead.message && `Message: ${lead.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function textToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;white-space:pre-wrap">${esc}</div>`;
}

/** Runs a card's lead-submit automations (owner email + auto-reply). Never throws. */
export async function runLeadAutomations(card: CardInfo, lead: LeadInput): Promise<void> {
  const rules = (card.automations ?? []).filter((a) => a.enabled && a.trigger === "lead_submit");
  const label = card.displayName || card.cardName || "your card";

  for (const rule of rules) {
    try {
      if (rule.action === "notify_owner_email" && card.ownerEmail) {
        const body = `You received a new lead from your digital business card (${label}):\n\n${leadSummary(lead)}`;
        await sendSmtpEmail({
          to: card.ownerEmail,
          subject: `New lead from ${label}`,
          html: textToHtml(body),
          text: body,
          templateKey: "business_card_lead",
        });
      } else if (rule.action === "autoreply_email" && lead.email) {
        const body =
          rule.message?.trim() ||
          `Thanks for reaching out! I received your details and will follow up shortly.\n\n— ${label}`;
        await sendSmtpEmail({
          to: lead.email,
          subject: `Thanks for connecting with ${label}`,
          html: textToHtml(body),
          text: body,
          templateKey: "business_card_autoreply",
        });
      }
      // notify_owner_sms is deferred until the SMS module is ported.
    } catch {
      // Never fail lead capture because an automation failed.
    }
  }
}
