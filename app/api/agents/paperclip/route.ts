import { after } from "next/server";

import { executeRun, queueRun } from "@/lib/agents/managed";
import { parseWake, verifyWebhook } from "@/lib/agents/paperclip";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paperclip's HTTP adapter wakes an ACT agent here. In Paperclip, give each
// agent adapterType "http" with
//   url:     https://actsto.org/api/agents/paperclip
//   headers: { "Authorization": "Bearer <PAPERCLIP_WEBHOOK_SECRET>" }
// and put the Paperclip agent's ID on the matching card in Dashboard > AI Agents.
//
// We acknowledge with 202 at once (Paperclip wants an ack, not the result),
// run the Managed Agents session in the background, and report back on the
// issue with a comment and status. A repeated runId never starts a second run.
export async function POST(req: Request) {
  if (!verifyWebhook(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const wake = parseWake(await req.json().catch(() => null));
  if (!wake) return Response.json({ error: "Expected { agentId, runId, context }." }, { status: 400 });

  const agent = await prisma.agentIdentity.findUnique({ where: { paperclipAgentId: wake.agentId }, select: { id: true, enabled: true, personaName: true } });
  if (!agent) return Response.json({ error: "No ACT agent is linked to that Paperclip agent." }, { status: 404 });
  if (!agent.enabled) return Response.json({ error: `${agent.personaName} is turned off in ACTSTO.ORG.` }, { status: 409 });

  const task = wake.taskId
    ? `Paperclip task ${wake.taskId}${wake.wakeReason ? ` (${wake.wakeReason})` : ""}.`
    : `Scheduled check-in${wake.wakeReason ? ` (${wake.wakeReason})` : ""}: review your memory and do the most useful next piece of your standing work.`;

  const { id, duplicate } = await queueRun({
    agentId: agent.id, source: "paperclip", task, startedBy: `paperclip:${wake.agentId}`,
    paperclipRunId: wake.runId, paperclipIssueId: wake.taskId,
  });
  if (!duplicate) after(() => executeRun(id));
  return Response.json({ accepted: true, runId: id, duplicate }, { status: 202 });
}
