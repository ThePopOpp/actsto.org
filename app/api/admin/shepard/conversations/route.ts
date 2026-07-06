import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

/** Latest conversation for this admin, with visible messages (tool-role messages are internal plumbing) and any pending actions. */
export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const conversation = await prisma.shepardConversation.findFirst({
    where: { adminEmail: auth.email },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { where: { role: { in: ["user", "assistant"] } }, orderBy: { createdAt: "asc" } },
      actions: { where: { status: "pending" }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return NextResponse.json({ conversation: null });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      messages: conversation.messages
        .filter((m) => m.content)
        .map((m) => ({ id: m.id, role: m.role, content: m.content })),
      pendingActions: conversation.actions.map((a) => ({
        id: a.id,
        toolName: a.toolName,
        args: a.argsJson,
      })),
    },
  });
}
