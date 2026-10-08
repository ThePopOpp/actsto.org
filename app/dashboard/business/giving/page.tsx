import { redirect } from "next/navigation";

import { BusinessGiftsTable } from "@/components/dashboard/business/business-gifts-table";
import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getActSession } from "@/lib/auth/session-server";
import { getBusinessAccount } from "@/lib/donors/business-account";

export const dynamic = "force-dynamic";

export default async function BusinessGivingPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/business/giving");
  const account = await getBusinessAccount(session);

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Giving & pledges"
        description="Every corporate gift your company has completed, the program it funds, and any pledge ACT has recorded for you."
      />

      {account.pledges.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-primary">Pledges</h2>
          {account.pledges.map((pledge) => {
            const pct = pledge.committed > 0 ? Math.min(100, Math.round((pledge.received / pledge.committed) * 100)) : 0;
            return (
              <Card key={pledge.id} className="border-border/80">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{pledge.campaignTitle}</p>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        ${pledge.received.toLocaleString()} received of ${pledge.committed.toLocaleString()} pledged ·
                        recorded {pledge.createdAt}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {pledge.status}
                    </Badge>
                  </div>
                  <Progress value={pct} className="mt-3 h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-primary">Gifts</h2>
        <BusinessGiftsTable gifts={account.gifts} />
      </div>
    </div>
  );
}
