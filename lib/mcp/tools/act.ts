import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { siteOrigin } from "@/lib/agents/outbound";
import { defineTool, z, type ToolCtx } from "@/lib/mcp/define";
import { prisma } from "@/lib/prisma";

// Read-only facts about ACT for writing accurate outreach, plus Super Admin
// views of what the agents are doing.

export function registerActTools(server: McpServer, ctx: ToolCtx) {
  defineTool(server, ctx, "campaigns_list", {
    title: "List public campaigns",
    description: "Active, public scholarship campaigns with their public links and progress. Use these real figures and links in outreach; never invent numbers.",
    kind: "read", scope: "read",
    input: {
      query: z.string().max(120).optional().describe("Title, school or city."),
      featuredOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  }, async ({ query, featuredOnly, limit }) => {
    const q = query?.trim();
    const rows = await prisma.campaign.findMany({
      where: {
        status: "active", isPublic: true,
        ...(featuredOnly ? { isFeatured: true } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { school: { name: { contains: q, mode: "insensitive" } } }] } : {}),
      },
      select: {
        id: true, title: true, slug: true, tagline: true, shortExcerpt: true, city: true, isSchoolLevel: true,
        goalAmount: true, awardedAmount: true, awardedDonorCount: true, endsAt: true, school: { select: { name: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: limit ?? 20,
    });
    const origin = siteOrigin();
    return {
      count: rows.length,
      campaigns: rows.map((c) => ({
        id: c.id, title: c.title, tagline: c.tagline, excerpt: c.shortExcerpt, city: c.city, school: c.school?.name ?? null,
        schoolLevel: c.isSchoolLevel, goal: Number(c.goalAmount), funded: Number(c.awardedAmount), supporters: c.awardedDonorCount,
        endsAt: c.endsAt, url: `${origin}/campaigns/${c.slug}`,
      })),
    };
  });

  defineTool(server, ctx, "agents_status", {
    title: "Agent activity",
    description: "Super Admin only. Each AI agent, whether it's on, its daily email cap and sends today, leads it owns, and drafts waiting for review.",
    kind: "read", scope: "read", humanOnly: true,
    input: {},
  }, async () => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const agents = await prisma.agentIdentity.findMany({ orderBy: { createdAt: "asc" } });
    return Promise.all(agents.map(async (a) => ({
      slug: a.slug, persona: a.personaName, role: a.role, enabled: a.enabled, mailbox: a.mailbox, scopes: a.scopes,
      dailySendCap: a.dailySendCap, lastUsedAt: a.lastUsedAt,
      sentToday: await prisma.outboundDraft.count({ where: { agentId: a.id, status: "sent", sentAt: { gte: start } } }),
      pendingDrafts: await prisma.outboundDraft.count({ where: { agentId: a.id, status: "pending" } }),
      leadsOwned: await prisma.contact.count({ where: { ownerAgentId: a.id } }),
    })));
  });

  defineTool(server, ctx, "mcp_audit_recent", {
    title: "Recent AI activity log",
    description: "Super Admin only. The latest MCP tool calls: which tool, who called it, and whether it worked.",
    kind: "read", scope: "read", humanOnly: true,
    input: { limit: z.number().int().min(1).max(200).optional(), tool: z.string().max(60).optional() },
  }, async ({ limit, tool }) => {
    return prisma.mcpAuditLog.findMany({
      where: tool ? { tool } : {},
      select: { tool: true, caller: true, via: true, ok: true, error: true, ms: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit ?? 50,
    });
  });
}
