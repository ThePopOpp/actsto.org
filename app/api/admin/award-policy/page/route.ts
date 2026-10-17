import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import {
  awardSummaryForEditor,
  getAwardSummaryVersion,
  saveAwardSummary,
  unpublishAwardSummary,
} from "@/lib/award-policy/public-page-server";

export const dynamic = "force-dynamic";

/** GET /api/admin/award-policy/page?version= — the editor's current text and history, or one version. */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const versionId = new URL(request.url).searchParams.get("version");
  if (versionId) {
    const version = await getAwardSummaryVersion(versionId);
    return version ? NextResponse.json({ version }) : NextResponse.json({ error: "Version not found." }, { status: 404 });
  }
  return NextResponse.json(await awardSummaryForEditor());
}

/**
 * POST /api/admin/award-policy/page
 *   { title, bodyHtml, publish } — save a new version (publish makes it public now)
 *   { action: "unpublish" } — show the holding text instead; versions are kept
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { title?: string; bodyHtml?: string; publish?: boolean; action?: string } | null;
  try {
    if (body?.action === "unpublish") {
      await unpublishAwardSummary(auth.actor);
      return NextResponse.json({ ok: true });
    }
    const version = await saveAwardSummary(auth.actor, {
      title: body?.title ?? "",
      bodyHtml: body?.bodyHtml ?? "",
      publish: body?.publish === true,
    });
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Not saved." }, { status: 400 });
  }
}
