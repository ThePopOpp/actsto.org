import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { normalizeCtaBlock, type SiteCtaBlockData } from "@/lib/site-cta-blocks";

type Params = { params: Promise<{ key: string }> };

function isValidUrl(value: string) {
  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
}

function parseBlock(key: string, body: unknown) {
  const source = body && typeof body === "object" && "block" in body
    ? (body as { block?: Partial<SiteCtaBlockData> }).block
    : null;
  if (!source || typeof source !== "object") return null;

  const block = normalizeCtaBlock({ ...source, key });
  if (!isValidUrl(block.primaryUrl)) {
    throw new Error("Primary URL must be an internal path or full URL.");
  }
  if (block.showSecondary && block.secondaryUrl && !isValidUrl(block.secondaryUrl)) {
    throw new Error("Secondary URL must be an internal path or full URL.");
  }
  return block;
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { key } = await params;
  const body = await request.json().catch(() => null);
  let block: SiteCtaBlockData | null = null;
  try {
    block = parseBlock(decodeURIComponent(key), body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid CTA block." },
      { status: 400 },
    );
  }
  if (!block) return NextResponse.json({ error: "Body must include a block." }, { status: 400 });

  const saved = await prisma.siteCtaBlock.upsert({
    where: { key: block.key },
    create: block,
    update: block,
  });

  return NextResponse.json({ block: normalizeCtaBlock(saved) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { key } = await params;
  await prisma.siteCtaBlock.delete({ where: { key: decodeURIComponent(key) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
