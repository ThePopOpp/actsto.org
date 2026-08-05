import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { submitApplication } from "@/lib/scholarship/applications";
import { requireParentActor } from "@/lib/scholarship/scope";

/**
 * Submit. Everything that matters happens here rather than in the client:
 * ownership, the lock, the window, full validation, the frozen income snapshot,
 * the confirmation code, and the emails.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { certified?: boolean } | null;

    const result = await submitApplication(id, parent, body?.certified === true);

    return NextResponse.json({
      ok: true,
      confirmationCode: result.confirmationCode,
      warnings: result.warnings,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
