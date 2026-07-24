import { NextResponse } from "next/server";

import { deleteGroup, updateGroup } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  const body = (await request.json().catch(() => ({}))) as { name?: string; color?: string | null };
  try {
    await updateGroup(groupId, body, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  try {
    await deleteGroup(groupId, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
