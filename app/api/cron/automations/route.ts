import { NextResponse } from "next/server";

import { processDueAutomationJobs } from "@/lib/automations/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Process due automation jobs. Call on a schedule with Bearer $CRON_SECRET or ?key=. */
async function run(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });

  const url = new URL(request.url);
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processDueAutomationJobs(100);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}
