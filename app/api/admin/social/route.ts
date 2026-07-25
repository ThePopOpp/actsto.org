import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { coerceBlocks } from "@/lib/blog/blocks";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const posts = await prisma.socialPost.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }).catch(() => []);
  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      medium: p.medium,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
      caption: p.caption,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      campaignId: p.campaignId,
      isTemplate: p.isTemplate,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    title?: string;
    platform?: string;
    medium?: string;
    widthPx?: number;
    heightPx?: number;
    caption?: string;
    blocks?: unknown;
    bgColor?: string;
    status?: string;
    scheduledAt?: string | null;
    campaignId?: string | null;
    isTemplate?: boolean;
  } | null;

  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "Untitled post";
  if (!body?.platform || !body?.medium || !body?.widthPx || !body?.heightPx) {
    return NextResponse.json({ error: "platform, medium, and dimensions are required." }, { status: 400 });
  }

  const data = {
    title,
    platform: body.platform,
    medium: body.medium,
    widthPx: body.widthPx,
    heightPx: body.heightPx,
    caption: typeof body.caption === "string" ? body.caption.slice(0, 3000) : null,
    blocks: coerceBlocks(body.blocks) as unknown as object,
    bgColor: typeof body.bgColor === "string" ? body.bgColor : null,
    status: body.status ?? "draft",
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    campaignId: body.campaignId ?? null,
    isTemplate: Boolean(body.isTemplate),
    createdBy: auth.email,
  };

  const post = body.id
    ? await prisma.socialPost.update({ where: { id: body.id }, data })
    : await prisma.socialPost.create({ data });

  return NextResponse.json({ ok: true, post: { id: post.id } });
}
