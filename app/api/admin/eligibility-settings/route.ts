import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { normalizeEligibilitySettings } from "@/lib/eligibility/settings";
import { getEligibilitySettings, saveEligibilitySettings } from "@/lib/eligibility/settings-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  return NextResponse.json(await getEligibilitySettings());
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const before = await getEligibilitySettings();
  const next = normalizeEligibilitySettings(await request.json().catch(() => null));
  await saveEligibilitySettings(next);
  await logAdminActivity({
    actorEmail: auth.email,
    action: "eligibility_settings.update",
    entityType: "eligibility_settings",
    before,
    after: next,
  });
  return NextResponse.json(next);
}
