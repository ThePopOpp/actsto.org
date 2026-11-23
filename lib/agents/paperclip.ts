import "server-only";

import { timingSafeEqual } from "node:crypto";

// Paperclip is the manager: it owns the org chart, assigns tasks ("issues"),
// runs heartbeats and tracks budgets. It wakes an ACT agent through its HTTP
// adapter, which POSTs { agentId, runId, context: { taskId, wakeReason,
// commentId } } to /api/agents/paperclip with the shared secret we gave it.
// We answer 202 straight away, do the work, then report back on the issue.
//
// Env (Coolify only, never committed):
//   PAPERCLIP_API_URL        e.g. https://paperclip.example.com
//   PAPERCLIP_API_KEY        a board or agent API key for the ACT company
//   PAPERCLIP_WEBHOOK_SECRET what the HTTP adapter sends as "Authorization: Bearer ..."

const clean = (v: string | undefined) => (v ?? "").trim() || undefined;

export function paperclipConfig() {
  const url = clean(process.env.PAPERCLIP_API_URL)?.replace(/\/+$/, "");
  const apiKey = clean(process.env.PAPERCLIP_API_KEY);
  const webhookSecret = clean(process.env.PAPERCLIP_WEBHOOK_SECRET);
  return { url, apiKey, webhookSecret, canReport: Boolean(url && apiKey) };
}

/** Constant-time check of the adapter's shared secret. Refuses if none is set. */
export function verifyWebhook(req: Request): boolean {
  const secret = paperclipConfig().webhookSecret;
  if (!secret || secret.length < 32) return false;
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (!m) return false;
  const a = Buffer.from(m[1].trim()), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaperclipWake = { agentId: string; runId: string; taskId: string | null; wakeReason: string | null; commentId: string | null };

/** Parse the adapter's body. Unknown extra fields are ignored. */
export function parseWake(body: unknown): PaperclipWake | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const ctx = (b.context && typeof b.context === "object" ? b.context : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const agentId = str(b.agentId);
  const runId = str(b.runId);
  if (!agentId || !runId) return null;
  return { agentId, runId, taskId: str(ctx.taskId ?? ctx.issueId), wakeReason: str(ctx.wakeReason, 60), commentId: str(ctx.commentId) };
}

async function call(path: string, init: RequestInit & { runId?: string }, timeoutMs = 15_000): Promise<Response> {
  const cfg = paperclipConfig();
  if (!cfg.url || !cfg.apiKey) throw new Error("Paperclip isn't configured (PAPERCLIP_API_URL, PAPERCLIP_API_KEY).");
  const headers: Record<string, string> = { Authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" };
  if (init.runId) headers["X-Paperclip-Run-Id"] = init.runId;
  return fetch(`${cfg.url}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) }, signal: AbortSignal.timeout(timeoutMs) });
}

/** The task's title and description, to hand to the agent. */
export async function fetchIssue(issueId: string, runId: string): Promise<{ title: string; description: string; wakeComment?: string } | null> {
  const id = encodeURIComponent(issueId);
  const ctx = await call(`/api/issues/${id}/heartbeat-context`, { method: "GET", runId }).catch(() => null);
  if (ctx?.ok) {
    const j = (await ctx.json().catch(() => ({}))) as Record<string, unknown>;
    const issue = (j.issue && typeof j.issue === "object" ? j.issue : j) as Record<string, unknown>;
    const wake = j.wakeComment as { body?: string } | string | undefined;
    if (issue.title) {
      return { title: String(issue.title), description: String(issue.description ?? ""), wakeComment: typeof wake === "string" ? wake : wake?.body };
    }
  }
  const res = await call(`/api/issues/${id}`, { method: "GET", runId }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const issue = (j.issue && typeof j.issue === "object" ? j.issue : j) as Record<string, unknown>;
  return issue.title ? { title: String(issue.title), description: String(issue.description ?? "") } : null;
}

/** Post the result on the issue and set its status. Never throws; returns what failed. */
export async function reportToPaperclip(opts: { issueId: string; runId: string; status: "done" | "blocked"; comment: string }): Promise<string | null> {
  const id = encodeURIComponent(opts.issueId);
  try {
    const res = await call(`/api/issues/${id}`, { method: "PATCH", runId: opts.runId, body: JSON.stringify({ status: opts.status, comment: opts.comment }) });
    if (res.ok) return null;
    // A run lock or similar refusal on the status change: still leave the comment.
    const c = await call(`/api/issues/${id}/comments`, { method: "POST", runId: opts.runId, body: JSON.stringify({ body: opts.comment }) });
    return c.ok ? `Status change refused (HTTP ${res.status}); comment posted.` : `Paperclip refused the report (HTTP ${res.status}, comment HTTP ${c.status}).`;
  } catch (e) {
    return `Couldn't reach Paperclip: ${e instanceof Error ? e.message : String(e)}`;
  }
}
