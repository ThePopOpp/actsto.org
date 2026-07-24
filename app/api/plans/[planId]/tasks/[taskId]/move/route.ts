import { NextResponse } from "next/server";

import { moveTask } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { taskId } = await params;
  const body = (await request.json().catch(() => ({}))) as { groupId?: string | null; index?: number };
  try {
    await moveTask(taskId, body.groupId ?? null, Number(body.index) || 0, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
