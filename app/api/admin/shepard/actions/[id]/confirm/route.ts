import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { getShepardTool } from "@/lib/shepard/tools";

/** Tool results are `unknown` at the type level but are always JSON-serializable in practice. */
function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

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

  const tool = getShepardTool(action.toolName);
  if (!tool) {
    return NextResponse.json({ error: `Unknown tool "${action.toolName}".` }, { status: 400 });
  }

  const args = action.argsJson as Record<string, unknown>;
  let result: unknown;
  let status: "executed" | "failed" = "executed";
  try {
    result = await tool.execute(args, { adminEmail: auth.email });
  } catch (error) {
    status = "failed";
    result = { error: error instanceof Error ? error.message : "Tool execution failed." };
  }

  const [updatedAction] = await prisma.$transaction([
    prisma.shepardAction.update({
      where: { id },
      data: { status, resultJson: toJsonValue(result), executedByEmail: auth.email, executedAt: new Date() },
    }),
    prisma.shepardMessage.create({
      data: {
        conversationId: action.conversationId,
        role: "tool",
        content: JSON.stringify(result),
        toolCallsJson: { tool_call_id: action.toolCallId },
      },
    }),
    prisma.adminActivityLog.create({
      data: {
        action: `shepard:${action.toolName}`,
        entityType: "shepard_action",
        entityId: action.id,
        beforeData: toJsonValue({ args }),
        afterData: toJsonValue({ adminEmail: auth.email, status, result }),
      },
    }),
  ]);

  return NextResponse.json({ action: updatedAction, result });
}
