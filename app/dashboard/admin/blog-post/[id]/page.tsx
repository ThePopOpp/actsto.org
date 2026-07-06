import { notFound } from "next/navigation";

import { AdminBlogPostForm } from "@/components/dashboard/admin/admin-blog-post-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { getBlogPostById } from "@/lib/admin/blog-posts";

export default async function AdminEditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit — ${post.title}`} description={`Slug: /${post.slug} · Status: ${post.status}`} />
      <AdminBlogPostForm
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          scheduledAt: post.scheduledAt?.toISOString() ?? null,
          excerpt: post.excerpt,
          content: post.content,
          featuredImageUrl: post.featuredImageUrl,
          featuredImageAlt: post.featuredImageAlt,
          categories: post.categories,
          tags: post.tags,
          authorName: post.authorName,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          canonicalUrl: post.canonicalUrl,
          focusKeyword: post.focusKeyword,
        }}
      />
    </>
  );
}
