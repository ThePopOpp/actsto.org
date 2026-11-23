import { redirect } from "next/navigation";

import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { AgentsPanel, type AgentRow } from "@/components/dashboard/admin/agents/agents-panel";
import { DraftsQueue, type DraftRow } from "@/components/dashboard/admin/agents/drafts-queue";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { CopyButton } from "@/components/proposals/admin/copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL, type AgentRole } from "@/lib/agents/identities";
import { siteOrigin } from "@/lib/agents/outbound";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Tab = "agents" | "review" | "activity" | "connect";
const BASE = "/dashboard/admin/agents";

export default async function AgentsAdminPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const session = await getActSession().catch(() => null);
  if (!session || session.role !== "super_admin") redirect(`/login?next=${BASE}&role=super_admin`);

  const params = searchParams ? await searchParams : {};
  const pendingCount = await prisma.outboundDraft.count({ where: { status: "pending" } });
  const tabs: AdminPageTabLink<Tab>[] = [
    { id: "agents", label: "Agents" },
    { id: "review", label: pendingCount ? `Review queue (${pendingCount})` : "Review queue" },
    { id: "activity", label: "Activity" },
    { id: "connect", label: "Connect AI apps" },
  ];
  const active: Tab = tabs.some((t) => t.id === params.tab) ? (params.tab as Tab) : pendingCount ? "review" : "agents";

  return (
    <>
      <AdminPageHeader
        title="AI Agents"
        description="Lead-generation agents (run by Claude Managed Agents, managed in Paperclip) and the AI apps connected to ACTSTO.ORG. Agents find and draft; nothing reaches a person until you approve it."
      />
      <div className="space-y-6">
        <AdminPageTabLinks tabs={tabs} activeTab={active} baseHref={BASE} />
        {active === "agents" ? <AgentsTab /> : null}
        {active === "review" ? <ReviewTab /> : null}
        {active === "activity" ? <ActivityTab /> : null}
        {active === "connect" ? <ConnectTab /> : null}
      </div>
    </>
  );
}

async function AgentsTab() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const agents = await prisma.agentIdentity.findMany({ orderBy: { createdAt: "asc" } });
  const [sent, pending, owned] = await Promise.all([
    prisma.outboundDraft.groupBy({ by: ["agentId"], where: { status: "sent", sentAt: { gte: start } }, _count: true }),
    prisma.outboundDraft.groupBy({ by: ["agentId"], where: { status: "pending" }, _count: true }),
    prisma.contact.groupBy({ by: ["ownerAgentId"], where: { ownerAgentId: { not: null } }, _count: true }),
  ]);
  const sentBy = new Map(sent.map((r) => [r.agentId, r._count]));
  const pendingBy = new Map(pending.map((r) => [r.agentId, r._count]));
  const ownedBy = new Map(owned.map((r) => [r.ownerAgentId, r._count]));

  const rows: AgentRow[] = agents.map((a) => ({
    id: a.id, slug: a.slug, personaName: a.personaName, role: a.role, roleLabel: ROLE_LABEL[a.role as AgentRole] ?? a.role,
    description: a.description, mailbox: a.mailbox, scopes: a.scopes, enabled: a.enabled, dailySendCap: a.dailySendCap,
    hasToken: !!a.tokenHash, tokenHint: a.tokenHint, managedAgentId: a.managedAgentId, paperclipAgentId: a.paperclipAgentId,
    lastUsedAt: a.lastUsedAt?.toISOString() ?? null,
    sentToday: sentBy.get(a.id) ?? 0,
    pendingDrafts: pendingBy.get(a.id) ?? 0,
    leadsOwned: ownedBy.get(a.id) ?? 0,
  }));
  return <AgentsPanel agents={rows} />;
}

async function ReviewTab() {
  const drafts = await prisma.outboundDraft.findMany({
    where: { status: "pending" },
    include: { agent: { select: { personaName: true } }, contact: { select: { displayName: true, firstName: true, lastName: true, company: true, sourceUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const rows: DraftRow[] = drafts.map((d) => ({
    id: d.id, toEmail: d.toEmail, subject: d.subject, bodyText: d.bodyText, segment: d.segment, createdAt: d.createdAt.toISOString(),
    agentName: d.agent?.personaName ?? null,
    leadName: d.contact ? d.contact.displayName || [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") || null : null,
    leadCompany: d.contact?.company ?? null,
    leadSourceUrl: d.contact?.sourceUrl ?? null,
  }));
  return <DraftsQueue drafts={rows} />;
}

async function ActivityTab() {
  const rows = await prisma.mcpAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Every AI action</CardTitle>
        <CardDescription>The latest 100 tool calls from agents and connected AI apps.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Who</th>
                <th className="py-2 pr-3 font-medium">Tool</th>
                <th className="py-2 pr-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{r.createdAt.toLocaleString()}</td>
                  <td className="py-2 pr-3">{r.caller}<span className="ml-1 text-xs text-muted-foreground">({r.via === "agent" ? "agent" : "AI app"})</span></td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.tool}</td>
                  <td className="py-2 pr-3">{r.ok ? <span className="text-emerald-700 dark:text-emerald-400">OK · {r.ms} ms</span> : <span className="text-destructive">{r.error ?? "Failed"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectTab() {
  const mcpUrl = `${siteOrigin()}/api/mcp`;
  const steps: { title: string; body: React.ReactNode }[] = [
    { title: "Claude (claude.ai and the desktop app)", body: <>Settings → Connectors → Add custom connector. Paste the address below, then sign in with your Super Admin account and choose Allow.</> },
    { title: "Claude Code", body: <>Run <code className="rounded bg-muted px-1">claude mcp add --transport http act {mcpUrl}</code>, then <code className="rounded bg-muted px-1">/mcp</code> to sign in.</> },
    { title: "ChatGPT", body: <>Settings → Apps &amp; Connectors → Advanced → turn on Developer mode, then Create a connector with the address below and OAuth sign-in.</> },
    { title: "Codex", body: <>Add <code className="rounded bg-muted px-1">[mcp_servers.act]</code> with <code className="rounded bg-muted px-1">url = &quot;{mcpUrl}&quot;</code> to <code className="rounded bg-muted px-1">~/.codex/config.toml</code>, then run <code className="rounded bg-muted px-1">codex mcp login act</code>.</> },
    { title: "Claude Managed Agents", body: <>Add the address as an MCP server on each agent. Create the agent&apos;s token on the Agents tab and store it in a Claude Console vault as a static bearer credential for this address.</> },
  ];
  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">ACT MCP server</CardTitle>
          <CardDescription>One address for every AI app. Sign-in is limited to Super Admins, and every action is logged on the Activity tab.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-muted px-3 py-2 text-sm">{mcpUrl}</code>
          <CopyButton text={mcpUrl} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((s) => (
          <Card key={s.title} className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
