import { NextResponse } from "next/server";

import { deleteCard, getCard, saveCard } from "@/lib/business-cards/data";
import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const card = await getCard(id, { email: auth.email, role: auth.role });
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ card });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  try {
    const card = await saveCard(
      { id, status: body.status as never },
      { email: auth.email, name: auth.name, role: auth.role },
    );
    return NextResponse.json({ card });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update card." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteCard(id, { email: auth.email, role: auth.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete card." },
      { status: 400 },
    );
  }
}
