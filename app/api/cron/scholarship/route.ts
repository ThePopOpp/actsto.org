import { NextResponse } from "next/server";

import {
  expireNeedsInfoRequests,
  purgeExpiredDocuments,
  sendDraftDeadlineWarnings,
  sendNeedsInfoReminders,
} from "@/lib/scholarship/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily scholarship maintenance. Call on a schedule with Bearer $CRON_SECRET
 * or ?key=, the same way /api/cron/automations is called.
 *
 * Every job here is idempotent, so running it more than once a day is safe.
 * Running it *less* often is not: the document purge is the one piece of this
 * feature that gets quietly worse if it stops.
 */
async function run(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });

  const url = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("key") ||
    "";
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  // Each job is isolated: one failing must not stop the others, and the purge
  // in particular must still run when an email provider is down.
  for (const [name, job] of [
    ["needsInfoReminders", () => sendNeedsInfoReminders(now)],
    ["needsInfoExpiry", () => expireNeedsInfoRequests(now)],
    ["draftWarnings", () => sendDraftDeadlineWarnings(now)],
    ["documentPurge", () => purgeExpiredDocuments(now)],
  ] as const) {
    try {
      results[name] = await job();
    } catch (error) {
      errors[name] = error instanceof Error ? error.message : String(error);
      console.error(`[scholarship] cron job ${name} failed`, error);
    }
  }

  const ok = Object.keys(errors).length === 0;
  return NextResponse.json({ ok, ...results, ...(ok ? {} : { errors }) }, { status: ok ? 200 : 207 });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
