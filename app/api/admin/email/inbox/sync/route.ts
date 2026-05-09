import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { syncImapInbox } from "@/lib/email/imap";

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { limit?: number } | null;
  const limit = Math.min(100, Math.max(1, Number(body?.limit ?? 25)));

  try {
    const result = await syncImapInbox({ limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync the inbox.",
      },
      { status: 500 },
    );
  }
}
