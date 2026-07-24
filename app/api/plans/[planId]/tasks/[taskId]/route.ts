import { NextResponse } from "next/server";

import { deleteTask, updateTask } from "@/lib/plans/repository";
import type { TaskInput } from "@/lib/plans/types";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { taskId } = await params;
  const body = (await request.json().catch(() => ({}))) as TaskInput;
  try {
    await updateTask(taskId, body, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { taskId } = await params;
  try {
    await deleteTask(taskId, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
