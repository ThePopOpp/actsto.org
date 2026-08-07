"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type AdminPageTab<T extends string> = {
  id: T;
  label: string;
};

/**
 * Local-state tabs for an admin page.
 *
 * The look lives in `SegmentedTabs` so every tab bar in the dashboard stays in
 * agreement; this component only owns which one is selected.
 */
export function AdminPageTabs<T extends string>({
  tabs,
  initialTab,
  children,
}: {
  tabs: readonly AdminPageTab<T>[];
  initialTab: T;
  children: (activeTab: T) => ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);

  return (
    <div className="space-y-6">
      <SegmentedTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Page sections"
      />
      <div role="tabpanel">{children(activeTab)}</div>
    </div>
  );
}
