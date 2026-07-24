"use client";

import { useState } from "react";
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
  Minus,
  MousePointerClick,
  MoveVertical,
  Pilcrow,
  Quote,
  Sparkles,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";

import {
  BLOG_BLOCK_DEFS,
  blockDefaults,
  blockToHtml,
  type BlogBlock,
  type BlogBlockProps,
  type BlogBlockType,
} from "@/lib/blog/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading,
  Pilcrow,
  Image: ImageIcon,
  Video,
  Quote,
  MousePointerClick,
  Columns2,
  Columns3,
  Columns4,
  Code,
  Minus,
  MoveVertical,
};

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
                    className="rounded-md border border-border/50 bg-background p-3"
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

function BlockFields({
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
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "paragraph":
      return (
        <div className="space-y-2">
          <AlignField props={p} onPatch={onPatch} />
          <Textarea
            value={p.content ?? ""}
            onChange={(e) => onPatch({ content: e.target.value })}
            className="min-h-[96px]"
            placeholder="Paragraph text. Use blank lines for breaks; **bold** via <b>…</b>."
          />
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2">
          <Textarea value={p.content ?? ""} onChange={(e) => onPatch({ content: e.target.value })} className="min-h-[72px]" placeholder="Quote text" />
          <Input value={p.author ?? ""} onChange={(e) => onPatch({ author: e.target.value })} placeholder="Attribution (optional)" />
          <RewriteBar onRewrite={onRewrite} busy={rewriting} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Input value={p.src ?? ""} onChange={(e) => onPatch({ src: e.target.value })} placeholder="Image URL" className="font-mono text-sm" />
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
    case "video":
      return (
        <div className="space-y-2">
          <Input value={p.videoUrl ?? ""} onChange={(e) => onPatch({ videoUrl: e.target.value })} placeholder="Video URL (YouTube, Vimeo, MP4…)" className="font-mono text-sm" />
          <Input value={p.caption ?? ""} onChange={(e) => onPatch({ caption: e.target.value })} placeholder="Caption (optional)" />
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
              <Textarea
                key={k}
                value={(p[k] as string) ?? ""}
                onChange={(e) => onPatch({ [k]: e.target.value } as Partial<BlogBlockProps>)}
                className="min-h-[72px]"
                placeholder={`Column ${idx + 1}`}
              />
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
