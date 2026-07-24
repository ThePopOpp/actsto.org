import { NextResponse } from "next/server";

import { createLead } from "@/lib/business-cards/data";
import { runLeadAutomations } from "@/lib/business-cards/notify";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { cardId?: string; name?: string; email?: string; phone?: string; company?: string; message?: string; website?: string }
    | null;
  if (!body?.cardId) return NextResponse.json({ error: "Missing card." }, { status: 400 });
  // Honeypot: bots fill the hidden `website` field.
  if (body.website) return NextResponse.json({ ok: true });
  if (!body.name && !body.email && !body.phone) {
    return NextResponse.json({ error: "Please add a name, email, or phone." }, { status: 400 });
  }

  const card = await createLead({
    cardId: body.cardId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    message: body.message,
  }).catch(() => null);

  if (!card) return NextResponse.json({ error: "Card not available." }, { status: 404 });

  await runLeadAutomations(card, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    message: body.message,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
