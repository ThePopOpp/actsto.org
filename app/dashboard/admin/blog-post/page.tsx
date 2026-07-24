import { AdminBlogWorkspace } from "@/components/dashboard/admin/blog/admin-blog-workspace";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminBlogPostPage() {
  return (
    <>
      <AdminPageHeader
        title="Blog"
        description="Create, schedule, deploy, hide, archive, and convert posts into email templates."
      />
      <AdminBlogWorkspace />
    </>
  );
}
