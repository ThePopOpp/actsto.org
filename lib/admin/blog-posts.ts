import "server-only";

import { prisma } from "@/lib/prisma";

export type BlogPostInput = {
  title: string;
  slug: string;
  status: string;
  scheduledAt?: string | null;
  excerpt?: string;
  content?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  categories?: string;
  tags?: string;
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  focusKeyword?: string;
};

export function slugifyBlogSlug(raw: string, fallbackTitle: string): string {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (s.length > 0) return s;
  const fromTitle = fallbackTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return fromTitle || `post-${Date.now()}`;
}

export async function listAllBlogPosts() {
  return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getBlogPostById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export async function createBlogPost(input: BlogPostInput, createdByEmail: string) {
  const slug = slugifyBlogSlug(input.slug, input.title);
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) throw new Error(`Slug "${slug}" is already in use.`);

  return prisma.blogPost.create({
    data: {
      title: input.title,
      slug,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      excerpt: input.excerpt,
      content: input.content,
      featuredImageUrl: input.featuredImageUrl,
      featuredImageAlt: input.featuredImageAlt,
      categories: input.categories,
      tags: input.tags,
      authorName: input.authorName,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      canonicalUrl: input.canonicalUrl,
      focusKeyword: input.focusKeyword,
      publishedAt: input.status === "publish" ? new Date() : null,
      createdByEmail,
    },
  });
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  const current = await prisma.blogPost.findUnique({ where: { id } });
  if (!current) throw new Error("Blog post not found.");

  const slug = slugifyBlogSlug(input.slug, input.title);
  if (slug !== current.slug) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) throw new Error(`Slug "${slug}" is already in use.`);
  }

  const becomingPublished = input.status === "publish" && current.status !== "publish";

  return prisma.blogPost.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      excerpt: input.excerpt,
      content: input.content,
      featuredImageUrl: input.featuredImageUrl,
      featuredImageAlt: input.featuredImageAlt,
      categories: input.categories,
      tags: input.tags,
      authorName: input.authorName,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      canonicalUrl: input.canonicalUrl,
      focusKeyword: input.focusKeyword,
      publishedAt: becomingPublished ? new Date() : current.publishedAt,
    },
  });
}
