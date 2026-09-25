import Link from "next/link";
import { Download, FileText, Heart, PiggyBank } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { Campaign } from "@/lib/campaigns";
import type { MyGift } from "@/lib/donors/my-giving";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/**
 * A donor's own giving.
 *
 * Every figure here is the signed-in donor's. It previously rendered three
 * invented gifts, a fixed receipt count and two sample campaigns to everyone,
 * so a real donor saw a tax-credit total that was not theirs.
 */
export function DonorDashboardContent({
  gifts = [],
  saved = [],
  totalThisTaxYear = 0,
  receiptCount = 0,
}: {
  gifts?: MyGift[];
  saved?: Campaign[];
  totalThisTaxYear?: number;
  receiptCount?: number;
} = {}) {
  const ytd = totalThisTaxYear;

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Your Arizona tax-credit giving, receipts, and saved campaigns. Always confirm limits with your
        tax advisor.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <PiggyBank className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">${ytd.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Gifts this tax year</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{receiptCount}</p>
              <p className="text-xs text-muted-foreground">Receipts ready</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Heart className="size-5 text-act-red" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{saved.length}</p>
              <p className="text-xs text-muted-foreground">Saved campaigns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Giving history</h2>
          <Link
            href="/dashboard/donor/donations"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Download className="size-4" />
            All donations
          </Link>
        </div>
        {gifts.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No completed gifts yet. Once a donation is paid it appears here with its receipt.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Credit type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.slice(0, 5).map((gift) => (
                    <tr key={gift.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{gift.date}</td>
                      <td className="px-4 py-3">{gift.campaignTitle}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{gift.creditType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ${gift.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {gift.receiptNumber ?? "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold text-primary">Saved campaigns</h2>
        {saved.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nothing saved yet. Use Save on any campaign page to keep it here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {saved.map((c) => (
              <CampaignCard key={c.slug} campaign={c} variant="listing" />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/donate/detailed" className={cn(buttonVariants({ size: "sm" }))}>
          Make a new gift
        </Link>
        <Link href="/faq" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Tax credit FAQ
        </Link>
      </div>
    </div>
  );
}
