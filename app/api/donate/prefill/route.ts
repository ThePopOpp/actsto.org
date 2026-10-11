import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { getDonorPrefill } from "@/lib/donations/prefill-server";

export type { DonorPrefill } from "@/lib/donations/prefill-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/donate/prefill
 *
 * The signed-in donor's own contact details for step 1 of the donation form.
 * Pages that render the form pass these in directly; this endpoint is the
 * fallback for anywhere they don't. Guests get 401 and the form stays blank.
 */
export async function GET() {
  const session = await getActSession().catch(() => null);
  if (!session?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const prefill = await getDonorPrefill(session);
  return NextResponse.json(prefill, { headers: { "Cache-Control": "private, no-store" } });
}
