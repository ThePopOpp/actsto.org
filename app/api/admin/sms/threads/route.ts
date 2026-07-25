import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getSmsThreads } from "@/lib/sms/threads";
import { getTwilioRuntimeStatus } from "@/lib/sms/twilio";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [runtime, threads] = await Promise.all([getTwilioRuntimeStatus(), getSmsThreads()]);
  return NextResponse.json({ runtime, threads });
}
