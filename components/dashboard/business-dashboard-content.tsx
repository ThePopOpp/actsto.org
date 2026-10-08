import Link from "next/link";
import { Building2, FileText, Landmark } from "lucide-react";

import { BusinessGiftsTable } from "@/components/dashboard/business/business-gifts-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BusinessAccount } from "@/lib/donors/business-account";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/**
 * A business donor's own corporate giving.
 *
 * Every figure is the signed-in company's. This page used to show a sample
 * $35,000 pledge, invented invoices and "(demo)" export buttons to every
 * business donor.
 */
export function BusinessDashboardContent({ account }: { account: BusinessAccount }) {
  const year = new Date().getFullYear();
  const receipts = account.gifts.filter((gift) => gift.receiptNumber).length;
  const openPledges = account.pledges.filter((p) => p.status !== "fulfilled");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-muted-foreground">
          Your company&apos;s Arizona corporate tax-credit gifts, receipts and pledges. Confirm credit
          pre-approval with the Arizona Department of Revenue and your tax advisor.
        </p>
        <Link href="/donate/business" className={cn(buttonVariants({ size: "sm" }))}>
          Make a corporate gift
        </Link>
      </div>

      {account.missingCompanyFields.length > 0 ? (
        <Alert>
          <AlertDescription>
            Receipts need your company details. Still missing: {account.missingCompanyFields.join(", ")}.{" "}
            <Link href="/dashboard/business/company" className="font-medium text-primary underline-offset-4 hover:underline">
              Complete company info
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                ${account.totalThisTaxYear.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Given in {year}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                ${account.totalAllTime.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Given in total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{receipts}</p>
              <p className="text-xs text-muted-foreground">Receipts ready</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {openPledges.length > 0 ? (
        <div>
          <h2 className="mb-4 font-heading text-lg font-semibold text-primary">Open pledges</h2>
          <div className="space-y-4">
            {openPledges.map((pledge) => {
              const pct = pledge.committed > 0 ? Math.min(100, Math.round((pledge.received / pledge.committed) * 100)) : 0;
              return (
                <Card key={pledge.id} className="border-border/80">
                  <CardContent className="p-5">
                    <p className="font-medium text-primary">{pledge.campaignTitle}</p>
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      ${pledge.received.toLocaleString()} received of ${pledge.committed.toLocaleString()} pledged
                    </p>
                    <Progress value={pct} className="mt-3 h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Recent gifts</h2>
          {account.gifts.length > 5 ? (
            <Link href="/dashboard/business/giving" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              All gifts
            </Link>
          ) : null}
        </div>
        <BusinessGiftsTable gifts={account.gifts.slice(0, 5)} />
      </div>

      <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Contact ACT corporate desk
      </Link>
    </div>
  );
}
