import { notFound, redirect } from "next/navigation";

import { CampaignUpdatesManager } from "@/components/dashboard/campaign-updates-manager";
import { getActSession } from "@/lib/auth/session-server";
import {
  listCampaignUpdates,
  requireManagedCampaign,
  UpdateError,
} from "@/lib/dashboard/campaign-updates";

export const metadata = { title: "Campaign updates" };

export default async function ParentCampaignUpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getActSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  // Data fetching stays inside the try; the JSX is built after it, so a render
  // error isn't swallowed by this catch.
  let updates;
  try {
    const { campaign } = await requireManagedCampaign(decoded, session);
    updates = await listCampaignUpdates(campaign.id);
  } catch (error) {
    if (error instanceof UpdateError && error.status === 404) notFound();
    throw error;
  }

  return <CampaignUpdatesManager slug={decoded} initialUpdates={updates} />;
}
