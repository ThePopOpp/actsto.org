"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  publish: "default",
  future: "secondary",
  private: "outline",
  pending: "secondary",
};

export function AdminBlogPostList() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/blog-posts")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-lg text-primary">All posts</CardTitle>
        <CardDescription>{loading ? "Loading…" : `${posts.length} post(s)`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!loading && posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : null}
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/dashboard/admin/blog-post/${post.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{post.title}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">/{post.slug}</p>
            </div>
            <Badge variant={STATUS_VARIANT[post.status] ?? "outline"} className="shrink-0">
              {post.status}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
