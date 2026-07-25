import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getMessagingUser, getParticipantIdentities, isParticipant } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

/** Thread messages + participant identities. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await isParticipant(id, me.userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [messages, participants] = await Promise.all([
    prisma.directMessage.findMany({ where: { conversationId: id, deletedAt: null }, orderBy: { createdAt: "asc" }, take: 500 }),
    prisma.conversationParticipant.findMany({ where: { conversationId: id } }),
  ]);
  const identities = await getParticipantIdentities(participants.map((p) => p.userId));

  return NextResponse.json({
    me: { userId: me.userId, name: me.name, role: me.messagingRole },
    participants: participants.map((p) => identities.get(p.userId) ?? { userId: p.userId, name: "Member", avatarUrl: null, role: null }),
    messages: messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() })),
  });
}

/** Send a message in the conversation. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await isParticipant(id, me.userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = (await request.json().catch(() => null)) as { body?: string } | null;
  const text = typeof payload?.body === "string" ? payload.body.trim().slice(0, 5000) : "";
  if (!text) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const message = await prisma.directMessage.create({ data: { conversationId: id, senderId: me.userId, body: text } });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: message.createdAt } });

  // Notify the other participants in-app.
  const others = await prisma.conversationParticipant.findMany({ where: { conversationId: id, userId: { not: me.userId } }, select: { userId: true } });
  if (others.length) {
    await prisma.dashboardNotification.createMany({
      data: others.map((o) => ({
        userId: o.userId,
        title: `New message from ${me.name}`,
        message: text.slice(0, 140),
        notificationType: "direct_message",
      })),
    }).catch(() => null);
  }

  return NextResponse.json({ message: { id: message.id, senderId: message.senderId, body: message.body, createdAt: message.createdAt.toISOString() } });
}

/** Mark read, or hide the conversation for the current user. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const body = (await request.json().catch(() => null)) as { read?: boolean; hidden?: boolean } | null;
  await prisma.conversationParticipant
    .updateMany({
      where: { conversationId: id, userId: me.userId },
      data: {
        ...(body?.read ? { lastReadAt: new Date() } : {}),
        ...(typeof body?.hidden === "boolean" ? { hidden: body.hidden } : {}),
      },
    })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
