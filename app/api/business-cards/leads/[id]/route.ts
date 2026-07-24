import { NextResponse } from "next/server";

import { deleteLead, updateLead } from "@/lib/business-cards/data";
import type { LeadStatus } from "@/lib/business-cards/types";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "archived"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    await updateLead(id, body.status as LeadStatus, { email: auth.email, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteLead(id, { email: auth.email, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 400 });
  }
}
