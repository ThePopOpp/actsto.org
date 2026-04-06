"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Donors" },
  { id: 2, label: "Taxes" },
  { id: 3, label: "Billing" },
  { id: 4, label: "Review & Pay" },
] as const;

export function DonationFormStepper({
  current,
}: {
  current: 1 | 2 | 3 | 4;
}) {
  return (
    <div className="mb-2 rounded-xl border border-border/60 bg-card/50 px-3 py-4 ring-1 ring-foreground/5 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => {
          const done = current > s.id;
          const active = current === s.id;
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      done || active ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="h-px flex-1 bg-transparent" />
                )}
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      !done &&
                      "border-primary bg-primary text-primary-foreground ring-2 ring-primary/25 ring-offset-2 ring-offset-background",
                    !active &&
                      !done &&
                      "border-muted-foreground/25 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      done ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="h-px flex-1 bg-transparent" />
                )}
              </div>
              <span
                className={cn(
                  "text-center text-xs font-medium sm:text-sm",
                  active || done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StepBanner({
  step,
  subtitle,
}: {
  step: 1 | 2 | 3 | 4;
  subtitle: string;
}) {
  return (
    <div className="mb-4 rounded-lg bg-act-banner px-4 py-3 text-sm font-medium text-act-banner-foreground sm:mb-5 sm:px-5 sm:py-3.5">
      Step {step} of 4 · {subtitle}
    </div>
  );
}
