import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizeStartConversation, getMessagingUser, getParticipantIdentities, messagingRoleFor } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

/** List the signed-in user's conversations (newest first) with last message + unread. */
export async function GET() {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parts = await prisma.conversationParticipant.findMany({
    where: { userId: me.userId, hidden: false },
    include: {
      conversation: {
        include: {
          participants: true,
          messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  parts.sort((a, b) => (a.conversation.lastMessageAt < b.conversation.lastMessageAt ? 1 : -1));

  const otherIds = parts.flatMap((p) => p.conversation.participants.map((cp) => cp.userId)).filter((id) => id !== me.userId);
  const identities = await getParticipantIdentities(otherIds);

  const conversations = await Promise.all(
    parts.map(async (p) => {
      const others = p.conversation.participants.filter((cp) => cp.userId !== me.userId).map((cp) => identities.get(cp.userId) ?? { userId: cp.userId, name: "Member", avatarUrl: null, role: null });
      const last = p.conversation.messages[0] ?? null;
      const unread = await prisma.directMessage.count({
        where: {
          conversationId: p.conversationId,
          deletedAt: null,
          senderId: { not: me.userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      return {
        id: p.conversationId,
        others,
        title: p.conversation.title,
        lastMessage: last ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
        lastMessageAt: p.conversation.lastMessageAt.toISOString(),
        unread,
      };
    }),
  );

  return NextResponse.json({ me: { userId: me.userId, name: me.name, role: me.messagingRole }, conversations });
}

/** Start (or reuse) a 1:1 conversation with a recipient. */
export async function POST(request: Request) {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { recipientId?: string } | null;
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId : "";
  if (!recipientId) return NextResponse.json({ error: "recipientId is required." }, { status: 400 });

  const authorized = await authorizeStartConversation(me, recipientId);
  if (!authorized.ok) return NextResponse.json({ error: authorized.reason }, { status: 403 });

  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: { some: { userId: me.userId } },
      AND: { participants: { some: { userId: recipientId } } },
    },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ id: existing.id, existing: true });

  const recipientRole = await messagingRoleFor(recipientId);
  const created = await prisma.conversation.create({
    data: {
      isGroup: false,
      createdBy: me.userId,
      participants: {
        create: [
          { userId: me.userId, role: me.messagingRole },
          { userId: recipientId, role: recipientRole },
        ],
      },
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id, existing: false });
}
