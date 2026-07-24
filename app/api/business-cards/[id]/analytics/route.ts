import { NextResponse } from "next/server";

import { getCardAnalytics } from "@/lib/business-cards/data";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const analytics = await getCardAnalytics(id, { email: auth.email, role: auth.role });
  if (!analytics) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ analytics });
}
