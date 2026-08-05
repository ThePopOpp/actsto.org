import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { getOrCreateDraft } from "@/lib/scholarship/applications";
import { requireParentActor, ScopeError } from "@/lib/scholarship/scope";
import { getWindowForYear, resolveWindowState } from "@/lib/scholarship/windows";

/** Start (or resume) a draft for a student and school year. */
export async function POST(request: Request) {
  try {
    const parent = await requireParentActor();
    const body = (await request.json().catch(() => null)) as {
      studentId?: string;
      schoolYear?: string;
    } | null;

    if (!body?.studentId) {
      return NextResponse.json({ error: "Choose a student." }, { status: 400 });
    }
    if (!body.schoolYear || !/^\d{4}\/\d{4}$/.test(body.schoolYear)) {
      return NextResponse.json({ error: "Choose a school year." }, { status: 400 });
    }

    // Starting a new application requires an open window. Resuming a draft does
    // not — that path goes through the [id] route, and a draft caught by a
    // closing window is preserved, never deleted.
    const window = await getWindowForYear(body.schoolYear);
    const state = resolveWindowState(window);
    if (!state.canStart) {
      throw new ScopeError(
        `Applications for ${body.schoolYear} aren't open right now.`,
        409,
      );
    }

    const application = await getOrCreateDraft(parent, {
      studentId: body.studentId,
      schoolYear: body.schoolYear,
    });

    return NextResponse.json({
      applicationId: application.id,
      redirect: `/dashboard/parent/apply/${application.id}?step=family`,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
