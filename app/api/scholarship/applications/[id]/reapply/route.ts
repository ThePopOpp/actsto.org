import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { createResubmission, purgedDocumentsFrom } from "@/lib/scholarship/applications";
import { requireParentActor } from "@/lib/scholarship/scope";

/**
 * "Apply again" after a denial. Creates a new attempt chained to the denied
 * row; the denied row itself is never touched.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parent = await requireParentActor();
    const { id } = await params;

    const application = await createResubmission(id, parent);
    // A document purged before the family reapplied imports as missing. Say
    // which one and why, rather than silently showing an empty list.
    const missing = await purgedDocumentsFrom(id);

    return NextResponse.json({
      applicationId: application.id,
      attemptNumber: application.attemptNumber,
      missingDocuments: missing.map((d) => d.fileName),
      redirect: `/dashboard/parent/apply/${application.id}?step=family&imported=1`,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
