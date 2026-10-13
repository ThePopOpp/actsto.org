import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { importSchoolsCsv } from "@/lib/schools/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/admin/schools/import — { csv, dryRun }
 *
 * Adds schools from a CSV, or updates the ones already on the list (by name)
 * with the cells that are filled in. Images are links (logo_url,
 * featured_image_url, and gallery_urls separated by "|"). Send dryRun: true
 * first to see what each row would do; nothing is written.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { csv?: string; dryRun?: boolean } | null;
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  if (csv.length > MAX_BYTES) return NextResponse.json({ error: "The file is over 2 MB. Split it into smaller files." }, { status: 400 });

  const dryRun = body?.dryRun !== false;
  try {
    const result = await importSchoolsCsv(csv, { dryRun });
    if (!dryRun) {
      await logAdminActivity({
        actorEmail: auth.email,
        action: "school.import",
        entityType: "school",
        after: { created: result.created, updated: result.updated, unchanged: result.unchanged, errors: result.errors },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The file couldn't be read." }, { status: 400 });
  }
}
