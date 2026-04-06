"use client";

import * as React from "react";
import Image from "next/image";
import {
  Check,
  ChevronRight,
  CreditCard,
  Receipt,
  Zap,
} from "lucide-react";

import { TaxCreditWizard } from "@/components/donate/tax-credit-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CampaignGivingLevel } from "@/lib/campaigns";
import { TAX_CREDIT_MAX } from "@/lib/tax-credit";
import { cn, formatCheckoutUsd } from "@/lib/utils";

const QUICK_CHOOSE_PILLS = [250, 1500, 3750] as const;

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function defaultPerks(level: CampaignGivingLevel): string[] {
  if (level.perks?.length) return level.perks;
  return [
    "Tax credit receipt",
    "Thank-you note from family",
    "Campaign updates",
  ];
}

type Phase = "choose" | "quick-levels" | "quick-pay" | "quick-card" | "tax";

export function CampaignDonationDialog({
  open,
  onOpenChange,
  campaignSlug,
  campaignTitle,
  schoolName,
  studentLine,
  endDate,
  givingLevels,
  preselectQuickAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignSlug: string;
  campaignTitle: string;
  schoolName: string;
  /** e.g. "Jace Waters at Valley Christian School" */
  studentLine: string;
  endDate: string;
  givingLevels: CampaignGivingLevel[];
  /** When set, opening Quick Donation pre-selects this amount (after choose screen). */
  preselectQuickAmount?: number;
}) {
  const [phase, setPhase] = React.useState<Phase>("choose");
  const [selection, setSelection] = React.useState<string>("level-0");
  const [customRaw, setCustomRaw] = React.useState("");

  const taxCaps = TAX_CREDIT_MAX["2026"];

  React.useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setPhase("choose");
        setSelection("level-0");
        setCustomRaw("");
      }, 200);
      return () => window.clearTimeout(t);
    }
    setPhase("choose");
    setSelection("level-0");
    setCustomRaw("");
    return undefined;
  }, [open]);

  const selectedAmount = React.useMemo(() => {
    if (selection === "custom") {
      const n = Number.parseFloat(customRaw.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    const m = /^level-(\d+)$/.exec(selection);
    if (!m) return 0;
    const i = Number.parseInt(m[1]!, 10);
    return givingLevels[i]?.amount ?? 0;
  }, [selection, customRaw, givingLevels]);

  const selectedLevel =
    selection.startsWith("level-") && selection !== "custom"
      ? givingLevels[Number.parseInt(selection.replace("level-", ""), 10)]
      : undefined;

  function goQuickFromChoose(pill?: number) {
    setPhase("quick-levels");
    if (pill != null) {
      const idx = givingLevels.findIndex((l) => l.amount === pill);
      if (idx >= 0) {
        setSelection(`level-${idx}`);
        setCustomRaw("");
      } else {
        setSelection("custom");
        setCustomRaw(String(pill));
      }
    } else if (preselectQuickAmount != null) {
      const idx = givingLevels.findIndex((l) => l.amount === preselectQuickAmount);
      if (idx >= 0) {
        setSelection(`level-${idx}`);
        setCustomRaw("");
      } else {
        setSelection("custom");
        setCustomRaw(String(preselectQuickAmount));
      }
    }
  }

  function estimateLabel(level: CampaignGivingLevel) {
    if (level.estimateLabel) return level.estimateLabel;
    try {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) {
        return `Est. ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
      }
    } catch {
      /* ignore */
    }
    return "Est. soon";
  }

  const dialogClass =
    phase === "tax"
      ? "flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-[700px]"
      : phase === "quick-levels" || phase === "quick-pay" || phase === "quick-card"
        ? "max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-y-auto sm:max-w-md"
        : "max-w-lg gap-0 sm:max-w-lg";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogClass)} showCloseButton>
        {phase === "choose" ? (
          <>
            <DialogHeader className="space-y-1 pr-8 text-left">
              <DialogTitle className="font-heading text-xl text-primary sm:text-2xl">
                Choose Donation Type
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                How would you like to donate today?
              </p>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => goQuickFromChoose()}
                className="flex w-full gap-4 rounded-xl border border-border/80 bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/20"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Zap className="size-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-base font-semibold text-primary">
                    Quick Donation
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick a giving level and donate in under 2 minutes. Fast, simple, and secure.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUICK_CHOOSE_PILLS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goQuickFromChoose(n);
                        }}
                        className="rounded-full border border-border/60 bg-act-banner px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-act-banner/80"
                      >
                        ${n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <ChevronRight
                  className="mt-1 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>

              <button
                type="button"
                onClick={() => setPhase("tax")}
                className="flex w-full gap-4 rounded-xl border-2 border-act-action/35 bg-card p-4 text-left shadow-xs transition-colors hover:bg-act-action/5"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-act-action text-white">
                  <Receipt className="size-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-base font-semibold text-primary">
                      Tax Credit Donation
                    </p>
                    <Badge className="border-0 bg-act-action/15 font-semibold text-act-action hover:bg-act-action/20">
                      AZ TAX CREDIT
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    4-step guided form that calculates your Arizona Private School Tax Credit. Get
                    up to{" "}
                    <span className="font-semibold text-act-action">
                      ${taxCaps.single.toLocaleString()}
                    </span>{" "}
                    (single) or{" "}
                    <span className="font-semibold text-act-action">
                      ${taxCaps.married.toLocaleString()}
                    </span>{" "}
                    (married) back on your state taxes.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Donor Info › Tax Credit › Payment › Review
                  </p>
                </div>
                <ChevronRight
                  className="mt-1 size-5 shrink-0 text-act-action"
                  aria-hidden
                />
              </button>
            </div>

            <div className="mt-6 flex items-start gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <div className="flex size-5 shrink-0 items-center justify-center rounded border border-act-action/40 bg-act-action/10 text-act-action">
                <Check className="size-3.5 stroke-[3]" aria-hidden />
              </div>
              <p>
                All donations support Arizona&apos;s Private School Tax Credit program.
              </p>
            </div>
          </>
        ) : null}

        {phase === "quick-levels" ? (
          <>
            <DialogHeader className="space-y-1 pr-8 text-center sm:text-left">
              <DialogTitle className="font-heading text-xl text-primary sm:text-2xl">
                Donate to This Campaign
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select a giving level or enter a custom amount. All donations qualify for
                Arizona&apos;s Private School Tax Credit.
              </p>
            </DialogHeader>

            <RadioGroup
              value={selection}
              onValueChange={setSelection}
              className="mt-4 space-y-3"
            >
              {givingLevels.map((level, i) => {
                const id = `level-${i}`;
                const active = selection === id;
                const perks = defaultPerks(level);
                return (
                  <label
                    key={id}
                    className={cn(
                      "block cursor-pointer rounded-xl border p-4 transition-colors",
                      active
                        ? "border-primary bg-act-banner/40 ring-1 ring-primary/20"
                        : "border-border/70 bg-card hover:bg-muted/15"
                    )}
                  >
                    <div className="flex gap-3">
                      <RadioGroupItem value={id} id={id} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-heading font-semibold text-primary">
                            {level.title}
                          </span>
                          <span className="shrink-0 font-heading text-lg font-semibold tabular-nums text-act-action">
                            {formatMoney(level.amount)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{level.description}</p>
                        <ul className="mt-3 space-y-1.5">
                          {perks.map((p) => (
                            <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                              <Check
                                className="mt-0.5 size-4 shrink-0 text-act-action"
                                aria-hidden
                              />
                              {p}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{level.donorCount.toLocaleString()} donors</span>
                          <span>·</span>
                          <span>{estimateLabel(level)}</span>
                          {level.spotsLeft != null && level.spotsLeft > 0 ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              · {level.spotsLeft} spots remaining
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}

              <label
                className={cn(
                  "block cursor-pointer rounded-xl border border-dashed p-4 transition-colors",
                  selection === "custom"
                    ? "border-primary bg-act-banner/40 ring-1 ring-primary/20"
                    : "border-border/70 bg-card hover:bg-muted/15"
                )}
              >
                <div className="flex gap-3">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div>
                      <span className="font-heading font-semibold text-primary">Custom Amount</span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Give exactly what feels right — every dollar makes a difference.
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">Any amount</span>
                  </div>
                </div>
                {selection === "custom" ? (
                  <div className="mt-3 pl-7">
                    <Label htmlFor="custom-amt" className="sr-only">
                      Amount
                    </Label>
                    <Input
                      id="custom-amt"
                      inputMode="decimal"
                      placeholder="$0.00"
                      value={customRaw}
                      onChange={(e) => setCustomRaw(e.target.value)}
                      className="max-w-[200px] font-medium tabular-nums"
                    />
                  </div>
                ) : null}
              </label>
            </RadioGroup>

            <Button
              type="button"
              className="mt-6 h-11 w-full text-base font-semibold"
              disabled={selectedAmount <= 0}
              onClick={() => setPhase("quick-pay")}
            >
              Continue with {formatMoney(selectedAmount)}
            </Button>

            <button
              type="button"
              className="mt-3 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setPhase("choose")}
            >
              ← Back to donation options
            </button>
          </>
        ) : null}

        {phase === "quick-pay" ? (
          <>
            <DialogHeader className="border-b border-border/60 pb-4 pr-8 text-left">
              <DialogTitle className="font-heading text-xl text-primary">
                Donate to This Campaign
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 rounded-xl bg-muted/30 p-4 ring-1 ring-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading font-semibold text-primary">
                    {selectedLevel?.title ?? "Custom gift"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedLevel?.description ??
                      "Your gift supports this campaign through Arizona Christian Tuition."}
                  </p>
                </div>
                <p className="shrink-0 font-heading text-xl font-semibold tabular-nums text-act-action">
                  {formatMoney(selectedAmount)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button type="button" variant="paypal" className="h-12 w-full gap-2 rounded-lg">
                <Image
                  src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                  alt=""
                  width={22}
                  height={22}
                  className="size-5"
                  unoptimized
                />
                PayPal Donate
              </Button>
              <Button type="button" variant="paypal" className="h-12 w-full gap-2 rounded-lg">
                <span className="text-lg font-bold text-[#003087]">P</span>
                Pay Later
              </Button>
              <Button
                type="button"
                variant="paypalCard"
                className="h-12 w-full gap-2 rounded-lg"
                onClick={() => setPhase("quick-card")}
              >
                <CreditCard className="size-5" aria-hidden />
                Debit or Credit Card
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Powered by PayPal — connect keys in production.
            </p>

            <button
              type="button"
              className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setPhase("quick-levels")}
            >
              ← Back to giving levels
            </button>
          </>
        ) : null}

        {phase === "quick-card" ? (
          <div className="pb-8">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="font-heading text-xl text-primary">
                Donate to This Campaign
              </DialogTitle>
            </DialogHeader>

            <div className="mt-3 rounded-xl bg-muted/30 p-4 ring-1 ring-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading font-semibold text-primary">
                    {selectedLevel?.title ?? "Custom gift"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedLevel?.description ??
                      "Your gift supports this campaign through Arizona Christian Tuition."}
                  </p>
                </div>
                <p className="shrink-0 font-heading text-lg font-semibold tabular-nums text-act-action">
                  {formatMoney(selectedAmount)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-act-charcoal px-4 py-3 text-center text-sm font-semibold text-white">
              <span className="inline-flex items-center justify-center gap-2">
                <CreditCard className="size-4" aria-hidden />
                Debit or Credit Card
              </span>
            </div>

            <div className="mt-4 space-y-3 rounded-lg border border-border/80 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="qc-email">Email</Label>
                <Input id="qc-email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-card">Card number</Label>
                <Input id="qc-card" inputMode="numeric" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qc-exp">Expires</Label>
                  <Input id="qc-exp" placeholder="MM / YY" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qc-csc">CSC</Label>
                  <Input id="qc-csc" placeholder="CVC" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">Billing address</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qc-fn">First name</Label>
                  <Input id="qc-fn" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qc-ln">Last name</Label>
                  <Input id="qc-ln" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-zip">ZIP code</Label>
                <Input id="qc-zip" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-mobile">Mobile (+1)</Label>
                <Input id="qc-mobile" type="tel" />
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              By continuing, you confirm you&apos;re 18 years or older.
            </p>
            <Button
              type="button"
              variant="checkoutPay"
              className="mt-4"
              disabled={selectedAmount <= 0}
            >
              Pay {formatCheckoutUsd(selectedAmount)}
            </Button>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Powered by PayPal — connect keys in production.
            </p>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setPhase("quick-pay")}
            >
              ← Back to payment methods
            </button>
          </div>
        ) : null}

        {phase === "tax" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8">
              <TaxCreditWizard
                embedInDialog
                initialCampaignSlug={campaignSlug}
                supportSubtitle={`Support ${studentLine}`}
                onBackToChoose={() => setPhase("choose")}
                onExitFlow={() => {
                  setPhase("choose");
                  onOpenChange(false);
                }}
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
