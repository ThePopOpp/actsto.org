import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const action = await prisma.shepardAction.findUnique({
    where: { id },
    include: { conversation: true },
  });
  if (!action || action.conversation.adminEmail !== auth.email) {
    return NextResponse.json({ error: "Action not found." }, { status: 404 });
  }
  if (action.status !== "pending") {
    return NextResponse.json({ error: `This action was already ${action.status}.` }, { status: 409 });
  }

  const [updatedAction] = await prisma.$transaction([
    prisma.shepardAction.update({
      where: { id },
      data: { status: "rejected", executedByEmail: auth.email, executedAt: new Date() },
    }),
    prisma.shepardMessage.create({
      data: {
        conversationId: action.conversationId,
        role: "tool",
        content: JSON.stringify({ rejected: true, message: "The admin declined this action." }),
        toolCallsJson: { tool_call_id: action.toolCallId },
      },
    }),
  ]);

  return NextResponse.json({ action: updatedAction });
}
