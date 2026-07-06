import { NextResponse } from "next/server";

import { createBlogPost, listAllBlogPosts, type BlogPostInput } from "@/lib/admin/blog-posts";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const posts = await listAllBlogPosts();
  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      updatedAt: p.updatedAt,
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
