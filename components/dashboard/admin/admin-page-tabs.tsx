"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminPageTab<T extends string> = {
  id: T;
  label: string;
};

export function AdminPageTabs<T extends string>({
  tabs,
  initialTab,
  children,
}: {
  tabs: AdminPageTab<T>[];
  initialTab: T;
  children: (activeTab: T) => ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Page sections">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? "default" : "outline"}
            className={cn("h-8", activeTab === tab.id && "shadow-sm")}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div role="tabpanel">{children(activeTab)}</div>
    </div>
  );
}
