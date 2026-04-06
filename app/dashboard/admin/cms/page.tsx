import { AdminSiteContentForm } from "@/components/dashboard/admin/admin-site-content-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminCmsPage() {
  return (
    <>
      <AdminPageHeader
        title="Site & content"
        description="Homepage hero, announcement banner, SEO, legal links, footer copy, resources, and a featured nav highlight."
      />
      <AdminSiteContentForm />
    </>
  );
}
