import { NextResponse } from "next/server";

import { createTask } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { planId } = await params;
  const body = (await request.json().catch(() => ({}))) as { title?: string; groupId?: string | null };
  if (!body.title?.trim()) return NextResponse.json({ error: "A task title is required." }, { status: 400 });
  try {
    const id = await createTask(planId, { title: body.title, groupId: body.groupId ?? null }, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
