"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, KeyRound } from "lucide-react";

import { CopyButton } from "@/components/proposals/admin/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AgentRow = {
  id: string;
  slug: string;
  personaName: string;
  role: string;
  roleLabel: string;
  description: string | null;
  mailbox: string | null;
  scopes: string[];
  enabled: boolean;
  dailySendCap: number;
  hasToken: boolean;
  tokenHint: string | null;
  managedAgentId: string | null;
  environmentId: string | null;
  vaultId: string | null;
  memoryStoreId: string | null;
  /** IDs found in claude-lock.json, used when a field above is empty. */
  fromLock: { agentId?: string; environmentId?: string; vaultId?: string; memoryStoreId?: string };
  sessionBudgetCents: number;
  paperclipAgentId: string | null;
  lastUsedAt: string | null;
  lastRun: { status: string; task: string; summary: string | null; error: string | null; createdAt: string; costCents: number | null; source: string } | null;
  sentToday: number;
  pendingDrafts: number;
  leadsOwned: number;
};

const ALL_SCOPES: { id: string; label: string }[] = [
  { id: "read", label: "Read campaigns & leads" },
  { id: "leads", label: "Add & update leads" },
  { id: "outreach", label: "Draft emails" },
  { id: "social", label: "Draft social posts" },
  { id: "inbox", label: "Read replies" },
];

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as { error?: string; token?: string; created?: number } | null;
  if (!res.ok) throw new Error(data?.error ?? "Not saved.");
  return data ?? {};
}

function AgentCard({ agent }: { agent: AgentRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    personaName: agent.personaName,
    mailbox: agent.mailbox ?? "",
    dailySendCap: String(agent.dailySendCap),
    scopes: agent.scopes,
    managedAgentId: agent.managedAgentId ?? "",
    environmentId: agent.environmentId ?? "",
    vaultId: agent.vaultId ?? "",
    memoryStoreId: agent.memoryStoreId ?? "",
    budget: (agent.sessionBudgetCents / 100).toFixed(2),
    paperclipAgentId: agent.paperclipAgentId ?? "",
  });
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const url = `/api/admin/agents/${agent.id}`;

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 font-heading text-primary">
            <Bot className="h-5 w-5" aria-hidden /> {agent.personaName}
            <span className="text-sm font-normal text-muted-foreground">· {agent.roleLabel}</span>
          </CardTitle>
          <CardDescription className="mt-1">{agent.description}</CardDescription>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => call(url, "PATCH", { enabled: !agent.enabled }))}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${agent.enabled ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
          aria-pressed={agent.enabled}
        >
          {agent.enabled ? "On · turn off" : "Off · turn on"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/60 p-2"><div className="text-lg font-semibold">{agent.leadsOwned}</div><div className="text-xs text-muted-foreground">leads found</div></div>
          <div className="rounded-md bg-muted/60 p-2"><div className="text-lg font-semibold">{agent.pendingDrafts}</div><div className="text-xs text-muted-foreground">drafts to review</div></div>
          <div className="rounded-md bg-muted/60 p-2"><div className="text-lg font-semibold">{agent.sentToday}/{agent.dailySendCap}</div><div className="text-xs text-muted-foreground">sent today</div></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${agent.id}-name`}>Name (shown as an AI assistant)</Label>
            <Input id={`${agent.id}-name`} value={form.personaName} onChange={(e) => setForm({ ...form, personaName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${agent.id}-mailbox`}>Mailbox</Label>
            <Input id={`${agent.id}-mailbox`} type="email" placeholder={`${agent.personaName.toLowerCase()}@actsto.org`} value={form.mailbox} onChange={(e) => setForm({ ...form, mailbox: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${agent.id}-cap`}>Daily email cap</Label>
            <Input id={`${agent.id}-cap`} inputMode="numeric" value={form.dailySendCap} onChange={(e) => setForm({ ...form, dailySendCap: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${agent.id}-budget`}>Spending cap per run (USD)</Label>
            <Input id={`${agent.id}-budget`} inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
        </div>

        <details className="rounded-md border border-border/70 p-3">
          <summary className="cursor-pointer text-sm font-medium">Connections (Claude Managed Agents &amp; Paperclip)</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave the Claude fields empty to use the IDs <code>ant apply</code> wrote to claude-lock.json (shown in grey).
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["managedAgentId", "Agent ID", agent.fromLock.agentId, "agent_…"],
                ["environmentId", "Environment ID", agent.fromLock.environmentId, "env_…"],
                ["vaultId", "Vault ID", agent.fromLock.vaultId, "vlt_…"],
                ["memoryStoreId", "Memory store ID", agent.fromLock.memoryStoreId, "memstore_…"],
              ] as const
            ).map(([key, label, locked, hint]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`${agent.id}-${key}`}>{label}</Label>
                <Input id={`${agent.id}-${key}`} placeholder={locked ?? hint} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`${agent.id}-pc`}>Paperclip agent ID</Label>
              <Input id={`${agent.id}-pc`} value={form.paperclipAgentId} onChange={(e) => setForm({ ...form, paperclipAgentId: e.target.value })} />
            </div>
          </div>
        </details>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What it may do</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_SCOPES.map((s) => {
              const on = form.scopes.includes(s.id);
              return (
                <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${on ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setForm({ ...form, scopes: on ? form.scopes.filter((x) => x !== s.id) : [...form.scopes, s.id] })}
                  />
                  {s.label}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Agents can never send. Emails and posts always wait for your approval.</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              const { budget, ...rest } = form;
              const cents = Math.round(Number(budget) * 100);
              if (await run(() => call(url, "PATCH", { ...rest, dailySendCap: Number(form.dailySendCap), sessionBudgetCents: cents }))) setSaved(true);
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (agent.hasToken && !window.confirm(`Replace ${agent.personaName}'s token? The current one stops working right away.`)) return;
              void run(async () => setToken(((await call(url, "PATCH", { action: "rotate_token" })) as { token?: string }).token ?? null));
            }}
          >
            <KeyRound className="mr-1.5 h-4 w-4" aria-hidden />
            {agent.hasToken ? `Replace token (…${agent.tokenHint})` : "Create token"}
          </Button>
          {agent.hasToken ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => window.confirm(`Disconnect ${agent.personaName}? It won't be able to reach ACTSTO.ORG until you create a new token.`) && run(() => call(url, "PATCH", { action: "revoke_token" }))}
            >
              Disconnect
            </Button>
          ) : null}
          {saved ? <span className="text-xs text-emerald-700 dark:text-emerald-400">Saved</span> : null}
          {agent.lastUsedAt ? <span className="ml-auto text-xs text-muted-foreground">Last active {new Date(agent.lastUsedAt).toLocaleString()}</span> : null}
        </div>

        {token ? (
          <Alert>
            <AlertDescription className="space-y-2">
              <p className="font-medium">Copy this token now. It won&apos;t be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{token}</code>
                <CopyButton text={token} />
              </div>
              <p className="text-xs">Store it in the Claude Console as a vault credential (static bearer) for the ACT MCP server. Don&apos;t paste it in chat or commit it.</p>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-2 rounded-md border border-border/70 p-3">
          <Label htmlFor={`${agent.id}-task`}>Give {agent.personaName} a task now</Label>
          <Textarea
            id={`${agent.id}-task`}
            rows={2}
            placeholder={agent.role === "researcher" ? "Find 15 Christian schools and churches with schools in Mesa and Gilbert." : "Describe what to do in a sentence or two."}
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !agent.enabled || task.trim().length < 10}
              onClick={async () => {
                if (await run(() => call(url, "PATCH", { action: "run", task }))) setTask("");
              }}
            >
              Run now
            </Button>
            <span className="text-xs text-muted-foreground">
              Capped at ${(agent.sessionBudgetCents / 100).toFixed(2)}. Results show here and on the Activity tab.
            </span>
          </div>
          {agent.lastRun ? (
            <div className="rounded bg-muted/50 p-2 text-xs">
              <div className="font-medium">
                Last run · {agent.lastRun.status}
                {agent.lastRun.costCents != null ? ` · $${(agent.lastRun.costCents / 100).toFixed(2)}` : ""}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {new Date(agent.lastRun.createdAt).toLocaleString()} · {agent.lastRun.source}
                </span>
              </div>
              {agent.lastRun.summary ? <p className="mt-1 whitespace-pre-wrap">{agent.lastRun.summary.slice(0, 600)}</p> : null}
              {agent.lastRun.error ? <p className="mt-1 text-destructive">{agent.lastRun.error}</p> : null}
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AgentsPanel({ agents }: { agents: AgentRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!agents.length) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">No agents yet</CardTitle>
          <CardDescription>
            Add the starter team: a Lead Researcher, Lead Qualifier, Outreach Writer, Social Content and Inbox Triage agent. They start switched off, with no token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await call("/api/admin/agents", "POST", { action: "seed" });
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Not saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Add the starter agents
          </Button>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {agents.map((a) => (
        <AgentCard key={a.id} agent={a} />
      ))}
    </div>
  );
}
