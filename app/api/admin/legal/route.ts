import { NextResponse } from "next/server";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { isAdminUiPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { getActSession } from "@/lib/auth/session-server";
import { getCachedDefaultLegalHtml } from "@/lib/legal/get-default-legal-html";
import { isLegalSlug } from "@/lib/legal/slug";
import { prisma } from "@/lib/prisma";

function allowLegalRead(session: Awaited<ReturnType<typeof getActSession>>) {
  if (isAdminUiPreviewEnabled()) return true;
  return !!(
    session &&
    session.role === "super_admin" &&
    canAccessSuperAdminDashboard(session.email)
  );
}

async function assertWriteAuth() {
  const session = await getActSession();
  if (
    !session ||
    session.role !== "super_admin" ||
    !canAccessSuperAdminDashboard(session.email)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const session = await getActSession();
  if (!allowLegalRead(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || !isLegalSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const row = await prisma.legalDocument.findUnique({ where: { slug } });
  const defaultHtml = getCachedDefaultLegalHtml(slug);

  return NextResponse.json({
    slug,
    savedHtml: row?.bodyHtml ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    defaultHtml,
  });
}

export async function POST(request: Request) {
  const deny = await assertWriteAuth();
  if (deny) return deny;

  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    bodyHtml?: string;
  } | null;

  const slug = body?.slug;
  const bodyHtml = body?.bodyHtml;
  if (!slug || !isLegalSlug(slug) || typeof bodyHtml !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.legalDocument.upsert({
    where: { slug },
    create: { slug, bodyHtml },
    update: { bodyHtml },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const deny = await assertWriteAuth();
  if (deny) return deny;

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || !isLegalSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  await prisma.legalDocument.deleteMany({ where: { slug } });
  return NextResponse.json({ ok: true });
}
