import { AdminBlogPostForm } from "@/components/dashboard/admin/admin-blog-post-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminBlogPostPage() {
  return (
    <>
      <AdminPageHeader
        title="New blog post"
        description="Create or draft articles with WordPress-aligned fields: post content, featured media, taxonomies, and Yoast-style SEO meta. Wire publish to your headless CMS or REST API."
      />
      <AdminBlogPostForm />
    </>
  );
}
