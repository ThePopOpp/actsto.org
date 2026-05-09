import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { AddressObject } from "mailparser";

import { getImapConfig } from "@/lib/email/config";
import { prisma } from "@/lib/prisma";

function firstAddress(value: AddressObject | AddressObject[] | undefined) {
  const object = Array.isArray(value) ? value[0] : value;
  return object?.value?.[0] ?? null;
}

function normalizeMessageId(value: string | undefined) {
  return value?.replace(/[<>]/g, "").trim() || undefined;
}

export async function syncImapInbox({ limit = 25 }: { limit?: number } = {}) {
  const config = getImapConfig();
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const status = await client.status(config.mailbox, { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) return { imported: 0, scanned: 0 };

      const start = Math.max(1, total - limit + 1);
      let imported = 0;
      let scanned = 0;

      for await (const msg of client.fetch(`${start}:*`, { source: true, envelope: true, flags: true })) {
        scanned += 1;
        if (!msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const providerMessageId = normalizeMessageId(parsed.messageId);
        if (!providerMessageId) continue;

        const existing = await prisma.emailMessage.findUnique({
          where: { providerMessageId },
          select: { id: true },
        });
        if (existing) continue;

        const from = firstAddress(parsed.from);
        const to = firstAddress(parsed.to);
        const receivedAt = parsed.date ?? new Date();
        const subject = parsed.subject ?? "(No subject)";
        const text = parsed.text?.trim() || parsed.textAsHtml?.replace(/<[^>]+>/g, " ").trim() || "";

        const thread = await prisma.emailThread.create({
          data: {
            channel: "email",
            subject,
            fromName: from?.name || from?.address || "Unknown sender",
            fromEmail: from?.address?.toLowerCase() ?? null,
            unread: !(msg.flags?.has("\\Seen") ?? false),
            lastMessageAt: receivedAt,
            messages: {
              create: {
                providerMessageId,
                direction: "inbound",
                fromName: from?.name || null,
                fromEmail: from?.address?.toLowerCase() ?? null,
                toEmail: to?.address?.toLowerCase() ?? config.user.toLowerCase(),
                subject,
                bodyText: text,
                bodyHtml: parsed.html || null,
                receivedAt,
                raw: {
                  uid: msg.uid,
                  flags: [...(msg.flags ?? [])],
                },
              },
            },
          },
          select: { id: true },
        });

        if (thread.id) imported += 1;
      }

      return { imported, scanned };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}
