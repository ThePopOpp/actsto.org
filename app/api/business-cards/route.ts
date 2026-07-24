import { NextResponse } from "next/server";

import { getCardStats, listCards, saveCard } from "@/lib/business-cards/data";
import type { SaveCardPayload } from "@/lib/business-cards/types";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET(request: Request) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;

  const scope = new URL(request.url).searchParams.get("scope") === "all" ? "all" : "mine";
  const [cards, stats] = await Promise.all([
    listCards({ email: auth.email, role: auth.role }, scope),
    getCardStats({ email: auth.email, role: auth.role }, scope),
  ]);
  return NextResponse.json({ cards, stats });
}

export async function POST(request: Request) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as SaveCardPayload | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  try {
    const card = await saveCard(body, { email: auth.email, name: auth.name, role: auth.role });
    return NextResponse.json({ card });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save card." },
      { status: 400 },
    );
  }
}
