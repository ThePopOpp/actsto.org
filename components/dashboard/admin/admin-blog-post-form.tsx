"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Wand2 } from "lucide-react";

import { BlockEditor } from "@/components/dashboard/admin/blog/block-editor";
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
import { blocksToHtml, coerceBlocks, type BlogBlock } from "@/lib/blog/blocks";

const FORM_ID = "admin-blog-post";

export type AdminBlogPostInitial = {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: string | null;
  excerpt: string | null;
  content: string | null;
  blocks: BlogBlock[] | null;
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
  const [blocks, setBlocks] = useState<BlogBlock[]>(coerceBlocks(post?.blocks));
  const [featuredUrl, setFeaturedUrl] = useState(post?.featuredImageUrl ?? "");
  const [featuredAlt, setFeaturedAlt] = useState(post?.featuredImageAlt ?? "");
  const [categories, setCategories] = useState(post?.categories ?? "Tax credits, Families");
  const [tags, setTags] = useState(post?.tags ?? "Arizona, STO, Christian education");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "Arizona Christian Tuition");
  const [yoastTitle, setYoastTitle] = useState(post?.seoTitle ?? "");
  const [yoastDesc, setYoastDesc] = useState(post?.seoDescription ?? "");
  const [canonical, setCanonical] = useState(post?.canonicalUrl ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function aiMeta() {
    setAiBusy("meta");
    setError(null);
    try {
      const res = await fetch("/api/admin/blog-posts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "meta", title, content: blocksToHtml(blocks) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed.");
      if (data.title && !title.trim()) setTitle(data.title);
      if (data.excerpt) setExcerpt(data.excerpt);
      if (data.seoTitle) setYoastTitle(data.seoTitle);
      if (data.seoDescription) setYoastDesc(data.seoDescription);
      setNotice("AI filled in excerpt and SEO meta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAiBusy(null);
    }
  }

  async function convertToEmail() {
    if (!post) return;
    setAiBusy("email");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceBlogPostId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create email template.");
      setNotice("Email template created — find it under Communications → Email Templates.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create email template.");
    } finally {
      setAiBusy(null);
    }
  }

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
        blocks,
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
            <Label>Content blocks</Label>
            <p className="mt-1 mb-2 text-xs text-muted-foreground">
              Drag to reorder. Build the article from blocks, or generate a draft with AI.
            </p>
            <BlockEditor value={blocks} onChange={setBlocks} />
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
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="font-heading text-lg text-primary">SEO meta (Yoast-style)</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => void aiMeta()} disabled={aiBusy === "meta"}>
            <Wand2 className="mr-1.5 size-3.5" />
            {aiBusy === "meta" ? "Thinking…" : "AI: excerpt & SEO"}
          </Button>
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

      {notice ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {post ? "Save changes" : "Create post"}
        </Button>
        {post ? (
          <Button type="button" variant="outline" onClick={() => void convertToEmail()} disabled={aiBusy === "email"}>
            <Mail className="mr-2 size-4" />
            {aiBusy === "email" ? "Converting…" : "Convert to email template"}
          </Button>
        ) : null}
        {saved ? <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span> : null}
      </div>
    </form>
  );
}
