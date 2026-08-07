import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { getProfileForEmail } from "@/lib/dashboard/parent-scope";
import {
  listPublicReviews,
  parseReviewInput,
  ReviewError,
  submitReview,
} from "@/lib/dashboard/campaign-reviews";

function fail(error: unknown) {
  if (error instanceof ReviewError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[campaign-reviews] unhandled", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/** Approved reviews — public. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { slug: decodeURIComponent(slug) },
      select: { id: true, reviewsEnabled: true },
    });
    if (!campaign) return NextResponse.json({ reviews: [] });

    return NextResponse.json({
      reviews: campaign.reviewsEnabled ? await listPublicReviews(campaign.id) : [],
      reviewsEnabled: campaign.reviewsEnabled,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Leave a review. Signed in only — a review needs an accountable author. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getActSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });
    }

    const { slug } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { slug: decodeURIComponent(slug) },
      select: { id: true, reviewsEnabled: true, createdByUserId: true },
    });
    if (!campaign) throw new ReviewError("Campaign not found.", 404);
    if (!campaign.reviewsEnabled) {
      throw new ReviewError("This family has turned reviews off for their campaign.", 409);
    }

    const profile = await getProfileForEmail(session.email);
    if (!profile) throw new ReviewError("Profile not found.", 404);

    // Reviewing your own campaign isn't a review.
    if (campaign.createdByUserId && campaign.createdByUserId === profile.id) {
      throw new ReviewError("You can't review your own campaign.", 409);
    }

    const input = parseReviewInput(await request.json().catch(() => null));
    await submitReview(campaign.id, profile.id, input);

    return NextResponse.json({
      ok: true,
      // Say plainly that it isn't live yet, rather than letting someone reload
      // and think it vanished.
      message: "Thanks — your review has been sent to the family for approval.",
    });
  } catch (error) {
    return fail(error);
  }
}
