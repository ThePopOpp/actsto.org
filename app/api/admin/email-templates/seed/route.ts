import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { seedEmailTemplates } from "@/lib/email/seed-templates";

export const dynamic = "force-dynamic";

/**
 * Installs any catalogue templates that don't exist yet.
 *
 * Safe to run repeatedly: it creates what's missing and leaves everything else
 * alone, so a Super Admin's edits survive. That's why it's a plain button rather
 * than a confirmation dialog — there's nothing to lose by pressing it.
 */
export async function POST() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const result = await seedEmailTemplates(auth.email);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[email-templates/seed]", error);
    return NextResponse.json({ error: "Could not install the templates." }, { status: 500 });
  }
}
