import { NextResponse } from "next/server";
import type OpenAI from "openai";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient, SHEPARD_MODEL, SHEPARD_SYSTEM_PROMPT } from "@/lib/shepard/client";
import { getShepardTool, SHEPARD_TOOLS } from "@/lib/shepard/tools";

const MAX_TOOL_ITERATIONS = 5;

type ToolCallMeta = { tool_call_id: string };

function toOpenAiTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return SHEPARD_TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

async function loadHistory(conversationId: string): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const messages = await prisma.shepardMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content ?? "" });
    } else if (m.role === "assistant") {
      const toolCalls = m.toolCallsJson as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | null;
      out.push({
        role: "assistant",
        content: m.content,
        ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
    } else if (m.role === "tool") {
      const meta = m.toolCallsJson as ToolCallMeta | null;
      if (meta?.tool_call_id) {
        out.push({ role: "tool", content: m.content ?? "", tool_call_id: meta.tool_call_id });
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { conversationId?: string; message?: string } | null;
  const messageText = (body?.message ?? "").trim();
  if (!messageText) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  let conversationId = body?.conversationId;
  if (conversationId) {
    const existing = await prisma.shepardConversation.findUnique({ where: { id: conversationId } });
    if (!existing || existing.adminEmail !== auth.email) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    const unresolved = await prisma.shepardAction.count({ where: { conversationId, status: "pending" } });
    if (unresolved > 0) {
      return NextResponse.json(
        { error: "Resolve Shepard's pending action(s) in this conversation before sending another message." },
        { status: 409 }
      );
    }
  } else {
    const conversation = await prisma.shepardConversation.create({
      data: { adminEmail: auth.email, title: messageText.slice(0, 80) },
    });
    conversationId = conversation.id;
  }

  await prisma.shepardMessage.create({ data: { conversationId, role: "user", content: messageText } });

  const client = getOpenAIClient();
  const tools = toOpenAiTools();
  const pendingActions: { id: string; toolName: string; args: Record<string, unknown>; summary: string }[] = [];
  let finalText: string | null = null;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const history = await loadHistory(conversationId);
    const response = await client.chat.completions.create({
      model: SHEPARD_MODEL,
      messages: [{ role: "system", content: SHEPARD_SYSTEM_PROMPT }, ...history],
      tools,
    });

    const choice = response.choices[0];
    // We only ever register `type: "function"` tools, so narrow away the custom-tool-call variant.
    const toolCalls = (choice.message.tool_calls ?? []).filter(
      (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === "function"
    );

    if (!toolCalls.length) {
      finalText = choice.message.content ?? "";
      await prisma.shepardMessage.create({ data: { conversationId, role: "assistant", content: finalText } });
      break;
    }

    const assistantMessage = await prisma.shepardMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: choice.message.content,
        toolCallsJson: toolCalls as unknown as object,
      },
    });

    const readOnlyCalls = toolCalls.filter((tc) => !getShepardTool(tc.function.name)?.mutating);
    const mutatingCalls = toolCalls.filter((tc) => getShepardTool(tc.function.name)?.mutating);

    for (const tc of readOnlyCalls) {
      const tool = getShepardTool(tc.function.name);
      let result: unknown;
      try {
        const args = JSON.parse(tc.function.arguments || "{}");
        result = tool ? await tool.execute(args, { adminEmail: auth.email }) : { error: "Unknown tool." };
      } catch (error) {
        result = { error: error instanceof Error ? error.message : "Tool failed." };
      }
      await prisma.shepardMessage.create({
        data: {
          conversationId,
          role: "tool",
          content: JSON.stringify(result),
          toolCallsJson: { tool_call_id: tc.id } satisfies ToolCallMeta,
        },
      });
    }

    if (mutatingCalls.length) {
      for (const tc of mutatingCalls) {
        const tool = getShepardTool(tc.function.name);
        const args = JSON.parse(tc.function.arguments || "{}");
        const action = await prisma.shepardAction.create({
          data: {
            conversationId,
            messageId: assistantMessage.id,
            toolCallId: tc.id,
            toolName: tc.function.name,
            argsJson: args,
          },
        });
        pendingActions.push({ id: action.id, toolName: tc.function.name, args, summary: tool?.description ?? tc.function.name });
      }
      break;
    }

    if (!readOnlyCalls.length) break;
  }

  return NextResponse.json({ conversationId, reply: finalText, pendingActions });
}
