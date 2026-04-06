import Link from "next/link";
import { Download, FileText, Heart, PiggyBank } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const MOCK_GIFTS = [
  { id: "1", date: "2026-03-15", campaign: "Waters Family Fundraiser", amount: 500, credit: "Original" },
  { id: "2", date: "2025-12-02", campaign: "Leavitt Family Fundraiser", amount: 1000, credit: "Overflow" },
  { id: "3", date: "2025-08-20", campaign: "ACT General Fund", amount: 250, credit: "Original" },
];

const SAVED = [MOCK_CAMPAIGNS[0], MOCK_CAMPAIGNS[2]].filter(Boolean);

export function DonorDashboardContent() {
  const ytd = MOCK_GIFTS.reduce((s, g) => s + g.amount, 0);

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
              <p className="text-xs text-muted-foreground">Gifts this tax year (sample)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-primary">3</p>
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
              <p className="text-2xl font-semibold text-primary">2</p>
              <p className="text-xs text-muted-foreground">Saved campaigns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Giving history</h2>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" />
            Export (demo)
          </Button>
        </div>
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Credit type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {MOCK_GIFTS.map((g) => (
                  <tr key={g.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{g.date}</td>
                    <td className="px-4 py-3">{g.campaign}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{g.credit}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ${g.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-8 text-primary">
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold text-primary">Saved campaigns</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {SAVED.map((c) => (
            <CampaignCard key={c.slug} campaign={c} variant="listing" />
          ))}
        </div>
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
