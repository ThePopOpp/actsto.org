import { NextResponse } from "next/server";

import { getBlogPostById, updateBlogPost, type BlogPostInput } from "@/lib/admin/blog-posts";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const post = await getBlogPostById(id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as BlogPostInput | null;
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const post = await updateBlogPost(id, body);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update post." },
      { status: 400 }
    );
  }
}
