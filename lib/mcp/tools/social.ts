import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";
import { prisma } from "@/lib/prisma";
import { defaultMedium, getMedium } from "@/lib/social/dimensions";

// Social drafts for ACT's OFFICIAL pages only (LinkedIn Company Page, Facebook
// Page, Instagram). They land as "pending_approval" in the Social studio; staff
// schedule or publish them. Nothing here posts to personal profiles.

export function registerSocialTools(server: McpServer, ctx: ToolCtx) {
  const { caller } = ctx;

  defineTool(server, ctx, "social_post_draft", {
    title: "Draft a social post",
    description:
      "Draft a post for ACT's official LinkedIn Company Page, Facebook Page or Instagram. It waits in Social for staff approval. Keep claims accurate (use campaigns_list for real numbers), mention that Arizona tax credits are dollar-for-dollar only as ACT publishes it, and never name a student without their family's public campaign.",
    kind: "write", scope: "social",
    input: {
      platform: z.enum(["linkedin", "facebook", "instagram"]),
      title: z.string().min(3).max(120).describe("Internal title staff see in the list."),
      caption: z.string().min(10).max(3000),
      medium: z.string().max(40).optional().describe("Image size id from the Social studio; defaults to the platform's first size."),
      campaignId: z.string().uuid().optional().describe("Link the post to a public campaign."),
    },
  }, async ({ platform, title, caption, medium, campaignId }) => {
    const size = (medium && getMedium(platform, medium)) || defaultMedium(platform);
    if (!size) throw new ToolError(`No image sizes are set up for ${platform} in the Social studio.`);
    if (campaignId) {
      const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true, isPublic: true } });
      if (!c || c.status !== "active" || !c.isPublic) throw new ToolError("That campaign isn't active and public.");
    }
    const post = await prisma.socialPost.create({
      data: {
        title, platform, medium: size.id, widthPx: size.width, heightPx: size.height, caption, status: "pending_approval",
        campaignId: campaignId ?? null, createdBy: caller.via === "agent" ? `agent:${caller.agentSlug}` : caller.email,
      },
      select: { id: true, status: true },
    });
    return { ...post, note: "Waiting for staff in Dashboard → Marketing → Social." };
  });

  defineTool(server, ctx, "social_posts_list", {
    title: "List social posts",
    description: "Recent social posts and drafts with their status.",
    kind: "read", scope: "social",
    input: { status: z.string().max(40).optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async ({ status, limit }) => {
    const rows = await prisma.socialPost.findMany({
      where: { isTemplate: false, ...(status ? { status } : {}) },
      select: { id: true, title: true, platform: true, caption: true, status: true, scheduledAt: true, createdBy: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit ?? 20,
    });
    return { count: rows.length, posts: rows };
  });
}
