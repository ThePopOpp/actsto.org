import type { Metadata } from "next";
import { Suspense } from "react";

import { CampaignsPageClient } from "./campaigns-client";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";
import { applyLiveCampaignDonationTotals } from "@/lib/campaigns-live";

export const metadata: Metadata = {
  title: "Campaigns",
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await applyLiveCampaignDonationTotals(MOCK_CAMPAIGNS);

  return (
    <div className="bg-background">
      <Suspense fallback={<div className="min-h-[50vh] bg-background" aria-hidden />}>
        <CampaignsPageClient campaigns={campaigns} />
      </Suspense>
    </div>
  );
}
