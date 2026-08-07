import { notFound, redirect } from "next/navigation";

import { CampaignReviewsManager } from "@/components/dashboard/campaign-reviews-manager";
import { getActSession } from "@/lib/auth/session-server";
import { listManagedReviews } from "@/lib/dashboard/campaign-reviews";
import { requireManagedCampaign, UpdateError } from "@/lib/dashboard/campaign-updates";

export const metadata = { title: "Campaign reviews" };

export default async function ParentCampaignReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getActSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  let reviews;
  let enabled = true;
  try {
    const { campaign } = await requireManagedCampaign(decoded, session);
    reviews = await listManagedReviews(campaign.id);
    enabled = campaign.reviewsEnabled;
  } catch (error) {
    if (error instanceof UpdateError && error.status === 404) notFound();
    throw error;
  }

  return (
    <CampaignReviewsManager slug={decoded} initialReviews={reviews} initialEnabled={enabled} />
  );
}
