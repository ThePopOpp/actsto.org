import { SegmentedTabLinks } from "@/components/ui/segmented-tabs";

export type AdminPageTabLink<T extends string> = {
  id: T;
  label: string;
};

/**
 * URL-driven tabs for an admin page — the selected tab survives a reload and
 * can be linked to directly.
 *
 * The look lives in `SegmentedTabs` so every tab bar in the dashboard stays in
 * agreement.
 */
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
    <SegmentedTabLinks
      tabs={tabs}
      value={activeTab}
      href={(id) => `${baseHref}?tab=${id}`}
      ariaLabel="Page sections"
    />
  );
}
