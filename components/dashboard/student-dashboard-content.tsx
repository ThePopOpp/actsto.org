import Link from "next/link";
import { Heart, PenLine, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCampaignBySlug } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const CAMPAIGN_SLUG = "waters-family-fundraiser";

const MOCK_SUPPORTERS = [
  { name: "Sarah T.", amount: 500, when: "Mar 28" },
  { name: "Grace Fellowship", amount: 250, when: "Mar 22" },
  { name: "Mike & Linda", amount: 100, when: "Mar 18" },
  { name: "Anonymous", amount: 50, when: "Mar 10" },
];

export function StudentDashboardContent() {
  const c = getCampaignBySlug(CAMPAIGN_SLUG);
  if (!c) return null;
  const pct = c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Your scholarship page, supporters, and updates — keep friends and family in the loop.
      </p>

      <Card className="overflow-hidden border-border/80">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-semibold text-primary">{c.title}</h2>
              <Badge variant="secondary">Live</Badge>
            </div>
            <p className="mt-1 text-sm italic text-act-red">{c.tagline}</p>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">{c.excerpt}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/campaigns/${c.slug}`} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                <Share2 className="size-4" />
                Share page
              </Link>
              <Button size="sm" variant="outline" className="gap-1.5">
                <PenLine className="size-4" />
                Write update
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Progress
            </p>
            <p className="mt-2 font-heading text-4xl font-semibold tabular-nums text-primary">{pct}%</p>
            <Progress value={pct} className="mt-3 h-3" />
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              ${c.raised.toLocaleString()} raised of ${c.goal.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.donorCount} donors · {c.daysLeft} days left
            </p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="mb-4 font-heading text-lg font-semibold text-primary">Recent supporters</h3>
        <Card className="border-border/80">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-medium text-primary">Thank-you feed (sample)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {MOCK_SUPPORTERS.map((row) => (
                <li key={`${row.name}-${row.when}`} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Heart className="size-4 text-act-red" />
                    <span className="font-medium">{row.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    ${row.amount} · {row.when}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-muted/20">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Parents and guardians can manage bank details and tax receipts. If you need something
          changed on your page, ask them to sign in or{" "}
          <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
            contact ACT support
          </Link>
          .
        </CardContent>
      </Card>
    </div>
  );
}
