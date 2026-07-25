import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUS = ["draft", "pending_review", "active", "paused", "completed", "rejected", "archived"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { status?: string; isFeatured?: boolean; isPublic?: boolean; startsAt?: string | null; endsAt?: string | null }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  if (body.status && !ALLOWED_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "active") {
      data.approvedAt = new Date();
      data.isPublic = true;
    } else if (body.status === "rejected") {
      data.rejectedAt = new Date();
    }
  }
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
  if (body.isPublic !== undefined) data.isPublic = body.isPublic;
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;

  try {
    await prisma.campaign.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed." }, { status: 400 });
  }
}
