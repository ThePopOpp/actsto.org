import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/lib/campaigns";

export function CampaignCard({
  campaign,
  variant = "listing",
}: {
  campaign: Campaign;
  variant?: "listing" | "home";
}) {
  const pct =
    campaign.goal > 0
      ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100))
      : 0;
  const toGo = Math.max(0, campaign.goal - campaign.raised);

  return (
    <Card className="overflow-hidden border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={campaign.image}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <div className="absolute top-3 right-3 flex size-14 items-center justify-center rounded-full bg-background/95 text-sm font-bold text-primary shadow ring-1 ring-border">
          {pct}%
        </div>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-heading text-xl font-semibold text-primary">
            <Link href={`/campaigns/${campaign.slug}`} className="hover:underline">
              {campaign.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm font-medium text-act-red italic">{campaign.tagline}</p>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {campaign.excerpt}{" "}
            <Link
              href={`/campaigns/${campaign.slug}`}
              className="font-medium text-primary hover:underline"
            >
              Learn More
            </Link>
          </p>
        </div>
        <div>
          {variant === "home" && (
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Funded</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          )}
          <div
            className={cn(
              "h-2 w-full overflow-hidden rounded-full",
              variant === "home" ? "bg-sky-100 dark:bg-sky-950/40" : "bg-muted"
            )}
          >
            <div
              className="h-full rounded-full bg-act-red transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {variant === "home" ? (
            <div className="mt-3">
              <p className="font-heading text-2xl font-semibold text-primary tabular-nums sm:text-3xl">
                ${campaign.raised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                raised of ${campaign.goal.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                goal
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{pct}%</span> funded ·{" "}
              <span className="tabular-nums">
                ${campaign.raised.toLocaleString()} raised of ${campaign.goal.toLocaleString()} goal
              </span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-border py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
          <div>
            <div className="text-foreground tabular-nums">{campaign.donorCount}</div>
            Donors
          </div>
          <div className="border-x border-border">
            <div className="text-foreground tabular-nums">{campaign.daysLeft}</div>
            Days left
          </div>
          <div>
            <div className="text-foreground tabular-nums">${toGo.toLocaleString()}</div>
            To go
          </div>
        </div>
        <Link
          href={`/campaigns/${campaign.slug}`}
          className={cn(buttonVariants({ variant: "cta" }), "flex h-10 w-full items-center justify-center")}
        >
          Donate to This Campaign
        </Link>
      </CardContent>
    </Card>
  );
}
