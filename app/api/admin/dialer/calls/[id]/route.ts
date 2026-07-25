import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { notes?: string } | null;
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 1000) : "";

  await prisma.callLog.update({ where: { id }, data: { notes: notes || null } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  await prisma.callLog.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
