"use client";

import { useMemo, useState } from "react";
import {
  Code,
  Columns2,
  Columns3,
  Columns4,
  Copy,
  Download,
  FileText,
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
  Send,
  Share2,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";

import { BlockFields, SectionSettings } from "@/components/dashboard/admin/blog/block-editor";
import { MarketingPreviewDialog } from "@/components/dashboard/marketing/marketing-preview-dialog";
import { VariantPicker } from "@/components/dashboard/marketing/variant-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BLOG_BLOCK_DEFS,
  blockDefaults,
  blockToHtml,
  blocksToHtml,
  type BlogBlock,
  type BlogBlockProps,
  type BlogBlockType,
} from "@/lib/blog/blocks";
import type { Campaign } from "@/lib/campaigns";
import { buildMarketingContent } from "@/lib/marketing/campaign-content";
import { getVariant, type MarketingVariantId } from "@/lib/marketing/design-variants";
import {
  getMediaTemplate,
  templatesFor,
  type MediaTemplate,
} from "@/lib/marketing/media-templates";
import { getCanvas, type MediaTypeDef } from "@/lib/marketing/media-types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Pilcrow> = {
  Heading: HeadingIcon,
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

/**
 * Merge fields available in marketing copy.
 *
 * A deliberately short list — these are pieces of a campaign, not the CRM's full
 * contact schema. A parent emailing their own address book has no merge data for
 * `{{donation_amount}}`.
 */
const DYNAMIC_FIELDS = [
  "{{first_name}}",
  "{{campaign_title}}",
  "{{campaign_url}}",
  "{{student_name}}",
  "{{school_name}}",
  "{{amount_raised}}",
  "{{goal_amount}}",
  "{{percent_funded}}",
  "{{days_left}}",
  "{{site_url}}",
];

/**
 * One builder for every media type.
 *
 * Deliberately the same three-pane shape as the email template editor — blocks
 * and templates on the left, canvas in the middle, settings on the right, both
 * side columns sticky. A postcard, an email and a social post are the same block
 * document with different page sizes, so they get the same tool rather than
 * three that drift apart.
 */
export function MediaBuilder({
  mediaType,
  campaigns = [],
  designId,
  onDesignChange,
  initialTemplateId,
}: {
  mediaType: MediaTypeDef;
  campaigns?: Campaign[];
  designId: MarketingVariantId;
  onDesignChange: (id: MarketingVariantId) => void;
  /** Applied on first render when the Templates tab hands one over. */
  initialTemplateId?: string | null;
}) {
  const [slug, setSlug] = useState<string>(campaigns[0]?.slug ?? "");
  const [canvasId, setCanvasId] = useState<string>(mediaType.canvases[0].id);
  const [blocks, setBlocks] = useState<BlogBlock[]>(() =>
    seedBlocks(initialTemplateId, campaigns[0] ?? null, designId),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(initialTemplateId ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const campaign = campaigns.find((c) => c.slug === slug) ?? campaigns[0] ?? null;
  const variant = getVariant(designId);
  const canvas = getCanvas(mediaType, canvasId);
  const templates = templatesFor(mediaType.id);
  const palette = BLOG_BLOCK_DEFS.filter((d) => mediaType.blocks.includes(d.type));
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedLabel = selected
    ? BLOG_BLOCK_DEFS.find((d) => d.type === selected.type)?.label ?? "Block"
    : null;

  const canvasBg = mediaType.darkCanvas ? variant.canvasFill.from : "#ffffff";
  const canvasStyle =
    mediaType.darkCanvas && variant.canvasFill.mode === "gradient"
      ? { background: `linear-gradient(160deg, ${variant.canvasFill.from} 0%, ${variant.canvasFill.to} 100%)` }
      : { background: canvasBg };

  const documentHtml = useMemo(() => {
    const inner = blocksToHtml(blocks);
    const fill =
      mediaType.darkCanvas && variant.canvasFill.mode === "gradient"
        ? `linear-gradient(160deg, ${variant.canvasFill.from} 0%, ${variant.canvasFill.to} 100%)`
        : canvasBg;
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${mediaType.label}</title></head>
<body style="margin:0;padding:24px;background:#f5f6f8;">
  <div style="max-width:${mediaType.contentWidth}px;margin:0 auto;padding:32px;background:${fill};border-radius:12px;">${inner}</div>
</body></html>`;
  }, [blocks, canvasBg, mediaType.contentWidth, mediaType.darkCanvas, mediaType.label, variant.canvasFill]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 1800);
  }

  function applyTemplate(template: MediaTemplate) {
    if (!campaign && !template.blank) {
      flash("Choose a campaign first — templates fill themselves in from it.");
      return;
    }
    const content = campaign ? buildMarketingContent(campaign) : null;
    const next = content ? template.build(content, variant) : [];
    setBlocks(next);
    setAppliedTemplate(template.id);
    setSelectedId(next[0]?.id ?? null);
    flash(template.blank ? "Blank canvas ready." : `Applied “${template.name}”.`);
  }

  function addBlock(type: BlogBlockType) {
    // Seeded from the current length rather than a random id: applying a
    // template twice must produce the same document, and Math.random() in a
    // render path is a hydration hazard.
    const id = `b-${type}-${blocks.length}-${Date.now().toString(36)}`;
    const block: BlogBlock = { id, type, props: withCanvasColours(blockDefaults(type)) };
    setBlocks([...blocks, block]);
    setSelectedId(id);
  }

  /** Block defaults assume a white page; a dark canvas needs light type. */
  function withCanvasColours(props: BlogBlockProps): BlogBlockProps {
    if (!mediaType.darkCanvas) return props;
    return {
      ...props,
      color: props.color ?? "#ffffff",
      buttonBgColor: props.buttonBgColor ? variant.accent : undefined,
      buttonColor: props.buttonColor ? variant.accentInk : undefined,
    };
  }

  function update(id: string, patch: Partial<BlogBlockProps>) {
    setBlocks((current) =>
      current.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)),
    );
  }

  function remove(id: string) {
    setBlocks((current) => current.filter((b) => b.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function duplicate(id: string) {
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const copy: BlogBlock = {
      ...blocks[index],
      id: `${id}-copy-${Date.now().toString(36)}`,
      props: { ...blocks[index].props },
    };
    setBlocks([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
    setSelectedId(copy.id);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
  }

  function copyField(token: string) {
    void navigator.clipboard?.writeText(token);
    flash(`Copied ${token}`);
  }

  function downloadHtml() {
    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign?.slug ?? "campaign"}-${mediaType.id}.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportImage(format: "png" | "pdf") {
    if (blocks.length === 0) {
      flash("Add a block before exporting.");
      return;
    }
    setExporting(format);
    try {
      const response = await fetch("/api/marketing/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks,
          width: canvas.widthPx,
          // Email has no fixed height; give the renderer a tall page so the
          // whole document lands on it rather than being cropped.
          height: mediaType.fixedAspect ? canvas.heightPx : 2200,
          bgColor: canvasBg,
          format,
          filename: `${campaign?.slug ?? "campaign"}-${mediaType.id}`,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        flash(data.error ?? "Could not export that design.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${campaign?.slug ?? "campaign"}-${mediaType.id}.${format}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      flash("Network error — the export didn't finish.");
    } finally {
      setExporting(null);
    }
  }

  /** Rich copy for a compose box; plain text for editors that refuse HTML. */
  async function copyDocument(asPlainText: boolean) {
    const html = blocksToHtml(blocks);
    if (!html) {
      flash("Nothing to copy yet.");
      return;
    }
    const plain = htmlToPlainText(html);
    try {
      if (!asPlainText && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        // Older Safari and Firefox have no clipboard.write; a plain-text paste
        // beats a button that silently does nothing.
        await navigator.clipboard.writeText(plain);
      }
      flash(asPlainText ? "Copied as plain text." : "Copied — paste into your email tool.");
    } catch {
      flash("Your browser blocked the clipboard. Open the preview and copy from there.");
    }
  }

  async function sendTest() {
    if (blocks.length === 0) {
      flash("Add a block before sending a test.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/marketing/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: campaign?.title ?? "Campaign email",
          html: documentHtml,
          text: htmlToPlainText(blocksToHtml(blocks)),
        }),
      });
      const data = await response.json().catch(() => ({}));
      flash(
        response.ok
          ? `Test sent to ${data.sentTo ?? "your inbox"}.`
          : (data.error ?? "Could not send the test email."),
      );
    } catch {
      flash("Network error — the test email wasn't sent.");
    } finally {
      setSending(false);
    }
  }

  const shareUrl = campaign ? buildMarketingContent(campaign).url : undefined;
  const isEmail = mediaType.id === "email";

  return (
    <div className="space-y-4">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label htmlFor={`mb-campaign-${mediaType.id}`} className="text-xs text-muted-foreground">
                Campaign
              </Label>
              <Select
                value={slug}
                onValueChange={(value) => setSlug(String(value))}
                items={Object.fromEntries(campaigns.map((c) => [c.slug, c.title]))}
              >
                <SelectTrigger id={`mb-campaign-${mediaType.id}`} className="mt-1 w-full">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Label htmlFor={`mb-size-${mediaType.id}`} className="text-xs text-muted-foreground">
                Size
              </Label>
              <Select
                value={canvasId}
                onValueChange={(value) => setCanvasId(String(value))}
                items={Object.fromEntries(mediaType.canvases.map((c) => [c.id, c.label]))}
              >
                <SelectTrigger id={`mb-size-${mediaType.id}`} className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mediaType.canvases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
              <LayoutGrid className="size-4" />
              Preview
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadHtml}>
              <Download className="size-4" />
              .html
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void exportImage("png")}
              disabled={exporting !== null}
            >
              {exporting === "png" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void exportImage("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              PDF
            </Button>
            {isEmail ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void copyDocument(false)}
                >
                  <Copy className="size-4" />
                  Copy rich
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void copyDocument(true)}
                >
                  <Copy className="size-4" />
                  Copy plain
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void sendTest()}
                  disabled={sending}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send test
                </Button>
              </>
            ) : null}
            {shareUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard?.writeText(shareUrl).then(() => flash("Campaign link copied."));
                }}
              >
                <Share2 className="size-4" />
                Share
              </Button>
            ) : null}
          </div>
        </div>

        {canvas.hint ? <p className="mt-2 text-xs text-muted-foreground">{canvas.hint}</p> : null}

        {/* Dynamic fields */}
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dynamic fields — click to copy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DYNAMIC_FIELDS.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => copyField(token)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted"
              >
                <Copy className="size-3" aria-hidden />
                {token}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice ? (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {notice}
        </p>
      ) : null}

      {/* ── Three panes ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_340px]">
        {/* Left: templates + block palette */}
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto">
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Templates
              </p>
              <div className="space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={cn(
                      "w-full rounded-lg border px-2 py-1.5 text-left transition-colors",
                      appliedTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {template.blank ? (
                        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <LayoutGrid className="size-4 shrink-0 text-primary" aria-hidden />
                      )}
                      {template.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Add block
              </p>
              <div className="space-y-1">
                {palette.map((def) => {
                  const Icon = ICONS[def.icon] ?? Pilcrow;
                  return (
                    <button
                      key={def.type}
                      type="button"
                      onClick={() => addBlock(def.type)}
                      className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-muted"
                    >
                      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Center: canvas */}
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              {blocks.length} block{blocks.length === 1 ? "" : "s"}
              {mediaType.fixedAspect ? ` · ${canvas.widthPx} × ${canvas.heightPx}px` : ""}
            </span>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Full preview
            </button>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
            {blocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
                Pick a template on the left, or add a block to start from nothing.
              </p>
            ) : (
              <div
                className="mx-auto w-full overflow-hidden rounded-xl p-6 shadow-sm sm:p-7"
                style={{
                  maxWidth: mediaType.contentWidth,
                  // A fixed-aspect medium shows its real proportions, so what
                  // you arrange is what prints. Email flows to its content.
                  aspectRatio: mediaType.fixedAspect
                    ? `${canvas.widthPx} / ${canvas.heightPx}`
                    : undefined,
                  ...canvasStyle,
                }}
              >
                {blocks.map((block, i) => {
                  const isSelected = block.id === selectedId;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedId(block.id)}
                      className={cn(
                        "group relative cursor-pointer rounded-md transition",
                        isSelected
                          ? "outline outline-2 outline-primary outline-offset-2"
                          : "hover:outline hover:outline-1 hover:outline-primary/40 hover:outline-offset-2",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute -top-3 right-1 z-10 hidden items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm group-hover:flex",
                          isSelected && "flex",
                        )}
                      >
                        <MiniBtn
                          label="Move up"
                          disabled={i === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            move(i, i - 1);
                          }}
                        >
                          <MoveVertical className="size-3 rotate-180" />
                        </MiniBtn>
                        <MiniBtn
                          label="Move down"
                          disabled={i === blocks.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            move(i, i + 1);
                          }}
                        >
                          <MoveVertical className="size-3" />
                        </MiniBtn>
                        <MiniBtn
                          label="Duplicate"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicate(block.id);
                          }}
                        >
                          <Copy className="size-3" />
                        </MiniBtn>
                        <MiniBtn
                          label="Delete"
                          destructive
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(block.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </MiniBtn>
                      </div>
                      {/* Links are inert on the canvas — clicking a block should
                          select it, not navigate away mid-edit. */}
                      <div
                        className="pointer-events-none [&_a]:pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: blockToHtml(block) }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: inspector */}
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-semibold text-primary">
                    {selectedLabel} settings
                  </h3>
                  <MiniBtn label="Delete block" destructive onClick={() => remove(selected.id)}>
                    <Trash2 className="size-3.5" />
                  </MiniBtn>
                </div>
                <BlockFields block={selected} onPatch={(patch) => update(selected.id, patch)} />
                <div className="border-t border-border/60 pt-3">
                  <SectionSettings
                    props={selected.props}
                    onPatch={(patch) => update(selected.id, patch)}
                  />
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <LayoutGrid className="mx-auto mb-2 size-6 opacity-40" aria-hidden />
                Select a block on the canvas to edit its settings.
              </div>
            )}
          </div>
        </aside>
      </div>

      <MarketingPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`${mediaType.label.replace(/s$/, "")} preview`}
        description={`${canvas.label} · ${variant.name} design`}
        html={documentHtml}
        shareUrl={shareUrl}
        copies={
          isEmail
            ? [
                { label: "Copy rich text", value: () => blocksToHtml(blocks), html: true },
                { label: "Copy plain text", value: () => htmlToPlainText(blocksToHtml(blocks)) },
              ]
            : [{ label: "Copy HTML", value: () => blocksToHtml(blocks), html: true }]
        }
        downloads={[
          {
            label: "Download .html",
            filename: `${campaign?.slug ?? "campaign"}-${mediaType.id}.html`,
            content: () => documentHtml,
            mimeType: "text/html;charset=utf-8",
          },
        ]}
        options={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void exportImage("png")}
              disabled={exporting !== null}
            >
              {exporting === "png" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              PNG
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void exportImage("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              PDF
            </Button>
          </>
        }
      />

      {/* Design switcher lives at the bottom: it's a once-per-campaign decision,
          not something you reach for while arranging blocks. */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="font-heading text-sm font-semibold text-primary">Design</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Changing this recolours the canvas and applies to every channel. Re-apply a template to
          pick up the new colours in your blocks.
        </p>
        <div className="mt-3">
          <VariantPicker value={designId} onChange={onDesignChange} />
        </div>
      </div>
    </div>
  );
}

/** Crude but adequate: only ever fed our own generated markup. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Builds the starting document for a template handed over by the Templates tab.
 * Returns an empty document for a blank template, an unknown id, or no campaign.
 */
function seedBlocks(
  templateId: string | null | undefined,
  campaign: Campaign | null,
  designId: MarketingVariantId,
): BlogBlock[] {
  if (!templateId || !campaign) return [];
  const template = getMediaTemplate(templateId);
  if (!template || template.blank) return [];
  return template.build(buildMarketingContent(campaign), getVariant(designId));
}

function MiniBtn({
  children,
  onClick,
  label,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
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
        "inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
