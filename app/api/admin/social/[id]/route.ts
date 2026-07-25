import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { coerceBlocks } from "@/lib/blog/blocks";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const p = await prisma.socialPost.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    post: {
      id: p.id,
      title: p.title,
      platform: p.platform,
      medium: p.medium,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
      caption: p.caption,
      blocks: coerceBlocks(p.blocks),
      bgColor: p.bgColor,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      campaignId: p.campaignId,
      isTemplate: p.isTemplate,
    },
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  await prisma.socialPost.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
