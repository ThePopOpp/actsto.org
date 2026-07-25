import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { coerceBlocks } from "@/lib/blog/blocks";
import { renderSocialPng } from "@/lib/social/render";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "blog-media";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let png: Buffer;
  try {
    png = await renderSocialPng(coerceBlocks(post.blocks), {
      width: post.widthPx,
      height: post.heightPx,
      bgColor: post.bgColor ?? "#0b1220",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `Render failed: ${error.message}` : "Render failed." },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();
  const bucket = await supabase.storage.getBucket(BUCKET);
  if (bucket.error) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
  const path = `social/${new Date().getFullYear()}/${crypto.randomUUID()}.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, png, {
    cacheControl: "31536000",
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  await prisma.socialPost.update({ where: { id }, data: { renderedImageUrl: data.publicUrl } });

  return NextResponse.json({ url: data.publicUrl });
}
