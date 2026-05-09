import { AdminSiteContentForm } from "@/components/dashboard/admin/admin-site-content-form";
import { AdminCtaBuilderForm } from "@/components/dashboard/admin/admin-cta-builder-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminPageTabs } from "@/components/dashboard/admin/admin-page-tabs";

const tabs = [
  { id: "content", label: "Site Content" },
  { id: "cta-blocks", label: "CTA Blocks" },
] as const;

export default async function AdminCmsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params?.tab === "cta-blocks" ? "cta-blocks" : "content";

  return (
    <>
      <AdminPageHeader
        title="Site Content"
        description="Manage public site copy, calls to action, SEO defaults, legal links, footer copy, resources, and featured navigation content."
      />
      <AdminPageTabs tabs={tabs} initialTab={initialTab}>
        {(activeTab) => (activeTab === "cta-blocks" ? <AdminCtaBuilderForm /> : <AdminSiteContentForm />)}
      </AdminPageTabs>
    </>
  );
}
