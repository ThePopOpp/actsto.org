import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { parseApplicationPatch, patchApplication } from "@/lib/scholarship/applications";
import { requireParentActor } from "@/lib/scholarship/scope";

/**
 * Autosave. The wizard debounces field writes and also flushes on step change,
 * on "Save and finish later", and on unload.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const parsed = parseApplicationPatch(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const application = await patchApplication(id, parent, parsed.value);

    return NextResponse.json({
      ok: true,
      savedAt: application.updatedAt.toISOString(),
      // The parent may have edited household income in another tab, which
      // clears this. Returning it keeps the checkbox honest without a reload.
      incomeConfirmedAt: application.incomeConfirmedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
