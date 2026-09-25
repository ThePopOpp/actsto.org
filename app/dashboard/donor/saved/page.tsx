import Link from "next/link";
import { redirect } from "next/navigation";

import { CampaignCard } from "@/components/campaign-card";
import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getMyGiving } from "@/lib/donors/my-giving";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default async function DonorSavedCampaignsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/donor/saved");

  const { saved } = await getMyGiving(session);

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Saved campaigns"
        description="Bookmarked pages for follow-up giving. Save or remove a campaign from its detail page while signed in."
      />

      {saved.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You have not saved any campaigns yet. Open a campaign and use Save to keep it here.
            </p>
            <Link href="/explore" className={cn(buttonVariants({ size: "sm" }))}>
              Explore campaigns
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} variant="listing" />
          ))}
        </div>
      )}

      <Link href="/explore" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Explore more campaigns
      </Link>
    </div>
  );
}
