import { NextResponse } from "next/server";

import { listPlans } from "@/lib/plans/data";
import { createPlan } from "@/lib/plans/repository";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET() {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const plans = await listPlans({ email: auth.email, name: auth.name, role: auth.role });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { name?: string; description?: string; color?: string; icon?: string; defaultView?: string } | null;
  if (!body || !body.name || !body.name.trim()) return NextResponse.json({ error: "A plan name is required." }, { status: 400 });
  const id = await createPlan(
    { email: auth.email, name: auth.name, role: auth.role },
    { name: body.name, description: body.description, color: body.color, icon: body.icon, defaultView: body.defaultView },
  );
  return NextResponse.json({ id });
}
