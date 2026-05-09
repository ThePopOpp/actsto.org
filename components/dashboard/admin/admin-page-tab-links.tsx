import Link from "next/link";

import { buttonVariants } from "@/lib/button-variants";
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
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Page sections">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`${baseHref}?tab=${tab.id}`}
          className={cn(
            buttonVariants({ variant: activeTab === tab.id ? "default" : "outline", size: "sm" }),
            "h-8 shadow-none",
            activeTab === tab.id && "shadow-sm"
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
