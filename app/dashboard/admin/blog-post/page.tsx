import { AdminBlogPostForm } from "@/components/dashboard/admin/admin-blog-post-form";
import { AdminBlogPostList } from "@/components/dashboard/admin/admin-blog-post-list";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminBlogPostPage() {
  return (
    <>
      <AdminPageHeader
        title="New blog post"
        description="Create articles with WordPress-aligned fields: post content, featured media, taxonomies, and Yoast-style SEO meta. Publishes to /blog once status is set to Published."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <AdminBlogPostForm />
        <AdminBlogPostList />
      </div>
    </>
  );
}
