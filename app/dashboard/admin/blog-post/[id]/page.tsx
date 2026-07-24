import { notFound } from "next/navigation";

import { BlogBuilder } from "@/components/dashboard/admin/blog/blog-builder";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { getBlogPostById } from "@/lib/admin/blog-posts";
import { coerceBlocks } from "@/lib/blog/blocks";

export default async function AdminEditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit — ${post.title}`} description={`Slug: /${post.slug} · Status: ${post.status}`} />
      <BlogBuilder
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          scheduledAt: post.scheduledAt?.toISOString() ?? null,
          excerpt: post.excerpt,
          blocks: coerceBlocks(post.blocks),
          featuredImageUrl: post.featuredImageUrl,
          featuredImageAlt: post.featuredImageAlt,
          categories: post.categories,
          tags: post.tags,
          authorName: post.authorName,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          canonicalUrl: post.canonicalUrl,
          focusKeyword: post.focusKeyword,
          contentWidth: post.contentWidth,
          contentSurface: post.contentSurface,
        }}
      />
    </>
  );
}
