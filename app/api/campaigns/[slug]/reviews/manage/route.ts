import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import {
  listManagedReviews,
  moderateReview,
  ReviewError,
  setReviewsEnabled,
} from "@/lib/dashboard/campaign-reviews";
import { requireManagedCampaign, UpdateError } from "@/lib/dashboard/campaign-updates";

function fail(error: unknown) {
  if (error instanceof ReviewError || error instanceof UpdateError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[campaign-reviews] unhandled", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/** Approve, reject, or turn reviews off for the campaign. Owner only. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getActSession();
    if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { slug } = await params;
    const { campaign } = await requireManagedCampaign(decodeURIComponent(slug), session);

    const body = (await request.json().catch(() => null)) as {
      action?: string;
      reviewId?: string;
      note?: string;
      enabled?: boolean;
    } | null;

    if (body?.action === "toggle") {
      await setReviewsEnabled(campaign.id, body.enabled === true);
      return NextResponse.json({
        reviewsEnabled: body.enabled === true,
        reviews: await listManagedReviews(campaign.id),
      });
    }

    if (body?.action === "approve" || body?.action === "reject") {
      if (!body.reviewId) throw new ReviewError("Which review?", 400);
      await moderateReview(
        body.reviewId,
        campaign.id,
        body.action === "approve" ? "approved" : "rejected",
        body.note,
      );
      return NextResponse.json({ reviews: await listManagedReviews(campaign.id) });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
