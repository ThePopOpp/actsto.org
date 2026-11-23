import "server-only";

import { logAdminActivity } from "@/lib/admin/audit";
import { composeAgentEmail, senderFor, siteOrigin } from "@/lib/agents/compose";
import { contactKeyFor, getContactState } from "@/lib/consent/data";
import { getResendConfig, getSmtpConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";

// The only path by which an agent-written email reaches a person. An agent
// can create a draft; a Super Admin approves it here. Every send:
//   - refuses anyone who has unsubscribed
//   - respects the agent's daily cap
//   - says plainly that an AI assistant wrote it, with a one-click unsubscribe
//   - is claimed atomically, so a double click can't send twice

export { siteOrigin };

export class OutboundError extends Error {}

function verifiedFromEmail(): string {
  const resend = getResendConfig();
  if (resend) return resend.fromEmail;
  try {
    return getSmtpConfig().fromEmail;
  } catch {
    return "";
  }
}

export async function sentTodayByAgent(agentId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return prisma.outboundDraft.count({ where: { agentId, status: "sent", sentAt: { gte: start } } });
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  const state = await getContactState("email", contactKeyFor("email", email));
  return state?.status === "unsubscribed";
}

export async function rejectDraft(draftId: string, reviewerEmail: string, note?: string) {
  const res = await prisma.outboundDraft.updateMany({
    where: { id: draftId, status: { in: ["pending", "approved"] } },
    data: { status: "rejected", reviewNote: note?.slice(0, 1000) ?? null, reviewedByEmail: reviewerEmail, reviewedAt: new Date() },
  });
  if (!res.count) throw new OutboundError("This draft was already handled.");
  await logAdminActivity({ actorEmail: reviewerEmail, action: "agent_draft_rejected", entityType: "outbound_draft", entityId: draftId, after: { note } });
}

/** Approve and send one draft. Optional edits replace the subject/body first. */
export async function approveAndSendDraft(draftId: string, reviewerEmail: string, edits?: { subject?: string; bodyText?: string }) {
  const draft = await prisma.outboundDraft.findUnique({ where: { id: draftId }, include: { agent: true } });
  if (!draft) throw new OutboundError("Draft not found.");
  if (draft.status !== "pending" && draft.status !== "approved") throw new OutboundError(`This draft is already ${draft.status}.`);

  if (await isUnsubscribed(draft.toEmail)) {
    await prisma.outboundDraft.update({ where: { id: draft.id }, data: { status: "rejected", reviewNote: "Recipient has unsubscribed.", reviewedByEmail: reviewerEmail, reviewedAt: new Date() } });
    throw new OutboundError(`${draft.toEmail} has unsubscribed. The draft was closed and nothing was sent.`);
  }
  if (draft.agent) {
    if (!draft.agent.enabled) throw new OutboundError(`${draft.agent.personaName} is turned off. Turn the agent on to send its drafts.`);
    const sent = await sentTodayByAgent(draft.agent.id);
    if (sent >= draft.agent.dailySendCap) throw new OutboundError(`${draft.agent.personaName} has reached today's limit of ${draft.agent.dailySendCap} emails. Try again tomorrow or raise the cap.`);
  }

  const subject = (edits?.subject ?? draft.subject).trim();
  const bodyText = (edits?.bodyText ?? draft.bodyText).trim();
  if (!subject || !bodyText) throw new OutboundError("Subject and message are required.");

  // Claim it: only one request can move it to "sending".
  const claimed = await prisma.outboundDraft.updateMany({
    where: { id: draft.id, status: { in: ["pending", "approved"] } },
    data: { status: "sending", subject, bodyText, reviewedByEmail: reviewerEmail, reviewedAt: new Date() },
  });
  if (!claimed.count) throw new OutboundError("This draft is already being sent.");

  const { text, html, headers } = composeAgentEmail({ bodyText, personaName: draft.agent?.personaName ?? null, toEmail: draft.toEmail });
  const sender = senderFor(draft.agent?.mailbox ?? null, draft.agent?.personaName ?? null, verifiedFromEmail());
  try {
    const result = await sendEmail({ to: draft.toEmail, subject, text, html, headers, templateKey: "agent_outreach", ...sender });
    await prisma.outboundDraft.update({ where: { id: draft.id }, data: { status: "sent", sentAt: new Date(), providerMessageId: result.messageId || null, error: null } });
    if (draft.contactId) {
      await prisma.contact.update({ where: { id: draft.contactId }, data: { lastContactedAt: new Date(), stage: "contacted" } }).catch(() => {});
    }
    await logAdminActivity({ actorEmail: reviewerEmail, action: "agent_draft_sent", entityType: "outbound_draft", entityId: draft.id, after: { to: draft.toEmail, subject, agent: draft.agent?.slug } });
    return { sent: true as const, messageId: result.messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.outboundDraft.update({ where: { id: draft.id }, data: { status: "failed", error: message.slice(0, 1000) } });
    throw new OutboundError(`Sending failed: ${message}`);
  }
}
