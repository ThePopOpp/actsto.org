"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Code,
  Columns2,
  Columns3,
  Columns4,
  Copy,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Images,
  Loader2,
  Minus,
  MousePointerClick,
  MoveVertical,
  Music,
  Pilcrow,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";

import {
  BLOG_BLOCK_DEFS,
  blockDefaults,
  blockToHtml,
  type BlogBlock,
  type BlogBlockProps,
  type BlogBlockType,
  type GalleryImage,
} from "@/lib/blog/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextField } from "@/components/dashboard/admin/blog/rich-text-field";
import { cn } from "@/lib/utils";

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

/** Reusable media uploader → Supabase, returns the public URL. */
export function MediaUpload({
  accept,
  label,
  onUploaded,
}: {
  accept: string;
  label: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog-media/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) throw new Error(data?.error ?? "Upload failed.");
      onUploaded(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
        {busy ? "Uploading…" : label}
      </Button>
      {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
    </div>
  );
}

const FONT_FAMILY_OPTIONS: { label: string; value: string }[] = [
  { label: "Heading (serif)", value: "" },
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Rounded", value: "'Trebuchet MS', sans-serif" },
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function makeBlock(type: BlogBlockType): BlogBlock {
  return { id: uid(), type, props: blockDefaults(type) };
}

type AiAction = "generate" | "rewrite" | "meta";
async function callAi(action: AiAction, payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/blog-posts/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } & Record<string, unknown>;
  if (!res.ok) throw new Error(data?.error ?? "AI request failed.");
  return data;
}

export function BlockEditor({
  value,
  onChange,
}: {
  value: BlogBlock[];
  onChange: (blocks: BlogBlock[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function add(type: BlogBlockType) {
    onChange([...value, makeBlock(type)]);
  }
  function update(id: string, patch: Partial<BlogBlockProps>) {
    onChange(value.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)));
  }
  function remove(id: string) {
    onChange(value.filter((b) => b.id !== id));
  }
  function duplicate(id: string) {
    const i = value.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = { ...value[i], id: uid(), props: { ...value[i].props } };
    onChange([...value.slice(0, i + 1), copy, ...value.slice(i + 1)]);
  }
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  async function generate() {
    if (!topic.trim()) return;
    setBusy("generate");
    setError(null);
    try {
      const data = (await callAi("generate", { topic })) as { blocks?: BlogBlock[] };
      const generated = Array.isArray(data.blocks) ? data.blocks : [];
      if (generated.length) {
        onChange([...value, ...generated.map((b) => ({ ...b, id: uid() }))]);
        setGenOpen(false);
        setTopic("");
      } else {
        setError("The AI didn't return any blocks. Try a more specific topic.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function rewrite(block: BlogBlock, instruction: string) {
    setBusy(block.id);
    setError(null);
    try {
      const data = (await callAi("rewrite", { text: block.props.content ?? "", instruction })) as {
        text?: string;
      };
      if (data.text) update(block.id, { content: data.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Block library + AI */}
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Add block
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setGenOpen((o) => !o)}>
            <Sparkles className="mr-1.5 size-3.5" />
            AI draft
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BLOG_BLOCK_DEFS.map((def) => {
            const Icon = ICONS[def.icon] ?? Pilcrow;
            return (
              <button
                key={def.type}
                type="button"
                onClick={() => add(def.type)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="size-3.5 text-primary" />
                {def.label}
              </button>
            );
          })}
        </div>
        {genOpen ? (
          <div className="mt-3 rounded-md border border-primary/25 bg-background p-3">
            <Label htmlFor="ai-topic" className="text-xs">
              Describe the article — AI drafts heading + paragraph blocks you can edit
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="ai-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How Arizona's private-school tax credit works for families"
              />
              <Button type="button" onClick={() => void generate()} disabled={busy === "generate" || !topic.trim()}>
                {busy === "generate" ? "Drafting…" : "Generate"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Canvas */}
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No blocks yet. Add one above, or use <strong>AI draft</strong> to generate a starting point.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((block, i) => {
            const Icon = ICONS[BLOG_BLOCK_DEFS.find((d) => d.type === block.type)?.icon ?? "Pilcrow"] ?? Pilcrow;
            return (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDragIdx(i)}
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
                className={cn(
                  "rounded-lg border bg-card transition-colors",
                  overIdx === i && dragIdx !== null ? "border-primary ring-2 ring-primary/30" : "border-border/80",
                  dragIdx === i && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                  <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
                  <Icon className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {BLOG_BLOCK_DEFS.find((d) => d.type === block.type)?.label ?? block.type}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="size-3.5" />
                    </IconBtn>
                    <IconBtn label="Move down" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowDown className="size-3.5" />
                    </IconBtn>
                    <IconBtn label="Duplicate" onClick={() => duplicate(block.id)}>
                      <Copy className="size-3.5" />
                    </IconBtn>
                    <IconBtn label="Delete" onClick={() => remove(block.id)} destructive>
                      <Trash2 className="size-3.5" />
                    </IconBtn>
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  <BlockFields
                    block={block}
                    onPatch={(patch) => update(block.id, patch)}
                    onRewrite={(instruction) => void rewrite(block, instruction)}
                    rewriting={busy === block.id}
                  />
                  <div
                    className="rounded-md border border-border/50 bg-background p-3 [&_a]:text-act-red [&_a]:underline [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{ __html: blockToHtml(block) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

const REWRITES = [
  { label: "Improve", instruction: "Improve clarity and flow while keeping the meaning." },
  { label: "Shorten", instruction: "Make it more concise." },
  { label: "Expand", instruction: "Expand with a little more detail." },
  { label: "Warmer", instruction: "Rewrite in a warmer, more encouraging tone." },
];

function AlignField({ props, onPatch }: { props: BlogBlockProps; onPatch: (p: Partial<BlogBlockProps>) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">Align</Label>
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onPatch({ align: a })}
            className={cn(
              "rounded border px-2 py-1 text-xs capitalize",
              props.align === a || (!props.align && a === "left")
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}

function RewriteBar({ onRewrite, busy }: { onRewrite: (instruction: string) => void; busy?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
        <Wand2 className="size-3.5" /> AI
      </span>
      {REWRITES.map((r) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onRewrite(r.instruction)}
          disabled={busy}
          className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {busy ? "…" : r.label}
        </button>
      ))}
    </div>
  );
}

export function BlockFields({
  block,
  onPatch,
  onRewrite,
  rewriting,
}: {
  block: BlogBlock;
  onPatch: (p: Partial<BlogBlockProps>) => void;
  onRewrite: (instruction: string) => void;
  rewriting?: boolean;
}) {
  const p = block.props;
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["h1", "h2", "h3"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onPatch({ level: lvl })}
                  className={cn(
                    "rounded border px-2 py-1 text-xs uppercase",
                    (p.level ?? "h2") === lvl ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <AlignField props={p} onPatch={onPatch} />
          </div>
          <Input value={p.content ?? ""} onChange={(e) => onPatch({ content: e.target.value })} placeholder="Heading text" />
          <div className="flex flex-wrap items-end gap-3">
            <ColorField label="Color" value={p.color ?? "#1e2a4a"} onChange={(v) => onPatch({ color: v })} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Font</Label>
              <select
                value={p.fontFamily ?? ""}
                onChange={(e) => onPatch({ fontFamily: e.target.value || undefined })}
                className="h-8 rounded border border-border bg-background px-1 text-xs text-foreground"
              >
                {FONT_FAMILY_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Size (px)</Label>
              <Input
                type="number"
                value={p.fontSize ?? ""}
                onChange={(e) => onPatch({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="auto"
                className="h-8 w-20"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Weight</Label>
              <select
                value={p.fontWeight ?? "600"}
                onChange={(e) => onPatch({ fontWeight: e.target.value })}
                className="h-8 rounded border border-border bg-background px-1 text-xs text-foreground"
              >
                {["300", "400", "500", "600", "700", "800"].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "paragraph":
      return (
        <div className="space-y-2">
          <RichTextField
            value={p.content ?? ""}
            onChange={(html) => onPatch({ content: html })}
            placeholder="Write your paragraph… use the toolbar for bold, color, size, font, lists and alignment."
          />
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2">
          <RichTextField
            value={p.content ?? ""}
            onChange={(html) => onPatch({ content: html })}
            placeholder="Quote text"
          />
          <Input value={p.author ?? ""} onChange={(e) => onPatch({ author: e.target.value })} placeholder="Attribution (optional)" />
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MediaUpload accept="image/*" label="Upload image" onUploaded={(url) => onPatch({ src: url })} />
            {p.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.src} alt="" className="h-10 w-14 rounded border border-border/60 object-cover" />
            ) : null}
          </div>
          <Input value={p.src ?? ""} onChange={(e) => onPatch({ src: e.target.value })} placeholder="…or paste an image URL" className="font-mono text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={p.alt ?? ""} onChange={(e) => onPatch({ alt: e.target.value })} placeholder="Alt text" />
            <Input value={p.linkUrl ?? ""} onChange={(e) => onPatch({ linkUrl: e.target.value })} placeholder="Link URL (optional)" />
          </div>
          <Input value={p.caption ?? ""} onChange={(e) => onPatch({ caption: e.target.value })} placeholder="Caption (optional)" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Width</Label>
              <Input value={p.imgWidth ?? "100%"} onChange={(e) => onPatch({ imgWidth: e.target.value })} className="h-8 w-24" />
            </div>
            <AlignField props={p} onPatch={onPatch} />
          </div>
        </div>
      );
    case "gallery":
      return <GalleryFields props={p} onPatch={onPatch} />;
    case "video":
      return (
        <div className="space-y-2">
          <MediaUpload accept="video/*" label="Upload video (MP4)" onUploaded={(url) => onPatch({ videoUrl: url })} />
          <Input value={p.videoUrl ?? ""} onChange={(e) => onPatch({ videoUrl: e.target.value })} placeholder="Video URL (YouTube, Vimeo, MP4…)" className="font-mono text-sm" />
          <Input value={p.poster ?? ""} onChange={(e) => onPatch({ poster: e.target.value })} placeholder="Poster image URL (optional, for MP4)" className="font-mono text-sm" />
          <Input value={p.caption ?? ""} onChange={(e) => onPatch({ caption: e.target.value })} placeholder="Caption (optional)" />
        </div>
      );
    case "audio":
      return (
        <div className="space-y-2">
          <MediaUpload accept="audio/*" label="Upload audio" onUploaded={(url) => onPatch({ audioUrl: url })} />
          <Input value={p.audioUrl ?? ""} onChange={(e) => onPatch({ audioUrl: e.target.value })} placeholder="…or paste an audio URL" className="font-mono text-sm" />
          <Input value={p.audioTitle ?? ""} onChange={(e) => onPatch({ audioTitle: e.target.value })} placeholder="Track title (optional)" />
          <Textarea value={p.audioDesc ?? ""} onChange={(e) => onPatch({ audioDesc: e.target.value })} className="min-h-[56px]" placeholder="Description (optional)" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Start (s)</Label>
              <Input type="number" value={p.audioStart ?? ""} onChange={(e) => onPatch({ audioStart: e.target.value ? Number(e.target.value) : undefined })} className="h-8 w-20" placeholder="0" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Stop (s)</Label>
              <Input type="number" value={p.audioEnd ?? ""} onChange={(e) => onPatch({ audioEnd: e.target.value ? Number(e.target.value) : undefined })} className="h-8 w-20" placeholder="end" />
            </div>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={p.buttonText ?? ""} onChange={(e) => onPatch({ buttonText: e.target.value })} placeholder="Button label" />
            <Input value={p.buttonUrl ?? ""} onChange={(e) => onPatch({ buttonUrl: e.target.value })} placeholder="Button URL" className="font-mono text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ColorField label="Background" value={p.buttonBgColor ?? "#1e2a4a"} onChange={(v) => onPatch({ buttonBgColor: v })} />
            <ColorField label="Text" value={p.buttonColor ?? "#ffffff"} onChange={(v) => onPatch({ buttonColor: v })} />
            <AlignField props={p} onPatch={onPatch} />
          </div>
        </div>
      );
    case "code":
      return (
        <Textarea value={p.content ?? ""} onChange={(e) => onPatch({ content: e.target.value })} className="min-h-[120px] font-mono text-sm" placeholder="Code…" />
      );
    case "spacer":
      return (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Height (px)</Label>
          <Input type="number" value={p.height ?? 32} onChange={(e) => onPatch({ height: Number(e.target.value) || 0 })} className="h-8 w-28" />
        </div>
      );
    case "divider":
      return <p className="text-xs text-muted-foreground">A horizontal rule.</p>;
    case "columns":
    case "columns3":
    case "columns4": {
      const keys: (keyof BlogBlockProps)[] =
        block.type === "columns" ? ["col1", "col2"] : block.type === "columns3" ? ["col1", "col2", "col3"] : ["col1", "col2", "col3", "col4"];
      return (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {keys.map((k, idx) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs text-muted-foreground">Column {idx + 1}</Label>
                <RichTextField
                  value={(p[k] as string) ?? ""}
                  onChange={(html) => onPatch({ [k]: html } as Partial<BlogBlockProps>)}
                  placeholder={`Column ${idx + 1}`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Gap (px)</Label>
            <Input type="number" value={p.colGap ?? 20} onChange={(e) => onPatch({ colGap: Number(e.target.value) || 0 })} className="h-8 w-24" />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

function GalleryFields({
  props,
  onPatch,
}: {
  props: BlogBlockProps;
  onPatch: (p: Partial<BlogBlockProps>) => void;
}) {
  const images: GalleryImage[] = Array.isArray(props.images) ? props.images : [];
  const setImages = (next: GalleryImage[]) => onPatch({ images: next });
  const addImage = (src = "") => setImages([...images, { src, alt: "", caption: "" }]);
  const updateImage = (i: number, patch: Partial<GalleryImage>) =>
    setImages(images.map((im, idx) => (idx === i ? { ...im, ...patch } : im)));
  const removeImage = (i: number) => setImages(images.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Columns</Label>
          <select
            value={props.galleryCols ?? 3}
            onChange={(e) => onPatch({ galleryCols: Number(e.target.value) })}
            className="h-8 rounded border border-border bg-background px-1 text-xs text-foreground"
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Gap (px)</Label>
          <Input type="number" value={props.colGap ?? 12} onChange={(e) => onPatch({ colGap: Number(e.target.value) || 0 })} className="h-8 w-20" />
        </div>
      </div>

      <div className="space-y-2">
        {images.map((im, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-border/60 p-2">
            {im.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={im.src} alt="" className="h-12 w-12 shrink-0 rounded border border-border/60 object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border/60 bg-muted text-muted-foreground">
                <ImageIcon className="size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Input value={im.src} onChange={(e) => updateImage(i, { src: e.target.value })} placeholder="Image URL" className="h-8 font-mono text-xs" />
              <div className="grid grid-cols-2 gap-1.5">
                <Input value={im.alt ?? ""} onChange={(e) => updateImage(i, { alt: e.target.value })} placeholder="Alt" className="h-8" />
                <Input value={im.caption ?? ""} onChange={(e) => updateImage(i, { caption: e.target.value })} placeholder="Caption" className="h-8" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeImage(i)}
              aria-label="Remove image"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <MediaUpload accept="image/*" label="Upload image" onUploaded={(url) => addImage(url)} />
        <Button type="button" variant="outline" size="sm" onClick={() => addImage()}>
          <Plus className="mr-1.5 size-3.5" /> Add by URL
        </Button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">{label}</Label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-8 cursor-pointer rounded border border-border bg-background"
        aria-label={label}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: number | undefined;
  fallback: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="mt-1 h-8"
        value={value ?? fallback}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

/** Section spacing + background inspector — applies to any block. */
export function SectionSettings({
  props,
  onPatch,
}: {
  props: BlogBlockProps;
  onPatch: (p: Partial<BlogBlockProps>) => void;
}) {
  const bgOn = Boolean(props.bgColor);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Section</p>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Margin top" value={props.marginTop} fallback={0} onChange={(v) => onPatch({ marginTop: v })} />
        <NumField label="Margin bottom" value={props.marginBottom} fallback={20} onChange={(v) => onPatch({ marginBottom: v })} />
        <NumField label="Pad top" value={props.paddingTop} fallback={bgOn ? 16 : 0} onChange={(v) => onPatch({ paddingTop: v })} />
        <NumField label="Pad bottom" value={props.paddingBottom} fallback={bgOn ? 16 : 0} onChange={(v) => onPatch({ paddingBottom: v })} />
      </div>
      <NumField label="Pad left / right" value={props.paddingSide} fallback={bgOn ? 16 : 0} onChange={(v) => onPatch({ paddingSide: v })} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sec-bg"
            checked={bgOn}
            onChange={(e) => onPatch({ bgColor: e.target.checked ? "#f5fbff" : undefined })}
            className="size-4"
          />
          <Label htmlFor="sec-bg" className="text-xs">
            Background color
          </Label>
        </div>
        {bgOn ? (
          <input
            type="color"
            value={props.bgColor ?? "#f5fbff"}
            onChange={(e) => onPatch({ bgColor: e.target.value })}
            className="size-8 cursor-pointer rounded border border-border bg-background"
            aria-label="Background color"
          />
        ) : null}
      </div>
    </div>
  );
}
