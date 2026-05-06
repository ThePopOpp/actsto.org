import { NextResponse } from "next/server";

import { getPublicPaypalClientId } from "@/lib/paypal/client";

/** GET /api/paypal/config — returns the public PayPal client ID for the frontend SDK. */
export async function GET() {
  try {
    const { clientId, environment } = await getPublicPaypalClientId();
    if (!clientId) {
      return NextResponse.json(
        { error: "PayPal not configured. Set credentials in Super Admin › Integrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ clientId, environment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load PayPal config.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
