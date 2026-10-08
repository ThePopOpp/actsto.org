import Link from "next/link";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteCampaigns } from "@/lib/campaigns-source";
import { MOMENTUM_WINDOW_DAYS, orderHomeCampaigns, type HomeOrderReason } from "@/lib/campaigns/home-order";

export const dynamic = "force-dynamic";

function Section({
  title,
  rule,
  rows,
  titles,
}: {
  title: string;
  rule: string;
  rows: HomeOrderReason[];
  titles: Map<string, string>;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">{title}</CardTitle>
        <CardDescription>{rule}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active public campaigns.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {rows.map((row, i) => (
              <li key={row.slug} className="flex gap-3">
                <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0">
                  <Link href={`/campaigns/${row.slug}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    {titles.get(row.slug) ?? row.slug}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{row.reason}</span>
                </span>
                {i === 2 ? (
                  <span className="ml-auto shrink-0 self-start rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                    first screen ends
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** What the home page shows right now, and why each campaign is where it is (spec #7). */
export default async function HomeOrderPage() {
  const campaigns = await getSiteCampaigns();
  const ordering = await orderHomeCampaigns(campaigns);
  const titles = new Map(campaigns.map((c) => [c.slug, c.title]));

  return (
    <>
      <AdminPageHeader
        title="Home page order"
        description="Live preview of the three campaign sections on the home page. Only active, public campaigns appear. Change a campaign's Featured star and rank on Campaigns."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Section
          title="New Student Campaigns"
          rule="Newest first, by the date the campaign was created."
          rows={ordering.reasons.newest}
          titles={titles}
        />
        <Section
          title="Featured Campaigns"
          rule="Starred Featured campaigns by rank (1 first, unranked after), then by gifts received. With none starred, the campaigns that have received the most."
          rows={ordering.reasons.featured}
          titles={titles}
        />
        <Section
          title="Gaining Momentum"
          rule={`Featured campaigns pinned first by rank, then gifts received in the last ${MOMENTUM_WINDOW_DAYS} days (amount, then number), then gifts received overall.`}
          rows={ordering.reasons.momentum}
          titles={titles}
        />
      </div>
    </>
  );
}
