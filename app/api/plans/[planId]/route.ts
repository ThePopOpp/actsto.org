import { NextResponse } from "next/server";

import { getWorkspace } from "@/lib/plans/data";
import { deletePlan, updatePlan } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET(_req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { planId } = await params;
  const workspace = await getWorkspace(planId, { email: auth.email, name: auth.name, role: auth.role });
  if (!workspace) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  return NextResponse.json({ workspace });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { planId } = await params;
  const body = (await request.json().catch(() => ({}))) as Parameters<typeof updatePlan>[1];
  try {
    await updatePlan(planId, body, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { planId } = await params;
  try {
    await deletePlan(planId, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
