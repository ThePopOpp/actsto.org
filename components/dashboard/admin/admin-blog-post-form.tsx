"use client";

import { useState } from "react";

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

export function AdminBlogPostForm() {
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredUrl, setFeaturedUrl] = useState("");
  const [featuredAlt, setFeaturedAlt] = useState("");
  const [categories, setCategories] = useState("Tax credits, Families");
  const [tags, setTags] = useState("Arizona, STO, Christian education");
  const [authorName, setAuthorName] = useState("Arizona Christian Tuition");
  const [yoastTitle, setYoastTitle] = useState("");
  const [yoastDesc, setYoastDesc] = useState("");
  const [canonical, setCanonical] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Post (WordPress-shaped)</CardTitle>
          <CardDescription>
            Mirrors core <code className="rounded bg-muted px-1 text-xs">post</code> fields for title, slug, status,
            excerpt, and content. Wire saves to REST, WP GraphQL, or your DB.
          </CardDescription>
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
              placeholder="my-article-url"
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
              placeholder="HTML or blocks JSON when integrated with WordPress."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Featured media</CardTitle>
          <CardDescription>Maps to REST <code className="rounded bg-muted px-1 text-xs">featured_media</code> once IDs are resolved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-feat-url">Image URL (or upload → ID in production)</Label>
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
          <CardDescription>Optional plugin keys: title override, meta description, canonical, focus keyword.</CardDescription>
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
        <Button type="submit">Save post (demo)</Button>
        {saved ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Not persisted — hook to WordPress REST <code className="rounded bg-muted px-1 text-xs">POST /wp/v2/posts</code>{" "}
            or your API.
          </span>
        ) : null}
      </div>
    </form>
  );
}
