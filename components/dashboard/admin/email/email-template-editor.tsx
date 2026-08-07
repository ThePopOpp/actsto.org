"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code,
  Code2,
  Columns2,
  Columns3,
  Columns4,
  Copy,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  Loader2,
  Minus,
  MousePointerClick,
  MoveVertical,
  Music,
  Pilcrow,
  Quote,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { BlockFields, MediaUpload, SectionSettings } from "@/components/dashboard/admin/blog/block-editor";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOG_BLOCK_DEFS,
  blockDefaults,
  blockToHtml,
  blocksToHtml,
  coerceBlocks,
  type BlogBlock,
  type BlogBlockProps,
  type BlogBlockType,
} from "@/lib/blog/blocks";
import { EMAIL_MERGE_FIELDS } from "@/lib/email/merge-fields";
import { cn } from "@/lib/utils";

type Mode = "visual" | "html";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading: HeadingIcon, Pilcrow, Image: ImageIcon, Images, Video: MoveVertical, Music, Quote,
  MousePointerClick, Columns2, Columns3, Columns4, Code, Minus, MoveVertical,
};

/**
 * The live preview renders the real branded shell, not an approximation.
 *
 * `renderEmailLayout` is pure string building with no server dependencies, so
 * importing it here is safe — and it's the only way the preview can be trusted:
 * a plain white box told you nothing about the masthead, hero, featured photo,
 * signature or footer the recipient actually sees.
 */
function previewShell(inner: string, hero: HeroFields) {
  return renderEmailLayout({
    preheader: hero.preheader || hero.subject,
    eyebrow: hero.eyebrow || undefined,
    title: hero.heroTitle || hero.subject || hero.title,
    subtitle: hero.heroSubtitle || undefined,
    featuredImageUrl: hero.featuredImageUrl || null,
    featuredImageAlt: hero.heroTitle || hero.title,
    // A stand-in, so the greeting reads as a greeting rather than as a token.
    firstName: "Jeremy",
    bodyHtml: inner,
    cta: hero.ctaLabel && hero.ctaUrl ? { label: hero.ctaLabel, url: hero.ctaUrl } : undefined,
    showUnsubscribe: true,
  });
}

type HeroFields = {
  title: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  featuredImageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}
function makeBlock(type: BlogBlockType): BlogBlock {
  return { id: uid(), type, props: blockDefaults(type) };
}

export function EmailTemplateEditor({ editId }: { editId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("New email template");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [status, setStatus] = useState("draft");
  const [eyebrow, setEyebrow] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [mode, setMode] = useState<Mode>("visual");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [html, setHtml] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    (async () => {
      const res = await fetch(`/api/admin/email-templates/${editId}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { template?: { title: string; subject: string | null; preheader: string | null; status: string; blocks: unknown; content: string | null; eyebrow: string | null; heroTitle: string | null; heroSubtitle: string | null; featuredImageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null } } | null;
      if (!active || !res.ok || !data?.template) return;
      const t = data.template;
      setTitle(t.title);
      setSubject(t.subject ?? "");
      setPreheader(t.preheader ?? "");
      setStatus(t.status);
      setEyebrow(t.eyebrow ?? "");
      setHeroTitle(t.heroTitle ?? "");
      setHeroSubtitle(t.heroSubtitle ?? "");
      setFeaturedImageUrl(t.featuredImageUrl ?? "");
      setCtaLabel(t.ctaLabel ?? "");
      setCtaUrl(t.ctaUrl ?? "");
      const b = coerceBlocks(t.blocks);
      if (b.length) { setBlocks(b); setMode("visual"); setSelectedId(b[0].id); } else { setHtml(t.content ?? ""); setMode("html"); }
    })();
    return () => { active = false; };
  }, [editId]);

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);
  const hero: HeroFields = {
    title,
    subject,
    preheader,
    eyebrow,
    heroTitle,
    heroSubtitle,
    featuredImageUrl,
    ctaLabel,
    ctaUrl,
  };
  const previewHtml = useMemo(
    () => previewShell(mode === "visual" ? blocksToHtml(blocks) : html, hero),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `hero` is rebuilt each render; depend on its fields
    [mode, blocks, html, title, subject, preheader, eyebrow, heroTitle, heroSubtitle, featuredImageUrl, ctaLabel, ctaUrl],
  );

  function add(type: BlogBlockType) {
    const block = makeBlock(type);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }
  function update(id: string, patch: Partial<BlogBlockProps>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)));
  }
  function remove(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }
  function duplicate(id: string) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) return prev;
      const copy = { ...prev[i], id: uid(), props: { ...prev[i].props } };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  }
  function move(from: number, to: number) {
    setBlocks((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function rewrite(block: BlogBlock, instruction: string) {
    setRewritingId(block.id);
    try {
      const res = await fetch("/api/admin/blog-posts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rewrite", text: block.props.content ?? "", instruction }),
      });
      const data = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (res.ok && data?.text) update(block.id, { content: data.text });
    } finally {
      setRewritingId(null);
    }
  }

  async function aiDraft() {
    if (!aiTopic.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/blog-posts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic: aiTopic }),
      });
      const data = (await res.json().catch(() => null)) as { blocks?: BlogBlock[]; error?: string } | null;
      const generated = Array.isArray(data?.blocks) ? data!.blocks : [];
      if (generated.length) {
        const withIds = generated.map((b) => ({ ...b, id: uid() }));
        setBlocks((prev) => [...prev, ...withIds]);
        setSelectedId(withIds[0].id);
        setAiOpen(false);
        setAiTopic("");
      } else {
        setNotice("The AI didn't return any blocks. Try a more specific topic.");
      }
    } finally {
      setAiBusy(false);
    }
  }

  const save = useCallback(async () => {
    if (!title.trim()) { setNotice("A title is required."); return; }
    setBusy(true);
    setNotice(null);
    const meta = { title, subject, preheader, status, eyebrow, heroTitle, heroSubtitle, featuredImageUrl, ctaLabel, ctaUrl };
    const payload = mode === "visual"
      ? { ...meta, blocks }
      : { ...meta, blocks: [], content: html };
    const res = await fetch(editId ? `/api/admin/email-templates/${editId}` : "/api/admin/email-templates", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { template?: { id: string }; error?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.template) { setNotice(data?.error ?? "Could not save."); return; }
    router.push(`/dashboard/admin/email?tab=editor&id=${data.template.id}`);
    setNotice("Template saved.");
  }, [
    title,
    subject,
    preheader,
    status,
    mode,
    blocks,
    html,
    editId,
    router,
    eyebrow,
    heroTitle,
    heroSubtitle,
    featuredImageUrl,
    ctaLabel,
    ctaUrl,
  ]);

  function copyField(token: string) {
    void navigator.clipboard?.writeText(token);
    setNotice(`Copied ${token}`);
    window.setTimeout(() => setNotice(null), 1500);
  }

  const selectedLabel = selected ? BLOG_BLOCK_DEFS.find((d) => d.type === selected.type)?.label ?? "Block" : null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <span className="font-heading text-sm font-semibold text-primary">{editId ? "Edit template" : "New template"}</span>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            <button type="button" onClick={() => setMode("visual")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", mode === "visual" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}><LayoutGrid className="size-4" /> Visual</button>
            <button type="button" onClick={() => setMode("html")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", mode === "html" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}><Code2 className="size-4" /> HTML</button>
          </div>
          {mode === "visual" ? <Button type="button" variant="outline" size="sm" onClick={() => setFullPreview(true)}>Full preview</Button> : null}
          <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />} Save</Button>
        </div>
      </div>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {/* Hero — the branded shell above the body. Every email renders masthead →
          hero → featured photo → greeting → body → CTA → signature → footer, and
          these are the parts of that a template controls. */}
      <Card className="border-border/80">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="font-heading text-sm font-semibold text-primary">Hero</p>
            <p className="text-xs text-muted-foreground">Shown on the navy panel under the logo.</p>
          </div>
          <div><Label className="text-xs text-muted-foreground">Eyebrow</Label><Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Welcome" className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Hero title</Label><Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Falls back to the subject line" className="mt-1" /></div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Hero subtitle</Label><Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Featured photo URL</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Input value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} placeholder="https://…" className="min-w-0 flex-1" />
              <MediaUpload accept="image/*" label="Upload" onUploaded={setFeaturedImageUrl} />
              {featuredImageUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFeaturedImageUrl("")}>Remove</Button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Sits between the hero and the greeting. Left out entirely when empty, rather than leaving a gap.</p>
          </div>
          <div><Label className="text-xs text-muted-foreground">Button label</Label><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open your dashboard" className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Button URL</Label><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://actsto.org/dashboard" className="mt-1" /></div>
        </CardContent>
      </Card>

      {/* Meta */}
      <Card className="border-border/80">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div><Label className="text-xs text-muted-foreground">Internal title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Subject line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Preheader (inbox preview)</Label><Input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic fields */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dynamic fields — click to copy</p>
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_MERGE_FIELDS.map((f) => (
            <button key={f.token} type="button" onClick={() => copyField(f.token)} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-muted" title={f.label}>
              <Copy className="size-3" /> {f.token}
            </button>
          ))}
        </div>
      </div>

      {mode === "html" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Email HTML (inner body — the 600px shell is added automatically)</Label>
            <Textarea value={html} onChange={(e) => setHtml(e.target.value)} className="mt-1 min-h-[560px] font-mono text-xs" placeholder="<h1>Hello {{first_name}}</h1><p>…</p>" />
          </div>
          <div className="xl:sticky xl:top-4 xl:self-start">
            <p className="mb-2 text-center text-xs text-muted-foreground">Live preview</p>
            <iframe title="Email preview" srcDoc={previewHtml} className="h-[560px] w-full rounded-lg border border-border bg-white" />
          </div>
        </div>
      ) : (
        /* 3-pane visual editor: palette · canvas · inspector */
        <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_340px]">
          {/* Left: block palette (sticky) */}
          <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto">
            <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Add block</p>
              <div className="space-y-1">
                {BLOG_BLOCK_DEFS.map((def) => {
                  const Icon = ICONS[def.icon] ?? Pilcrow;
                  return (
                    <button key={def.type} type="button" onClick={() => add(def.type)} className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-muted">
                      <Icon className="size-4 shrink-0 text-primary" /> {def.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-border/60 p-1">
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setAiOpen((o) => !o)}><Sparkles className="mr-1.5 size-3.5" /> AI draft</Button>
                {aiOpen ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Describe the email…" className="min-h-[64px] text-sm" />
                    <Button type="button" size="sm" className="w-full" onClick={() => void aiDraft()} disabled={aiBusy || !aiTopic.trim()}>{aiBusy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null} Generate</Button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          {/* Center: WYSIWYG canvas */}
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">{blocks.length} block{blocks.length === 1 ? "" : "s"}</span>
              <button type="button" onClick={() => setFullPreview(true)} className="text-xs font-medium text-primary hover:underline">Full preview</button>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
              {blocks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">Add a block from the left to start building.</p>
              ) : (
                <div className="mx-auto w-full max-w-[600px] rounded-xl bg-white p-6 shadow-sm sm:p-7">
                  {blocks.map((block, i) => {
                    const isSel = block.id === selectedId;
                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedId(block.id)}
                        className={cn(
                          "group relative cursor-pointer rounded-md transition",
                          isSel ? "outline outline-2 outline-primary outline-offset-2" : "hover:outline hover:outline-1 hover:outline-primary/40 hover:outline-offset-2",
                        )}
                      >
                        <div className={cn("absolute -top-3 right-1 z-10 hidden items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm group-hover:flex", isSel && "flex")}>
                          <MiniBtn label="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}><MoveVertical className="size-3 rotate-180" /></MiniBtn>
                          <MiniBtn label="Move down" disabled={i === blocks.length - 1} onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}><MoveVertical className="size-3" /></MiniBtn>
                          <MiniBtn label="Duplicate" onClick={(e) => { e.stopPropagation(); duplicate(block.id); }}><Copy className="size-3" /></MiniBtn>
                          <MiniBtn label="Delete" destructive onClick={(e) => { e.stopPropagation(); remove(block.id); }}><Trash2 className="size-3" /></MiniBtn>
                        </div>
                        <div className="pointer-events-none [&_a]:pointer-events-none" dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: block inspector (sticky) */}
          <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {selected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-semibold text-primary">{selectedLabel} settings</h3>
                    <MiniBtn label="Delete block" destructive onClick={() => remove(selected.id)}><Trash2 className="size-3.5" /></MiniBtn>
                  </div>
                  <BlockFields block={selected} onPatch={(patch) => update(selected.id, patch)} onRewrite={(instruction) => void rewrite(selected, instruction)} rewriting={rewritingId === selected.id} />
                  <div className="border-t border-border/60 pt-3">
                    <SectionSettings props={selected.props} onPatch={(patch) => update(selected.id, patch)} />
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <LayoutGrid className="mx-auto mb-2 size-6 opacity-40" />
                  Select a block on the canvas to edit its settings.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {fullPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFullPreview(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Full preview</p>
              <button type="button" onClick={() => setFullPreview(false)} className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-4" /></button>
            </div>
            <iframe title="Full email preview" srcDoc={previewHtml} className="h-[70vh] w-full rounded-lg border border-border bg-white" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniBtn({ children, onClick, label, disabled, destructive }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; label: string; disabled?: boolean; destructive?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn("inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40", destructive && "hover:bg-destructive/10 hover:text-destructive")}>
      {children}
    </button>
  );
}
