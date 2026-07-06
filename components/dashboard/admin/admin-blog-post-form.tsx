"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FORM_ID = "admin-blog-post";

export type AdminBlogPostInitial = {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: string | null;
  excerpt: string | null;
  content: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  categories: string | null;
  tags: string | null;
  authorName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  focusKeyword: string | null;
};

export function AdminBlogPostForm({ post }: { post?: AdminBlogPostInitial }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt?.slice(0, 16) ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [featuredUrl, setFeaturedUrl] = useState(post?.featuredImageUrl ?? "");
  const [featuredAlt, setFeaturedAlt] = useState(post?.featuredImageAlt ?? "");
  const [categories, setCategories] = useState(post?.categories ?? "Tax credits, Families");
  const [tags, setTags] = useState(post?.tags ?? "Arizona, STO, Christian education");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "Arizona Christian Tuition");
  const [yoastTitle, setYoastTitle] = useState(post?.seoTitle ?? "");
  const [yoastDesc, setYoastDesc] = useState(post?.seoDescription ?? "");
  const [canonical, setCanonical] = useState(post?.canonicalUrl ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        title,
        slug,
        status,
        scheduledAt: status === "future" ? scheduledAt : null,
        excerpt,
        content,
        featuredImageUrl: featuredUrl,
        featuredImageAlt: featuredAlt,
        categories,
        tags,
        authorName,
        seoTitle: yoastTitle,
        seoDescription: yoastDesc,
        canonicalUrl: canonical,
        focusKeyword,
      };
      const res = await fetch(post ? `/api/admin/blog-posts/${post.id}` : "/api/admin/blog-posts", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save post.");

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      if (!post) {
        router.push(`/dashboard/admin/blog-post/${data.post.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Post</CardTitle>
          <CardDescription>Title, slug, status, excerpt, and content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-title">Title</Label>
            <Input id="bp-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bp-slug">Slug</Label>
            <Input
              id="bp-slug"
              className="mt-1.5 font-mono text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-article-url (auto-generated from title if left blank)"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="publish">Published</SelectItem>
                  <SelectItem value="future">Scheduled</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "future" ? (
              <div>
                <Label htmlFor="bp-sched">Publish at (local)</Label>
                <Input
                  id="bp-sched"
                  type="datetime-local"
                  className="mt-1.5"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="bp-excerpt">Excerpt</Label>
            <Textarea
              id="bp-excerpt"
              className="mt-1.5 min-h-[88px]"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary for cards and meta."
            />
          </div>
          <div>
            <Label htmlFor="bp-content">Content</Label>
            <Textarea
              id="bp-content"
              className="mt-1.5 min-h-[240px] font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Plain text — separate paragraphs with a blank line."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Featured media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-feat-url">Image URL</Label>
            <Input
              id="bp-feat-url"
              className="mt-1.5 font-mono text-sm"
              value={featuredUrl}
              onChange={(e) => setFeaturedUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="bp-feat-alt">Alt text</Label>
            <Input id="bp-feat-alt" className="mt-1.5" value={featuredAlt} onChange={(e) => setFeaturedAlt(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Taxonomies &amp; author</CardTitle>
          <CardDescription>Category and tag names (comma-separated); author display for bylines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-cat">Categories</Label>
            <Input id="bp-cat" className="mt-1.5" value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bp-tags">Tags</Label>
            <Input id="bp-tags" className="mt-1.5" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bp-author">Author display name</Label>
            <Input id="bp-author" className="mt-1.5" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">SEO meta (Yoast-style)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-yoast-title">SEO title</Label>
            <Input id="bp-yoast-title" className="mt-1.5" value={yoastTitle} onChange={(e) => setYoastTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bp-yoast-desc">Meta description</Label>
            <Textarea
              id="bp-yoast-desc"
              className="mt-1.5 min-h-[80px]"
              value={yoastDesc}
              onChange={(e) => setYoastDesc(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bp-canonical">Canonical URL</Label>
            <Input
              id="bp-canonical"
              className="mt-1.5 font-mono text-sm"
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="bp-focus">Focus keyphrase</Label>
            <Input id="bp-focus" className="mt-1.5" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {post ? "Save changes" : "Create post"}
        </Button>
        {saved ? <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span> : null}
      </div>
    </form>
  );
}
