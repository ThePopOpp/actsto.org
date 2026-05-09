"use client";

import { AdminCtaBuilderForm } from "@/components/dashboard/admin/admin-cta-builder-form";
import { AdminPageTabs } from "@/components/dashboard/admin/admin-page-tabs";
import { AdminSiteContentForm } from "@/components/dashboard/admin/admin-site-content-form";

const tabs = [
  { id: "content", label: "Site Content" },
  { id: "cta-blocks", label: "CTA Blocks" },
] as const;

export function AdminSiteContentTabs({
  initialTab,
}: {
  initialTab: "content" | "cta-blocks";
}) {
  return (
    <AdminPageTabs tabs={tabs} initialTab={initialTab}>
      {(activeTab) => (activeTab === "cta-blocks" ? <AdminCtaBuilderForm /> : <AdminSiteContentForm />)}
    </AdminPageTabs>
  );
}
