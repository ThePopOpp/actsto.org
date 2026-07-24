import { NextResponse } from "next/server";

import { createGroup } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { planId } = await params;
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  try {
    await createGroup(planId, body.name ?? "New group", { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
