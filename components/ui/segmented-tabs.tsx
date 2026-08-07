import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The dashboard's tab style: a soft tray with the active tab raised out of it.
 *
 * Inactive tabs carry no chrome at all — only the selected one gets a surface,
 * a border and a shadow. That inversion is what makes the current tab read at a
 * glance on pages where everything else is also a card, and it's quieter than
 * filling every tab with a button.
 *
 * Two entry points share one look: `SegmentedTabs` for local state and
 * `SegmentedTabLinks` for tabs that live in the URL. Keeping the class strings
 * in one place here is the point — the alternative is the same three-line
 * className drifting across a dozen files.
 */

export const SEGMENTED_TRAY =
  "inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1";

export function segmentedTabClass(active: boolean): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
    active
      ? "border border-border bg-background text-foreground shadow-sm"
      : // A transparent border keeps inactive tabs the same height as the active
        // one, so nothing shifts as you move between them.
        "border border-transparent text-muted-foreground hover:text-foreground",
  );
}

export type SegmentedTab<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  ariaLabel = "Sections",
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn(SEGMENTED_TRAY, className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={segmentedTabClass(active)}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Same look, but each tab is a link — for tabs that belong in the URL. */
export function SegmentedTabLinks<T extends string>({
  tabs,
  value,
  href,
  className,
  ariaLabel = "Sections",
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  /** Builds the href for a tab id. */
  href: (id: T) => string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn(SEGMENTED_TRAY, className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={href(tab.id)}
            role="tab"
            aria-selected={active}
            className={segmentedTabClass(active)}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
