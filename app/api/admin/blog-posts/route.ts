import { NextResponse } from "next/server";

import { createBlogPost, listAllBlogPosts, type BlogPostInput } from "@/lib/admin/blog-posts";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [posts, emailTemplateCount] = await Promise.all([
    listAllBlogPosts(),
    prisma.emailTemplate.count().catch(() => 0),
  ]);

  return NextResponse.json({
    emailTemplateCount,
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      excerpt: p.excerpt,
      content: p.content,
      featuredImageUrl: p.featuredImageUrl,
      categories: p.categories,
      tags: p.tags,
      authorName: p.authorName,
      publishedAt: p.publishedAt,
      scheduledAt: p.scheduledAt,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as BlogPostInput | null;
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const post = await createBlogPost(body, auth.email);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create post." },
      { status: 400 }
    );
  }
}
