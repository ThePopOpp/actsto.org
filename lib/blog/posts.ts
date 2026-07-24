/**
 * Public blog data layer, backed by the `BlogPost` table.
 * Exposes a WordPress REST `post`-shaped view so existing UI (BlogPostCard, /blog/[slug])
 * keeps working unchanged regardless of the underlying storage.
 */
import type { BlogPost as PrismaBlogPost } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type WPTaxonomyTerm = {
  id: string;
  name: string;
  slug: string;
  taxonomy: "category" | "post_tag";
};

export type WPFeaturedMedia = {
  id: string;
  source_url: string;
  alt_text: string;
  mime_type: string;
  media_details?: { width: number; height: number };
};

export type WPAuthor = {
  id: string;
  name: string;
  slug: string;
};

/** Yoast / common SEO plugin keys often exposed via `meta` or ACF */
export type WordPressPostMeta = {
  _yoast_wpseo_title?: string;
  _yoast_wpseo_metadesc?: string;
  _yoast_wpseo_canonical?: string;
  _yoast_wpseo_focuskw?: string;
};

export type WordPressPostContentSection = {
  heading?: string;
  paragraphs: string[];
};

export type WordPressPost = {
  id: string;
  type: "post";
  status: "publish";
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string; protected: boolean };
  excerptPlain: string;
  content: { rendered: string; protected: boolean };
  contentSections: WordPressPostContentSection[];
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  author: string;
  author_embed?: WPAuthor;
  featured_media: string;
  featured_media_embed: WPFeaturedMedia | null;
  categories: string[];
  tags: string[];
  terms: {
    category: WPTaxonomyTerm[];
    post_tag: WPTaxonomyTerm[];
  };
  meta: WordPressPostMeta;
  layout: { width: string; surface: string };
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitCommaList(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function contentToSections(content: string | null): WordPressPostContentSection[] {
  const text = (content ?? "").trim();
  if (!text) return [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length ? [{ paragraphs }] : [];
}

function toWordPressPost(row: PrismaBlogPost): WordPressPost {
  const categories = splitCommaList(row.categories);
  const tags = splitCommaList(row.tags);
  const authorName = row.authorName ?? "Arizona Christian Tuition";
  const published = row.publishedAt ?? row.createdAt;
  const excerptText = row.excerpt ?? "";

  return {
    id: row.id,
    type: "post",
    status: "publish",
    slug: row.slug,
    title: { rendered: row.title },
    excerpt: { rendered: excerptText, protected: false },
    excerptPlain: excerptText,
    content: { rendered: row.content ?? "", protected: false },
    contentSections: contentToSections(row.content),
    date: published.toISOString(),
    date_gmt: published.toISOString(),
    modified: row.updatedAt.toISOString(),
    modified_gmt: row.updatedAt.toISOString(),
    author: authorName,
    author_embed: { id: slugify(authorName), name: authorName, slug: slugify(authorName) },
    featured_media: row.featuredImageUrl ?? "",
    featured_media_embed: row.featuredImageUrl
      ? {
          id: row.id,
          source_url: row.featuredImageUrl,
          alt_text: row.featuredImageAlt ?? row.title,
          mime_type: "image/jpeg",
        }
      : null,
    categories,
    tags,
    terms: {
      category: categories.map((name) => ({ id: slugify(name), name, slug: slugify(name), taxonomy: "category" as const })),
      post_tag: tags.map((name) => ({ id: slugify(name), name, slug: slugify(name), taxonomy: "post_tag" as const })),
    },
    meta: {
      _yoast_wpseo_title: row.seoTitle ?? undefined,
      _yoast_wpseo_metadesc: row.seoDescription ?? undefined,
      _yoast_wpseo_canonical: row.canonicalUrl ?? undefined,
      _yoast_wpseo_focuskw: row.focusKeyword ?? undefined,
    },
    layout: {
      width: row.contentWidth ?? "wide",
      surface: row.contentSurface ?? "card",
    },
  };
}

/** publish | (future AND scheduledAt has passed) */
function livePostWhere(now: Date) {
  return {
    OR: [{ status: "publish" }, { status: "future", scheduledAt: { lte: now } }],
  };
}

export async function getPublishedPosts(): Promise<WordPressPost[]> {
  const rows = await prisma.blogPost.findMany({
    where: livePostWhere(new Date()),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toWordPressPost);
}

export async function getPostBySlug(slug: string): Promise<WordPressPost | undefined> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, ...livePostWhere(new Date()) },
  });
  return row ? toWordPressPost(row) : undefined;
}

export async function getAllPostSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({
    where: { status: "publish" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
