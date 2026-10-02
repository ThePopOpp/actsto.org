import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { normalizeStoReporting, validateStoReporting } from "@/lib/sto-reporting";
import { getStoReporting, saveStoReporting } from "@/lib/sto-reporting-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  return NextResponse.json(await getStoReporting());
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const payload = normalizeStoReporting(body);
  const errors = validateStoReporting(payload);
  if (errors.length > 0) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  await saveStoReporting(payload);
  return NextResponse.json(payload);
}
