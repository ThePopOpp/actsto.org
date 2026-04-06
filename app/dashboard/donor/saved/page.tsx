import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const SAVED = [MOCK_CAMPAIGNS[0], MOCK_CAMPAIGNS[2]].filter(Boolean);

export default function DonorSavedCampaignsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Saved campaigns"
        description="Bookmarked pages for follow-up giving. Remove or add from any campaign detail page when logged in."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {SAVED.map((c) => (
          <CampaignCard key={c.slug} campaign={c} variant="listing" />
        ))}
      </div>
      <Link href="/explore" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Explore more campaigns
      </Link>
    </div>
  );
}
