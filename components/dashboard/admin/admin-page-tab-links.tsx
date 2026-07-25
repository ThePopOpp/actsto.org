import Link from "next/link";

import { cn } from "@/lib/utils";

export type AdminPageTabLink<T extends string> = {
  id: T;
  label: string;
};

export function AdminPageTabLinks<T extends string>({
  tabs,
  activeTab,
  baseHref,
}: {
  tabs: AdminPageTabLink<T>[];
  activeTab: T;
  baseHref: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
      role="tablist"
      aria-label="Page sections"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`${baseHref}?tab=${tab.id}`}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
