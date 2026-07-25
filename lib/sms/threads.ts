import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

export type SmsThreadMessage = {
  id: string;
  direction: string;
  message: string;
  status: string | null;
  errorMessage: string | null;
  createdAt: string;
  fromPhone: string | null;
  toPhone: string;
};

export type SmsThread = {
  phone: string;
  contactName: string | null;
  roleType: string | null;
  campaignId: string | null;
  campaignTitle: string | null;
  contactSource: string | null;
  lastMessage: string;
  lastAt: string;
  lastDirection: string;
  total: number;
  needsReply: boolean;
  messages: SmsThreadMessage[];
};

type SmsRow = Awaited<ReturnType<typeof prisma.smsLog.findMany>>[number];

/** The "other party" phone for a row — the number a Super Admin is conversing with. */
function counterparty(row: SmsRow): string {
  const raw = row.direction === "inbound" ? row.fromPhone ?? "" : row.toPhone;
  return normalizePhone(raw) || raw || "unknown";
}

/**
 * Group flat sms_logs rows into per-contact conversations (newest thread first,
 * messages within a thread ordered oldest→newest). Hidden rows are excluded.
 */
export async function getSmsThreads(limit = 1000): Promise<SmsThread[]> {
  const rows = await prisma.smsLog
    .findMany({ where: { hidden: false }, orderBy: { createdAt: "desc" }, take: limit })
    .catch(() => [] as SmsRow[]);

  const campaignIds = Array.from(new Set(rows.map((r) => r.campaignId).filter(Boolean))) as string[];
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, title: true } })
    : [];
  const campaignTitle = new Map(campaigns.map((c) => [c.id, c.title]));

  const threads = new Map<string, SmsThread>();
  for (const row of rows) {
    const phone = counterparty(row);
    const message: SmsThreadMessage = {
      id: row.id,
      direction: row.direction,
      message: row.message,
      status: row.status,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      fromPhone: row.fromPhone,
      toPhone: row.toPhone,
    };

    const existing = threads.get(phone);
    if (existing) {
      existing.messages.push(message);
      existing.total += 1;
      // rows arrive newest-first, so fill richer contact metadata from any row that has it
      existing.contactName ??= row.contactName;
      existing.roleType ??= row.roleType;
      existing.contactSource ??= row.contactSource;
      if (!existing.campaignId && row.campaignId) {
        existing.campaignId = row.campaignId;
        existing.campaignTitle = campaignTitle.get(row.campaignId) ?? null;
      }
      continue;
    }

    threads.set(phone, {
      phone,
      contactName: row.contactName,
      roleType: row.roleType,
      campaignId: row.campaignId,
      campaignTitle: row.campaignId ? campaignTitle.get(row.campaignId) ?? null : null,
      contactSource: row.contactSource,
      lastMessage: row.message,
      lastAt: row.createdAt.toISOString(),
      lastDirection: row.direction,
      total: 1,
      needsReply: row.direction === "inbound",
      messages: [message],
    });
  }

  // messages were pushed newest→oldest; flip to chronological for display
  for (const thread of threads.values()) thread.messages.reverse();

  return Array.from(threads.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}
