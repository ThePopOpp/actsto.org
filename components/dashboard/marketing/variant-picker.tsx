"use client";

import { Check } from "lucide-react";

import { MARKETING_VARIANTS, type MarketingVariantId } from "@/lib/marketing/design-variants";
import { cn } from "@/lib/utils";

/**
 * Picks the design variant that every channel then follows.
 *
 * Each option carries a small colour swatch rather than a text description
 * alone — the difference between these three is visual, so the control should
 * be too.
 */
export function VariantPicker({
  value,
  onChange,
  compact = false,
}: {
  value: MarketingVariantId;
  onChange: (id: MarketingVariantId) => void;
  /** Tighter layout for the sidebar of another tab. */
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Design variant"
      className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-3")}
    >
      {MARKETING_VARIANTS.map((variant) => {
        const selected = variant.id === value;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(variant.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 overflow-hidden rounded-md border border-border/60"
            >
              <span className="w-1/2" style={{ background: variant.band }} />
              <span className="w-1/4" style={{ background: variant.surface }} />
              <span className="w-1/4" style={{ background: variant.accent }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {variant.name}
                {selected ? <Check className="size-4 text-primary" aria-hidden /> : null}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{variant.description}</span>
              {!compact ? (
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  <strong className="font-medium text-foreground">Best for:</strong> {variant.bestFor}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
