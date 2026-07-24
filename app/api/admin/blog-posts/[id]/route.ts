import { NextResponse } from "next/server";

import {
  deleteBlogPost,
  getBlogPostById,
  setBlogPostStatus,
  updateBlogPost,
  type BlogPostInput,
} from "@/lib/admin/blog-posts";
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

  const body = (await request.json().catch(() => null)) as
    | (BlogPostInput & { statusOnly?: boolean; scheduledAt?: string | null })
    | null;

  try {
    // Lightweight status change (archive / publish / schedule) from the manager.
    if (body?.statusOnly && typeof body.status === "string") {
      const post = await setBlogPostStatus(id, body.status, body.scheduledAt ?? null);
      return NextResponse.json({ post });
    }
    if (!body?.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const post = await updateBlogPost(id, body);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update post." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteBlogPost(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete post." },
      { status: 400 },
    );
  }
}
