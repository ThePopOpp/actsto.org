import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminSiteContentTabs } from "@/components/dashboard/admin/admin-site-content-tabs";

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
      <AdminSiteContentTabs initialTab={initialTab} />
    </>
  );
}
