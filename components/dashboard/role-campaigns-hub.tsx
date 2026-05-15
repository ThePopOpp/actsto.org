"use client";

import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Campaign } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function RoleCampaignsHub({
  campaigns,
  basePath,
  title = "Campaigns",
  description = "View your live pages and open the editor to update story, goal, and imagery.",
}: {
  campaigns: Campaign[];
  basePath: string;
  title?: string;
  description?: string;
}) {
  const b = basePath.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No campaigns linked to this account yet.{" "}
            <Link href="/campaigns/new" className="font-medium text-primary underline-offset-4 hover:underline">
              Start one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const pct = c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
            const isDraft = c.status === "draft";
            const completion = typeof c.completionPercent === "number" ? c.completionPercent : null;
            const missing = c.missingFields ?? [];
            return (
              <Card key={c.slug} className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="font-heading text-lg text-primary">{c.title}</CardTitle>
                    <Badge variant={isDraft ? "outline" : "secondary"}>
                      {isDraft ? "Draft" : "Live"}
                    </Badge>
                  </div>
                  <p className="text-sm italic text-act-red">{c.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {completion !== null && completion < 100 ? (
                    <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                      <div className="flex justify-between gap-3 font-medium">
                        <span>Campaign setup</span>
                        <span>{completion}% complete</span>
                      </div>
                      <Progress value={completion} className="mt-2 h-2" />
                      {missing.length > 0 ? (
                        <p className="mt-2">
                          Missing: {missing.slice(0, 4).join(", ")}
                          {missing.length > 4 ? ", and more" : ""}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1.5 h-2" />
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      ${c.raised.toLocaleString()} raised · {c.donorCount} donors · {c.daysLeft} days left
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/campaigns/${c.slug}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "gap-1.5",
                        isDraft && "pointer-events-none opacity-50",
                      )}
                      aria-disabled={isDraft}
                    >
                      <ExternalLink className="size-3.5" />
                      Public page
                    </Link>
                    <Link
                      href={`${b}/campaigns/${c.slug}/edit`}
                      className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                    >
                      <Pencil className="size-3.5" />
                      Edit campaign
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
