import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const templates = await prisma.smsTemplate
    .findMany({ where: { active: true }, orderBy: { updatedAt: "desc" } })
    .catch(() => []);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    title?: string;
    message?: string;
    category?: string;
    delete?: boolean;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";

  if (body?.delete && id) {
    await prisma.smsTemplate.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  }

  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1600) : "";
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 80) : "";
  if (!title || !message) {
    return NextResponse.json({ error: "Template title and message are required." }, { status: 400 });
  }

  const template = id
    ? await prisma.smsTemplate.update({
        where: { id },
        data: { title, message, category: category || null, active: true, createdBy: auth.email },
      })
    : await prisma.smsTemplate.create({
        data: { title, message, category: category || null, createdBy: auth.email },
      });

  return NextResponse.json({ ok: true, template });
}
