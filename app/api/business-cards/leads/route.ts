import { NextResponse } from "next/server";

import { listLeads } from "@/lib/business-cards/data";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET(request: Request) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const scope = new URL(request.url).searchParams.get("scope") === "all" ? "all" : "mine";
  const leads = await listLeads({ email: auth.email, role: auth.role }, scope);
  return NextResponse.json({ leads });
}
