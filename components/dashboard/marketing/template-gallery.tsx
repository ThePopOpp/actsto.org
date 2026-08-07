"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, Mail, Printer, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketingPreviewDialog } from "@/components/dashboard/marketing/marketing-preview-dialog";
import { ScaledPreview } from "@/components/dashboard/marketing/scaled-preview";
import { VariantPicker } from "@/components/dashboard/marketing/variant-picker";
import type { Campaign } from "@/lib/campaigns";
import { blocksToHtml, type BlogBlock } from "@/lib/blog/blocks";
import { buildMarketingContent, type MarketingContent } from "@/lib/marketing/campaign-content";
import {
  getVariant,
  type MarketingVariant,
  type MarketingVariantId,
} from "@/lib/marketing/design-variants";
import { templatesFor, type MediaTemplate } from "@/lib/marketing/media-templates";
import { getCanvas, MEDIA_TYPES, type MediaTypeDef, type MediaTypeId } from "@/lib/marketing/media-types";
import { cn } from "@/lib/utils";

const NO_CAMPAIGN = "__none__";

const CATEGORY_ICONS: Record<MediaTypeId, LucideIcon> = {
  postcard: Printer,
  email: Mail,
  social: Share2,
};

/**
 * Templates, grouped by what they're for.
 *
 * One category open at a time — postcards with postcards, emails with emails.
 * Opening a second closes the first, so the page never becomes three stacked
 * galleries you have to scroll past to reach the one you wanted.
 */
export function TemplateGallery({
  campaigns = [],
  variantId,
  onVariantChange,
  onOpenBuilder,
}: {
  campaigns?: Campaign[];
  variantId: MarketingVariantId;
  onVariantChange: (id: MarketingVariantId) => void;
  /** Jumps to the builder for a media type with a template pre-applied. */
  onOpenBuilder?: (mediaType: MediaTypeId, templateId: string) => void;
}) {
  const [slug, setSlug] = useState<string>(campaigns[0]?.slug ?? NO_CAMPAIGN);
  const [openCategory, setOpenCategory] = useState<MediaTypeId>("postcard");
  const [previewing, setPreviewing] = useState<MediaTemplate | null>(null);

  const campaign = campaigns.find((c) => c.slug === slug) ?? null;
  const content = campaign ? buildMarketingContent(campaign) : SAMPLE_CONTENT;
  const variant = getVariant(variantId);
  const previewBlocks: BlogBlock[] = previewing ? previewing.build(content, variant) : [];

  return (
    <div className="space-y-5">
      {/* The two things that change what every template below renders as. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Label htmlFor="template-campaign">Preview with campaign</Label>
          <Select
            value={slug}
            onValueChange={(value) => setSlug(String(value))}
            items={{
              [NO_CAMPAIGN]: "Sample campaign",
              ...Object.fromEntries(campaigns.map((c) => [c.slug, c.title])),
            }}
          >
            <SelectTrigger id="template-campaign" className="mt-1.5 w-full">
              <SelectValue placeholder="Choose a campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CAMPAIGN}>Sample campaign</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {campaign
              ? "Templates fill themselves in from this campaign."
              : "Showing sample content. Pick one of your campaigns to see the real thing."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="font-heading text-sm font-semibold text-primary">Design</p>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
            Applies to every template, in every category.
          </p>
          <VariantPicker value={variantId} onChange={onVariantChange} />
        </div>
      </div>

      {/* Categories — one open at a time. */}
      <div className="space-y-3">
        {MEDIA_TYPES.map((mediaType) => {
          const open = openCategory === mediaType.id;
          const Icon = CATEGORY_ICONS[mediaType.id];
          const templates = templatesFor(mediaType.id);
          return (
            <section
              key={mediaType.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
                open ? "border-primary/40" : "border-border",
              )}
            >
              <h2>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenCategory(mediaType.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-lg font-semibold text-primary">
                      {mediaType.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {mediaType.description}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {templates.length} template{templates.length === 1 ? "" : "s"}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
              </h2>

              {open ? (
                <div className="grid gap-4 border-t border-border/60 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  {templates.map((template) => (
                    <figure
                      key={template.id}
                      className="flex flex-col rounded-lg border border-border p-3"
                    >
                      <div className="mb-3">
                        {template.blank ? (
                          <BlankThumb mediaType={mediaType} />
                        ) : (
                          <ScaledPreview
                            html={blocksToHtml(template.build(content, variant))}
                            designWidth={mediaType.contentWidth}
                            aspectRatio={aspectOf(mediaType)}
                            background={canvasFillOf(mediaType, variant)}
                            radius={variant.radius}
                            className="shadow-sm"
                          />
                        )}
                      </div>
                      <figcaption className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{template.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
                      </figcaption>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenBuilder?.(mediaType.id, template.id)}
                          disabled={!onOpenBuilder}
                        >
                          Use
                        </Button>
                        {!template.blank ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() => setPreviewing(template)}
                          >
                            <Eye className="size-4" />
                            Preview
                          </Button>
                        ) : null}
                      </div>
                    </figure>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {previewing ? (
        <MarketingPreviewDialog
          open
          onOpenChange={(next) => {
            if (!next) setPreviewing(null);
          }}
          title={previewing.name}
          description={`${variant.name} design · ${content.title}`}
          shareUrl={content.url}
          html={previewDocument(previewBlocks, variant, previewing.mediaType)}
          copies={[{ label: "Copy HTML", value: () => blocksToHtml(previewBlocks), html: true }]}
          downloads={[
            {
              label: "Download .html",
              filename: `${content.slug}-${previewing.id}.html`,
              content: () => previewDocument(previewBlocks, variant, previewing.mediaType),
              mimeType: "text/html;charset=utf-8",
            },
          ]}
          options={
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onOpenBuilder?.(previewing.mediaType, previewing.id);
                setPreviewing(null);
              }}
              disabled={!onOpenBuilder}
            >
              <Check className="size-4" />
              Use this template
            </Button>
          }
        />
      ) : null}
    </div>
  );
}

/** CSS aspect string for a media type's first (default) canvas. */
function aspectOf(mediaType: MediaTypeDef): string | undefined {
  if (!mediaType.fixedAspect) return "3 / 4";
  const canvas = getCanvas(mediaType, null);
  return `${canvas.widthPx} / ${canvas.heightPx}`;
}

/** The fill a document sits on — the variant's canvas for print and social,
 *  white for email, matching what the builder and the exports produce. */
function canvasFillOf(mediaType: MediaTypeDef, variant: MarketingVariant): string {
  if (!mediaType.darkCanvas) return "#ffffff";
  return variant.canvasFill.mode === "gradient"
    ? `linear-gradient(160deg, ${variant.canvasFill.from} 0%, ${variant.canvasFill.to} 100%)`
    : variant.canvasFill.from;
}

function BlankThumb({ mediaType }: { mediaType: MediaTypeDef }) {
  return (
    <div
      className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
      style={{ aspectRatio: aspectOf(mediaType) }}
    >
      Start from nothing
    </div>
  );
}

/** Standalone document for the preview iframe, on the variant's canvas. */
function previewDocument(
  blocks: BlogBlock[],
  variant: MarketingVariant,
  mediaTypeId: MediaTypeId,
): string {
  const dark = mediaTypeId !== "email";
  const fill = dark
    ? variant.canvasFill.mode === "gradient"
      ? `linear-gradient(160deg, ${variant.canvasFill.from} 0%, ${variant.canvasFill.to} 100%)`
      : variant.canvasFill.from
    : "#ffffff";
  const width = mediaTypeId === "email" ? 600 : 520;
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f5f6f8;">
  <div style="max-width:${width}px;margin:0 auto;padding:32px;background:${fill};border-radius:12px;">${blocksToHtml(blocks)}</div>
</body></html>`;
}

/** Stand-in so the gallery still demonstrates the designs with no campaign yet. */
const SAMPLE_CONTENT: MarketingContent = {
  slug: "sample-campaign",
  title: "Help Ava Finish the Year",
  tagline: "A Christ-centered education, one year at a time.",
  excerpt:
    "Ava is a 5th grader who loves science fair season and reads two grades ahead. We're raising tuition so she can stay at the school that got her there.",
  description:
    "Every gift goes straight to tuition, and Arizona's tax-credit program means most Arizona filers get it back.",
  url: "https://actsto.org/campaigns/sample-campaign",
  donateUrl: "https://actsto.org/campaigns/sample-campaign?give=1",
  imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
  studentFirstName: "Ava",
  studentNames: "Ava",
  gradeDisplay: "5th Grade",
  schoolName: "Valley Christian Schools",
  parentName: "The Bennett Family",
  parentEmail: "",
  goal: 12000,
  raised: 7400,
  remaining: 4600,
  percent: 62,
  donorCount: 24,
  daysLeft: 21,
  endDate: "2026-12-31",
};
