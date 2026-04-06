"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Clock, Heart, Share2, Users } from "lucide-react";

import { CampaignDonationDialog } from "@/components/donation/campaign-donation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignGivingLevel } from "@/lib/campaigns";

export function CampaignDetailSidebar({
  campaignSlug,
  campaignTitle,
  schoolName,
  donationSubtitle,
  goal,
  raised,
  donorCount,
  daysLeft,
  endDate,
  pct,
  qrSrc,
  givingLevels,
}: {
  campaignSlug: string;
  campaignTitle: string;
  schoolName: string;
  /** Shown in the tax donation dialog (e.g. “Jace Waters at Valley Christian Schools”). */
  donationSubtitle: string;
  goal: number;
  raised: number;
  donorCount: number;
  daysLeft: number;
  endDate: string;
  pct: number;
  qrSrc: string;
  givingLevels: CampaignGivingLevel[];
}) {
  const [donateOpen, setDonateOpen] = React.useState(false);
  const [preselectAmount, setPreselectAmount] = React.useState<number | undefined>();

  function openDonation(amount?: number) {
    setPreselectAmount(amount);
    setDonateOpen(true);
  }

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <CampaignDonationDialog
        open={donateOpen}
        onOpenChange={(o) => {
          setDonateOpen(o);
          if (!o) setPreselectAmount(undefined);
        }}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        schoolName={schoolName}
        studentLine={donationSubtitle}
        endDate={endDate}
        givingLevels={givingLevels}
        preselectQuickAmount={preselectAmount}
      />
      <Card id="campaign-give" className="scroll-mt-28 border-border/80 shadow-md ring-1 ring-foreground/5">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="font-heading text-3xl font-semibold tabular-nums text-primary sm:text-4xl">
            ${raised.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            donated of ${goal.toLocaleString()} goal
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-act-action transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-act-action">{pct}% funded</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
              <Users className="mx-auto size-5 text-muted-foreground" aria-hidden />
              <p className="mt-2 font-heading text-lg font-semibold tabular-nums text-primary">
                {donorCount.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Donors</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
              <Clock className="mx-auto size-5 text-muted-foreground" aria-hidden />
              <p className="mt-2 font-heading text-lg font-semibold tabular-nums text-primary">
                {daysLeft}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Days left</p>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full text-base font-semibold"
            onClick={() => openDonation()}
          >
            Donate today
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full font-medium"
            onClick={() => openDonation()}
          >
            Quick donation
          </Button>

          <div className="flex gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100">
            <Check className="mt-0.5 size-4 shrink-0 text-act-action" aria-hidden />
            <p>
              Donations qualify for Arizona&apos;s{" "}
              <span className="font-semibold">Private School Tax Credit</span> — get every dollar back
              on your state taxes up to your limit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-10 w-full gap-2 font-medium">
              <Heart className="size-4" />
              Save
            </Button>
            <Button type="button" variant="outline" className="h-10 w-full gap-2 font-medium">
              <Share2 className="size-4" />
              Share
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Secure checkout · Tax-credit eligible · Receipts emailed automatically
          </p>

          <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            <Clock className="size-3.5 shrink-0" />
            Campaign ends {endDate} · {daysLeft} days left
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm ring-1 ring-foreground/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg text-primary">Giving levels</CardTitle>
          <CardDescription>Suggested tiers—give any amount that fits your budget.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {givingLevels.map((level) => (
            <button
              key={level.title}
              type="button"
              onClick={() => openDonation(level.amount)}
              className="w-full rounded-lg border border-border/70 bg-card p-4 text-left shadow-xs transition-colors hover:border-primary/30 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-heading font-semibold text-primary">{level.title}</p>
                <span className="shrink-0 font-heading text-lg font-semibold text-act-action tabular-nums">
                  ${level.amount.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{level.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{level.donorCount.toLocaleString()} donors</span>
                {level.spotsLeft != null && level.spotsLeft > 0 ? (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    {level.spotsLeft} spots left
                  </Badge>
                ) : null}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm ring-1 ring-foreground/5">
        <CardContent className="space-y-4 p-5 text-center">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Share via QR code
          </p>
          <div className="relative mx-auto size-44">
            <Image
              src={qrSrc}
              alt="Campaign QR code"
              width={176}
              height={176}
              className="mx-auto rounded-lg border border-border bg-white p-2"
              unoptimized
            />
          </div>
          <div className="flex justify-center gap-3 text-muted-foreground">
            <span className="sr-only">Social share</span>
            {["Facebook", "X", "LinkedIn", "Email"].map((x) => (
              <button
                key={x}
                type="button"
                className="text-xs underline-offset-2 hover:text-foreground hover:underline"
              >
                {x.slice(0, 1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
