"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Code, Columns2, Columns3, Columns4, Heading as HeadingIcon, Image as ImageIcon, Images,
  Loader2, Minus, MousePointerClick, MoveVertical, Music, Pilcrow, Plus, Quote, Save, Trash2,
} from "lucide-react";

import { BlockFields, SectionSettings } from "@/components/dashboard/admin/blog/block-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOG_BLOCK_DEFS, blockDefaults, blockToHtml, coerceBlocks,
  type BlogBlock, type BlogBlockProps, type BlogBlockType,
} from "@/lib/blog/blocks";
import { SOCIAL_PLATFORMS, defaultMedium, getMedium, getPlatform } from "@/lib/social/dimensions";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading: HeadingIcon, Pilcrow, Image: ImageIcon, Images, Video: MoveVertical, Music, Quote,
  MousePointerClick, Columns2, Columns3, Columns4, Code, Minus, MoveVertical,
};

type PostRow = { id: string; title: string; platform: string; medium: string; status: string; updatedAt: string };

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}
function fit(w: number, h: number, maxW = 460, maxH = 540) {
  const s = Math.min(maxW / w, maxH / h, 1);
  return { s, w: Math.round(w * s), h: Math.round(h * s) };
}

export function SocialComposer() {
  const [mode, setMode] = useState<"library" | "compose">("library");
  const [posts, setPosts] = useState<PostRow[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("New social post");
  const [platform, setPlatform] = useState("instagram");
  const [medium, setMedium] = useState("square");
  const [bgColor, setBgColor] = useState("#0b1220");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("draft");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const dims = useMemo(() => getMedium(platform, medium) ?? defaultMedium(platform)!, [platform, medium]);
  const box = useMemo(() => fit(dims.width, dims.height), [dims]);
  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/admin/social", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { posts?: PostRow[] } | null;
    if (res.ok && data) setPosts(data.posts ?? []);
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function newPost() {
    setEditId(null);
    setTitle("New social post");
    setPlatform("instagram");
    setMedium("square");
    setBgColor("#0b1220");
    setCaption("");
    setStatus("draft");
    setBlocks([]);
    setSelectedId(null);
    setMode("compose");
  }

  async function edit(id: string) {
    const res = await fetch(`/api/admin/social/${id}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { post?: { title: string; platform: string; medium: string; bgColor: string | null; caption: string | null; status: string; blocks: unknown } } | null;
    if (!res.ok || !data?.post) return;
    const p = data.post;
    setEditId(id);
    setTitle(p.title);
    setPlatform(p.platform);
    setMedium(p.medium);
    setBgColor(p.bgColor ?? "#0b1220");
    setCaption(p.caption ?? "");
    setStatus(p.status);
    const b = coerceBlocks(p.blocks);
    setBlocks(b);
    setSelectedId(b[0]?.id ?? null);
    setMode("compose");
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this post?")) return;
    await fetch(`/api/admin/social/${id}`, { method: "DELETE" });
    await loadPosts();
  }

  function addBlock(type: BlogBlockType) {
    const block = { id: uid(), type, props: blockDefaults(type) };
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }
  function update(id: string, patch: Partial<BlogBlockProps>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)));
  }
  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }
  function move(from: number, to: number) {
    setBlocks((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  async function rewrite(block: BlogBlock, instruction: string) {
    setRewritingId(block.id);
    try {
      const res = await fetch("/api/admin/blog-posts/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rewrite", text: block.props.content ?? "", instruction }) });
      const data = (await res.json().catch(() => null)) as { text?: string } | null;
      if (res.ok && data?.text) update(block.id, { content: data.text });
    } finally {
      setRewritingId(null);
    }
  }

  function pickPlatform(id: string) {
    setPlatform(id);
    setMedium(defaultMedium(id)?.id ?? "square");
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId ?? undefined, title, platform, medium, widthPx: dims.width, heightPx: dims.height, caption, blocks, bgColor, status }),
    });
    const data = (await res.json().catch(() => null)) as { post?: { id: string }; error?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.post) { setNotice(data?.error ?? "Could not save."); return; }
    setEditId(data.post.id);
    setNotice("Saved.");
    await loadPosts();
  }

  if (mode === "library") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Compose posts with the block builder, sized per platform.</p>
          <Button type="button" onClick={newPost}><Plus className="mr-1.5 size-4" /> New post</Button>
        </div>
        {posts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No posts yet. Create your first with <strong>New post</strong>.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Card key={p.id} className="border-border/80">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">{getPlatform(p.platform)?.label ?? p.platform}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{p.status}</span>
                  </div>
                  <p className="truncate font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{getMedium(p.platform, p.medium)?.label ?? p.medium}</p>
                  <div className="flex gap-1.5 pt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => void edit(p.id)}>Edit</Button>
                    <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void remove(p.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("library")}>← Library</Button>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select>
          <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />} Save</Button>
        </div>
      </div>
      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {/* Platform + medium */}
      <Card className="border-border/80"><CardContent className="flex flex-wrap items-end gap-4 p-4">
        <div>
          <Label className="text-xs text-muted-foreground">Platform</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SOCIAL_PLATFORMS.map((pl) => (
              <button key={pl.id} type="button" onClick={() => pickPlatform(pl.id)} className={cn("rounded-lg border px-3 py-1.5 text-sm", platform === pl.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{pl.label}</button>
            ))}
          </div>
        </div>
        <div className="w-52">
          <Label className="text-xs text-muted-foreground">Medium / size</Label>
          <Select value={medium} onValueChange={(v) => setMedium(v ?? "square")}>
            <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{(getPlatform(platform)?.mediums ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.label} · {m.width}×{m.height}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Background</Label>
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="mt-1 block size-9 cursor-pointer rounded border border-border" />
        </div>
      </CardContent></Card>

      {/* palette · canvas · inspector */}
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_320px]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Add block</p>
            <div className="space-y-1">
              {BLOG_BLOCK_DEFS.map((def) => {
                const Icon = ICONS[def.icon] ?? Pilcrow;
                return <button key={def.type} type="button" onClick={() => addBlock(def.type)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"><Icon className="size-4 shrink-0 text-primary" /> {def.label}</button>;
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex justify-center rounded-xl border border-border bg-muted/30 p-6">
            <div style={{ width: box.w, height: box.h, background: bgColor, overflow: "hidden", borderRadius: 12 }} className="shadow-lg ring-1 ring-black/10">
              <div style={{ width: dims.width, height: dims.height, transform: `scale(${box.s})`, transformOrigin: "top left", padding: 64 }}>
                {blocks.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Arial", fontSize: 40 }}>Add blocks from the left…</p>
                ) : (
                  blocks.map((block) => {
                    const isSel = block.id === selectedId;
                    return (
                      <div key={block.id} onClick={() => setSelectedId(block.id)} style={{ outline: isSel ? "3px solid #a93226" : undefined, outlineOffset: 6, cursor: "pointer" }}>
                        <div style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{dims.label} · {dims.width}×{dims.height}px</p>

          <div className="mt-4">
            <Label className="text-xs text-muted-foreground">Caption / post text</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 min-h-[90px]" placeholder="Write the caption that accompanies this post…" />
          </div>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-semibold text-primary">{BLOG_BLOCK_DEFS.find((d) => d.type === selected.type)?.label} settings</h3>
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => move(blocks.findIndex((b) => b.id === selected.id), blocks.findIndex((b) => b.id === selected.id) - 1)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Move up"><MoveVertical className="size-3.5 rotate-180" /></button>
                    <button type="button" onClick={() => move(blocks.findIndex((b) => b.id === selected.id), blocks.findIndex((b) => b.id === selected.id) + 1)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Move down"><MoveVertical className="size-3.5" /></button>
                    <button type="button" onClick={() => removeBlock(selected.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" aria-label="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                <BlockFields block={selected} onPatch={(patch) => update(selected.id, patch)} onRewrite={(instruction) => void rewrite(selected, instruction)} rewriting={rewritingId === selected.id} />
                <div className="border-t border-border/60 pt-3"><SectionSettings props={selected.props} onPatch={(patch) => update(selected.id, patch)} /></div>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Select a block on the canvas to edit it.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
