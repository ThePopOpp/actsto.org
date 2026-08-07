"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Tabs across a single campaign's workspace: details, updates, reviews and
 * notifications.
 *
 * Counts sit in the tab itself so a parent can see there are three reviews
 * waiting without opening the tab.
 */
export function CampaignWorkspaceTabs({
  basePath,
  slug,
  counts,
}: {
  basePath: string;
  slug: string;
  counts?: { updates?: number; reviews?: number; notifications?: number };
}) {
  const pathname = usePathname();
  const root = `${basePath.replace(/\/$/, "")}/campaigns/${encodeURIComponent(slug)}`;

  const tabs = [
    { href: `${root}/edit`, label: "Details", count: undefined as number | undefined },
    { href: `${root}/updates`, label: "Updates", count: counts?.updates },
    { href: `${root}/reviews`, label: "Reviews", count: counts?.reviews },
    { href: `${root}/notifications`, label: "Notifications", count: counts?.notifications },
  ];

  return (
    <nav aria-label="Campaign sections" className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-[3px] px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-act-action text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
