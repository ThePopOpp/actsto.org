"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Code,
  Columns2,
  Columns3,
  Columns4,
  Copy,
  Heading,
  Image as ImageIcon,
  Images,
  Loader2,
  Mail,
  Minus,
  MousePointerClick,
  MoveVertical,
  Music,
  Pilcrow,
  Quote,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";

import { BlockFields, MediaUpload, SectionSettings } from "@/components/dashboard/admin/blog/block-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  BLOG_BLOCK_DEFS,
  blockDefaults,
  blockToHtml,
  type BlogBlock,
  type BlogBlockProps,
  type BlogBlockType,
} from "@/lib/blog/blocks";
import { cn } from "@/lib/utils";

export type BlogBuilderInitial = {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: string | null;
  excerpt: string | null;
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
  contentWidth: string | null;
  contentSurface: string | null;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading,
  Pilcrow,
  Image: ImageIcon,
  Images,
  Video,
  Music,
  Quote,
  MousePointerClick,
  Columns2,
  Columns3,
  Columns4,
  Code,
  Minus,
  MoveVertical,
};

/** Text blocks edit in place via the rich-text field; others show fields + a live preview. */
const RICH_TEXT_TYPES = new Set<BlogBlockType>(["paragraph", "quote", "columns", "columns3", "columns4"]);

const WIDTH_OPTIONS: { value: string; label: string }[] = [
  { value: "narrow", label: "Narrow (reader)" },
  { value: "medium", label: "Medium" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full (match header)" },
];

const SURFACE_OPTIONS: { value: string; label: string }[] = [
  { value: "card", label: "Card (white panel)" },
  { value: "outline", label: "Outline (bordered, transparent)" },
  { value: "none", label: "None (plain)" },
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}
function makeBlock(type: BlogBlockType): BlogBlock {
  return { id: uid(), type, props: blockDefaults(type) };
}

export function BlogBuilder({ post }: { post?: BlogBuilderInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt?.slice(0, 16) ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [blocks, setBlocks] = useState<BlogBlock[]>(
    Array.isArray(post?.blocks) ? (post!.blocks as BlogBlock[]) : [],
  );
  const [featuredUrl, setFeaturedUrl] = useState(post?.featuredImageUrl ?? "");
  const [featuredAlt, setFeaturedAlt] = useState(post?.featuredImageAlt ?? "");
  const [categories, setCategories] = useState(post?.categories ?? "Tax credits, Families");
  const [tags, setTags] = useState(post?.tags ?? "Arizona, STO, Christian education");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "Arizona Christian Tuition");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(post?.seoDescription ?? "");
  const [canonical, setCanonical] = useState(post?.canonicalUrl ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");
  const [contentWidth, setContentWidth] = useState(post?.contentWidth ?? "wide");
  const [contentSurface, setContentSurface] = useState(post?.contentSurface ?? "card");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sectionForId, setSectionForId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState("");
  const [genOpen, setGenOpen] = useState(false);

  function add(type: BlogBlockType) {
    const block = makeBlock(type);
    setBlocks((b) => [...b, block]);
    setSelectedId(block.id);
  }
  function patch(id: string, p: Partial<BlogBlockProps>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...p } } : b)));
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function duplicate(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = { ...blocks[i], id: uid(), props: { ...blocks[i].props } };
    setBlocks((bs) => [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)]);
  }
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return;
    setBlocks((bs) => {
      const next = [...bs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function ai(action: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/blog-posts/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> & { error?: string };
    if (!res.ok) throw new Error(data?.error ?? "AI request failed.");
    return data;
  }

  async function generate() {
    if (!genTopic.trim()) return;
    setBusy("generate");
    setError(null);
    try {
      const data = (await ai("generate", { topic: genTopic })) as { blocks?: BlogBlock[] };
      const gen = Array.isArray(data.blocks) ? data.blocks.map((b) => ({ ...b, id: uid() })) : [];
      if (gen.length) {
        setBlocks((b) => [...b, ...gen]);
        setGenOpen(false);
        setGenTopic("");
      } else setError("The AI didn't return blocks. Try a more specific topic.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function rewrite(block: BlogBlock, instruction: string) {
    setBusy(block.id);
    try {
      const data = (await ai("rewrite", { text: block.props.content ?? "", instruction })) as { text?: string };
      if (data.text) patch(block.id, { content: data.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setBusy(null);
    }
  }

  async function aiMeta() {
    setBusy("meta");
    setError(null);
    try {
      const data = (await ai("meta", {
        title,
        content: blocks.map(blockToHtml).join("\n"),
      })) as { title?: string; excerpt?: string; seoTitle?: string; seoDescription?: string };
      if (data.title && !title.trim()) setTitle(data.title);
      if (data.excerpt) setExcerpt(data.excerpt);
      if (data.seoTitle) setSeoTitle(data.seoTitle);
      if (data.seoDescription) setSeoDesc(data.seoDescription);
      setNotice("AI filled in excerpt and SEO meta.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setBusy(null);
    }
  }

  async function save(nextStatus?: string) {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    const useStatus = nextStatus ?? status;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const body = {
        title,
        slug,
        status: useStatus,
        scheduledAt: useStatus === "future" ? scheduledAt : null,
        excerpt,
        blocks,
        featuredImageUrl: featuredUrl,
        featuredImageAlt: featuredAlt,
        categories,
        tags,
        authorName,
        seoTitle,
        seoDescription: seoDesc,
        canonicalUrl: canonical,
        focusKeyword,
        contentWidth,
        contentSurface,
      };
      const res = await fetch(post ? `/api/admin/blog-posts/${post.id}` : "/api/admin/blog-posts", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { post?: { id: string }; error?: string } | null;
      if (!res.ok || !data?.post) throw new Error(data?.error ?? "Could not save post.");
      setStatus(useStatus);
      if (!post) {
        router.push(`/dashboard/admin/blog-post/${data.post.id}`);
      } else {
        setNotice(useStatus === "publish" ? "Published." : "Saved.");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save post.");
    } finally {
      setBusy(null);
    }
  }

  async function convertToEmail() {
    if (!post) return;
    setBusy("email");
    setError(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceBlogPostId: post.id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not create email template.");
      setNotice("Email template created — see Communications → Email Templates.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create email template.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-card p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="h-9 min-w-[220px] flex-1 font-heading text-base"
        />
        <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="publish">Published</SelectItem>
            <SelectItem value="future">Scheduled</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="pending">Pending review</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => void save()} disabled={busy === "save"}>
          {busy === "save" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {post ? "Save" : "Create"}
        </Button>
        <Button type="button" onClick={() => void save("publish")} disabled={busy === "save"}>
          Publish
        </Button>
        {post ? (
          <Button type="button" variant="outline" onClick={() => void convertToEmail()} disabled={busy === "email"}>
            <Mail className="mr-2 size-4" />
            {busy === "email" ? "Converting…" : "Email template"}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="mr-2 size-4" />
          Post settings
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-[200px_1fr]">
        {/* LEFT: block library (sticky) */}
        <div className="space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3 lg:sticky lg:top-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add block</p>
          <div className="space-y-1.5">
            {BLOG_BLOCK_DEFS.map((def) => {
              const Icon = ICONS[def.icon] ?? Pilcrow;
              return (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => add(def.type)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  {def.label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border/60 pt-2">
            <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setGenOpen((o) => !o)}>
              <Sparkles className="mr-1.5 size-3.5" /> AI draft
            </Button>
            {genOpen ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="Topic for a full draft…"
                  className="min-h-[64px] text-xs"
                />
                <Button type="button" size="sm" className="w-full" onClick={() => void generate()} disabled={busy === "generate" || !genTopic.trim()}>
                  {busy === "generate" ? "Drafting…" : "Generate"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* CENTER: canvas — click a block to edit it in place */}
        <div
          className="min-h-[420px] rounded-lg border border-border/80 bg-muted/20 p-4"
          onClick={() => {
            setSelectedId(null);
            setSectionForId(null);
          }}
        >
          <p className="mb-3 text-center text-xs text-muted-foreground">
            {blocks.length} block(s) · click a block to edit it in place
          </p>
          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
              Add blocks from the left, or use <strong>AI draft</strong> to generate a starting point.
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-3">
              {blocks.map((block, i) => {
                const isSelected = selectedId === block.id;
                const isRich = RICH_TEXT_TYPES.has(block.type);
                const Icon = ICONS[BLOG_BLOCK_DEFS.find((d) => d.type === block.type)?.icon ?? "Pilcrow"] ?? Pilcrow;
                return (
                  <div
                    key={block.id}
                    draggable={!isSelected}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDragIdx(i);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverIdx(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIdx !== null) move(dragIdx, i);
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(block.id);
                    }}
                    className={cn(
                      "group relative rounded-lg border transition-colors",
                      isSelected
                        ? "border-primary bg-card ring-2 ring-primary/40"
                        : "cursor-pointer border-transparent bg-white hover:border-border",
                      overIdx === i && dragIdx !== null && "border-primary ring-2 ring-primary/30",
                      dragIdx === i && "opacity-50",
                    )}
                  >
                    {/* Block action toolbar — pinned to the top of the active/hovered block */}
                    <div
                      className={cn(
                        "absolute -top-3 right-2 z-10 hidden items-center gap-0.5 rounded-md border border-border bg-card px-1 py-0.5 shadow-sm group-hover:flex",
                        isSelected && "flex",
                      )}
                    >
                      <Mini label="Up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="size-3.5" /></Mini>
                      <Mini label="Down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="size-3.5" /></Mini>
                      <Mini label="Duplicate" onClick={() => duplicate(block.id)}><Copy className="size-3.5" /></Mini>
                      <Mini
                        label="Section & spacing"
                        onClick={() => setSectionForId((cur) => (cur === block.id ? null : block.id))}
                        active={sectionForId === block.id}
                      >
                        <SlidersHorizontal className="size-3.5" />
                      </Mini>
                      <Mini label="Delete" onClick={() => remove(block.id)} destructive><Trash2 className="size-3.5" /></Mini>
                    </div>

                    {isSelected ? (
                      <div className="space-y-3 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Icon className="size-3.5" />
                          {BLOG_BLOCK_DEFS.find((d) => d.type === block.type)?.label ?? block.type}
                        </div>
                        <BlockFields
                          block={block}
                          onPatch={(p) => patch(block.id, p)}
                          onRewrite={(inst) => void rewrite(block, inst)}
                          rewriting={busy === block.id}
                        />
                        {sectionForId === block.id ? (
                          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                            <SectionSettings props={block.props} onPatch={(p) => patch(block.id, p)} />
                          </div>
                        ) : null}
                        {!isRich ? (
                          <div className="rounded-md border border-border/50 bg-background p-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                            <div
                              className="[&_a]:text-act-red [&_a]:underline [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                              dangerouslySetInnerHTML={{ __html: blockToHtml(block) }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className="p-2 [&_a]:text-act-red [&_a]:underline [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                        dangerouslySetInnerHTML={{ __html: blockToHtml(block) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Post settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="font-heading text-primary">Post settings</DialogTitle>
                <DialogDescription>Slug, layout, featured image, taxonomy, and SEO.</DialogDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => void aiMeta()} disabled={busy === "meta"}>
                <Wand2 className="mr-1 size-3.5" />
                {busy === "meta" ? "…" : "AI meta"}
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Slug">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" className="font-mono text-sm" />
              </Field>
              {status === "future" ? (
                <Field label="Publish at">
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </Field>
              ) : <div />}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reading width">
                <select
                  value={contentWidth}
                  onChange={(e) => setContentWidth(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {WIDTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Content background">
                <select
                  value={contentSurface}
                  onChange={(e) => setContentSurface(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {SURFACE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Excerpt">
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="min-h-[70px]" />
            </Field>

            <Field label="Featured image">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MediaUpload accept="image/*" label="Upload image" onUploaded={(url) => setFeaturedUrl(url)} />
                  {featuredUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featuredUrl} alt="" className="h-10 w-16 rounded border border-border/60 object-cover" />
                  ) : null}
                </div>
                <Input value={featuredUrl} onChange={(e) => setFeaturedUrl(e.target.value)} placeholder="…or paste an image URL" className="font-mono text-sm" />
                <Input value={featuredAlt} onChange={(e) => setFeaturedAlt(e.target.value)} placeholder="Featured image alt text" />
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categories (comma-separated)">
                <Input value={categories} onChange={(e) => setCategories(e.target.value)} />
              </Field>
              <Field label="Tags (comma-separated)">
                <Input value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
            </div>
            <Field label="Author">
              <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
            </Field>

            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">SEO</p>
              <div className="space-y-2">
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title" />
                <Textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="Meta description" className="min-h-[64px]" />
                <Input value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder="Canonical URL" className="font-mono text-sm" />
                <Input value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="Focus keyphrase" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setSettingsOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Mini({
  children,
  onClick,
  label,
  disabled,
  destructive,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40",
        active && "bg-primary/10 text-primary",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
