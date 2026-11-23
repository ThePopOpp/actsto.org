import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { resolveManagedIds } from "@/lib/agents/lock";
import { fetchIssue, reportToPaperclip } from "@/lib/agents/paperclip";
import { prisma } from "@/lib/prisma";

// Runs one task for one ACT agent as a Claude Managed Agents session.
//
// The agents, environments, vaults and memory stores are defined as files in
// agents/ and environments/ and synced with `ant apply`, which records their
// IDs in claude-lock.json. An ID typed on the AI Agents page wins; otherwise
// it's read from the lock file by the agent's slug.
//
// Every session gets a hard dollar budget, its own vault (the agent's ACT MCP
// token) and its memory store. Tool calls that pause for approval are denied:
// these runs are unattended, and the ACT server already gates anything that
// would reach a person.

const RUN_TIMEOUT_MS = 30 * 60_000;

export { resolveManagedIds };

export function managedAgentsConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** Create the run row. A Paperclip run ID we've seen before returns the existing run. */
export async function queueRun(input: {
  agentId: string;
  source: "paperclip" | "dashboard";
  task: string;
  startedBy: string;
  paperclipRunId?: string | null;
  paperclipIssueId?: string | null;
}): Promise<{ id: string; duplicate: boolean }> {
  if (input.paperclipRunId) {
    const existing = await prisma.agentRun.findUnique({ where: { paperclipRunId: input.paperclipRunId }, select: { id: true } });
    if (existing) return { id: existing.id, duplicate: true };
  }
  try {
    const run = await prisma.agentRun.create({
      data: {
        agentId: input.agentId, source: input.source, task: input.task.slice(0, 8000), startedBy: input.startedBy,
        paperclipRunId: input.paperclipRunId ?? null, paperclipIssueId: input.paperclipIssueId ?? null,
      },
      select: { id: true },
    });
    return { id: run.id, duplicate: false };
  } catch (e) {
    // Two deliveries of the same Paperclip run racing: the unique index decides.
    if (input.paperclipRunId) {
      const existing = await prisma.agentRun.findUnique({ where: { paperclipRunId: input.paperclipRunId }, select: { id: true } });
      if (existing) return { id: existing.id, duplicate: true };
    }
    throw e;
  }
}

function kickoff(task: string, agentName: string) {
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "long", day: "numeric" });
  return `Today is ${today} (Arizona time). You are ${agentName}.\n\nYour task:\n${task.trim()}\n\nWhen you're done, reply with a short summary for staff: what you did, what you found or drafted (with counts), anything that needs a person, and what you'd do next.`;
}

/** Execute a queued run to completion. Never throws; the outcome is written to the run row. */
export async function executeRun(runId: string): Promise<void> {
  const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: { agent: true } });
  if (!run || run.status !== "queued") return;

  const claimed = await prisma.agentRun.updateMany({ where: { id: runId, status: "queued" }, data: { status: "running", startedAt: new Date() } });
  if (!claimed.count) return;

  const finish = async (status: "done" | "blocked" | "failed", data: { summary?: string | null; error?: string | null; costCents?: number | null; sessionId?: string | null }) => {
    await prisma.agentRun.update({ where: { id: runId }, data: { status, finishedAt: new Date(), ...data } }).catch((e) => console.error("[agents] run update failed", e));
    if (run.source === "paperclip" && run.paperclipIssueId && run.paperclipRunId) {
      const link = data.sessionId ? `\n\nSession: https://platform.claude.com/workspaces/default/sessions/${data.sessionId}` : "";
      const body = status === "done" ? `${data.summary || "Finished."}${link}` : `${run.agent.personaName} couldn't finish: ${data.error || data.summary || "unknown error"}${link}`;
      const problem = await reportToPaperclip({ issueId: run.paperclipIssueId, runId: run.paperclipRunId, status: status === "done" ? "done" : "blocked", comment: body.slice(0, 20000) });
      if (problem) await prisma.agentRun.update({ where: { id: runId }, data: { error: [data.error, problem].filter(Boolean).join(" · ").slice(0, 2000) } }).catch(() => {});
    }
  };

  const agent = run.agent;
  if (!agent.enabled) return finish("blocked", { error: `${agent.personaName} is turned off on the AI Agents page.` });
  if (!managedAgentsConfigured()) return finish("failed", { error: "ANTHROPIC_API_KEY isn't set on the server." });
  const ids = await resolveManagedIds(agent);
  const missing = (["agentId", "environmentId", "vaultId"] as const).filter((k) => !ids[k]);
  if (missing.length) {
    return finish("failed", { error: `Missing Managed Agents IDs (${missing.join(", ")}). Run ant apply and commit claude-lock.json, or enter them on the AI Agents page.` });
  }

  let task = run.task;
  if (run.source === "paperclip" && run.paperclipIssueId && run.paperclipRunId) {
    const issue = await fetchIssue(run.paperclipIssueId, run.paperclipRunId);
    if (issue) task = [`${issue.title}`, issue.description, issue.wakeComment ? `Latest comment: ${issue.wakeComment}` : ""].filter(Boolean).join("\n\n");
  }

  const client = new Anthropic();
  let sessionId: string | null = null;
  const texts: string[] = [];
  let outcome: "done" | "blocked" | "failed" = "done";
  let error: string | null = null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), RUN_TIMEOUT_MS);

  try {
    const session = await client.beta.sessions.create({
      agent: ids.agentId!,
      environment_id: ids.environmentId!,
      vault_ids: [ids.vaultId!],
      title: `${agent.personaName}: ${task.split("\n")[0].slice(0, 80)}`,
      metadata: { act_run_id: run.id, act_agent: agent.slug },
      budget: { type: "limit", max_list_cost: { amount: String(Math.max(1, agent.sessionBudgetCents)), currency: "USD" } },
      ...(ids.memoryStoreId
        ? { resources: [{ type: "memory_store" as const, memory_store_id: ids.memoryStoreId, access: "read_write" as const, instructions: "Your working notes for ACTSTO.ORG. Read before starting; update before finishing." }] }
        : {}),
    });
    sessionId = session.id;
    await prisma.agentRun.update({ where: { id: runId }, data: { sessionId } });

    // Stream first, then send the task, so no early events are missed.
    const stream = await client.beta.sessions.events.stream(session.id, undefined, { signal: abort.signal });
    await client.beta.sessions.events.send(session.id, { events: [{ type: "user.message", content: [{ type: "text", text: kickoff(task, agent.personaName) }] }] });

    loop: for await (const event of stream) {
      switch (event.type) {
        case "agent.message":
          for (const block of event.content) if (block.type === "text" && block.text.trim()) texts.push(block.text.trim());
          break;
        case "agent.tool_use":
        case "agent.mcp_tool_use":
          if (event.evaluated_permission === "ask") {
            await client.beta.sessions.events.send(session.id, {
              events: [{ type: "user.tool_confirmation", tool_use_id: event.id, result: "deny", deny_message: "This run is unattended, so calls that need approval are declined. Note it in your summary for staff." }],
            });
          }
          break;
        case "session.error":
          error = (event.error as { message?: string })?.message ?? "Session error";
          break;
        case "session.status_idle": {
          const reason = event.stop_reason.type;
          if (reason === "requires_action") break;
          if (reason === "budget_reached") { outcome = "blocked"; error = `Reached the $${(agent.sessionBudgetCents / 100).toFixed(2)} session budget.`; }
          else if (reason !== "end_turn") { outcome = "failed"; error = error ?? `Stopped: ${reason}.`; }
          break loop;
        }
        case "session.status_terminated":
          if (!texts.length) outcome = "failed";
          break loop;
      }
    }
  } catch (e) {
    if (abort.signal.aborted) {
      outcome = "blocked";
      error = "Ran longer than 30 minutes and was stopped.";
      if (sessionId) await client.beta.sessions.events.send(sessionId, { events: [{ type: "user.interrupt" }] }).catch(() => {});
    } else {
      outcome = "failed";
      error = e instanceof Error ? e.message : String(e);
      console.error("[agents] run failed", runId, e);
    }
  } finally {
    clearTimeout(timer);
  }

  let costCents: number | null = null;
  if (sessionId) {
    const s = await client.beta.sessions.retrieve(sessionId).catch(() => null);
    const amount = s?.usage?.list_cost?.amount;
    if (amount && /^\d+$/.test(amount)) costCents = Number(amount);
  }
  const summary = texts.length ? texts[texts.length - 1].slice(0, 8000) : null;
  await finish(outcome, { summary, error, costCents, sessionId });
}
