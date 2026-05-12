"use client";

import { AdminCtaBuilderForm } from "@/components/dashboard/admin/admin-cta-builder-form";
import { AdminPageTabs } from "@/components/dashboard/admin/admin-page-tabs";
import { AdminSiteContentForm } from "@/components/dashboard/admin/admin-site-content-form";
import { AdminTaxCreditLimitsForm } from "@/components/dashboard/admin/admin-tax-credit-limits-form";

const tabs = [
  { id: "content", label: "Site Content" },
  { id: "cta-blocks", label: "CTA Blocks" },
  { id: "tax-credits", label: "Tax Credits" },
] as const;

export function AdminSiteContentTabs({
  initialTab,
}: {
  initialTab: "content" | "cta-blocks" | "tax-credits";
}) {
  return (
    <AdminPageTabs tabs={tabs} initialTab={initialTab}>
      {(activeTab) => {
        if (activeTab === "cta-blocks") return <AdminCtaBuilderForm />;
        if (activeTab === "tax-credits") return <AdminTaxCreditLimitsForm />;
        return <AdminSiteContentForm />;
      }}
    </AdminPageTabs>
  );
}
