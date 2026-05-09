import type { Metadata } from "next";
import { Suspense } from "react";

import { CampaignsPageClient } from "./campaigns-client";
import { getSiteCampaigns } from "@/lib/campaigns-source";
import { getCtaBlockByPlacement } from "@/lib/site-cta-blocks";

export const metadata: Metadata = {
  title: "Campaigns",
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, topCta] = await Promise.all([
    getSiteCampaigns(),
    getCtaBlockByPlacement("campaigns_top"),
  ]);

  return (
    <div className="bg-background">
      <Suspense fallback={<div className="min-h-[50vh] bg-background" aria-hidden />}>
        <CampaignsPageClient campaigns={campaigns} topCta={topCta} />
      </Suspense>
    </div>
  );
}
