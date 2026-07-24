import { NextResponse } from "next/server";

import { recordEvent } from "@/lib/business-cards/data";
import type { EventType } from "@/lib/business-cards/types";

const VALID: EventType[] = [
  "view", "share", "like", "qr_scan", "nfc_tap", "link_click", "copy_link", "save_contact", "lead_submit",
];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { cardId?: string; eventType?: string; linkId?: string }
    | null;
  if (!body?.cardId || !body.eventType || !VALID.includes(body.eventType as EventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await recordEvent({
    cardId: body.cardId,
    eventType: body.eventType as EventType,
    linkId: body.linkId ?? null,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
