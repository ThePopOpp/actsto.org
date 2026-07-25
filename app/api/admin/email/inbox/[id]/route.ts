import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { hidden?: boolean; unread?: boolean; flagged?: boolean };
  await prisma.emailThread
    .update({
      where: { id },
      data: {
        hidden: body.hidden === undefined ? undefined : body.hidden,
        unread: body.unread === undefined ? undefined : body.unread,
        flagged: body.flagged === undefined ? undefined : body.flagged,
      },
    })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  await prisma.emailThread.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
