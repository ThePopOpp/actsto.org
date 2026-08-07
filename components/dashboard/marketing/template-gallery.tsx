"use client";

import { useState } from "react";
import { Check, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketingPreviewDialog } from "@/components/dashboard/marketing/marketing-preview-dialog";
import {
  EmailMockup,
  PostcardMockup,
  SocialMockup,
} from "@/components/dashboard/marketing/variant-mockups";
import type { Campaign } from "@/lib/campaigns";
import { buildMarketingContent } from "@/lib/marketing/campaign-content";
import {
  MARKETING_VARIANTS,
  type MarketingVariant,
  type MarketingVariantId,
} from "@/lib/marketing/design-variants";
import { renderMarketingEmail, wrapEmailDocument } from "@/lib/marketing/email-templates";
import { cn } from "@/lib/utils";

const NO_CAMPAIGN = "__none__";

/**
 * Three designs, shown across all three channels, with your campaign in them.
 *
 * The point of this tab is a decision, not a builder: pick the look once and
 * every other tab follows. So each card shows the same campaign three ways
 * rather than offering knobs — the knobs live in the channel tabs.
 */
export function TemplateGallery({
  campaigns = [],
  variantId,
  onVariantChange,
}: {
  campaigns?: Campaign[];
  variantId: MarketingVariantId;
  onVariantChange: (id: MarketingVariantId) => void;
}) {
  const [slug, setSlug] = useState<string>(campaigns[0]?.slug ?? NO_CAMPAIGN);
  const [previewing, setPreviewing] = useState<MarketingVariant | null>(null);

  const campaign = campaigns.find((c) => c.slug === slug) ?? null;
  // A placeholder campaign keeps the gallery useful before the first campaign
  // exists — an empty grid teaches nothing about the designs.
  const content = campaign ? buildMarketingContent(campaign) : SAMPLE_CONTENT;

  const previewEmail = previewing
    ? renderMarketingEmail("announcement", content, previewing)
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:max-w-md">
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
            ? "Your campaign's headline, photo and totals are shown in each design below."
            : "Showing sample content. Pick one of your campaigns to see the real thing."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {MARKETING_VARIANTS.map((variant) => {
          const selected = variant.id === variantId;
          return (
            <div
              key={variant.id}
              className={cn(
                "flex flex-col rounded-xl border bg-card shadow-sm transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-heading text-lg font-semibold text-primary">
                    {variant.name}
                    {selected ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        In use
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{variant.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                <figure className="space-y-1.5">
                  <PostcardMockup variant={variant} content={content} className="shadow-sm" />
                  <figcaption className="text-center text-[10px] text-muted-foreground">Postcard</figcaption>
                </figure>
                <figure className="space-y-1.5">
                  <EmailMockup variant={variant} content={content} className="rounded shadow-sm" />
                  <figcaption className="text-center text-[10px] text-muted-foreground">Email</figcaption>
                </figure>
                <figure className="space-y-1.5">
                  <SocialMockup variant={variant} content={content} className="shadow-sm" />
                  <figcaption className="text-center text-[10px] text-muted-foreground">Social</figcaption>
                </figure>
              </div>

              <p className="px-4 pb-3 text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">Best for:</strong> {variant.bestFor}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 px-4 py-3">
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={() => onVariantChange(variant.id)}
                  disabled={selected}
                >
                  {selected ? <Check className="size-4" /> : null}
                  {selected ? "Using this design" : "Use this design"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => setPreviewing(variant)}
                >
                  <Eye className="size-4" />
                  Preview
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {previewing && previewEmail ? (
        <MarketingPreviewDialog
          open
          onOpenChange={(open) => {
            if (!open) setPreviewing(null);
          }}
          title={`${previewing.name} — ${content.title}`}
          description="The same campaign as a postcard, an email and a social post."
          shareUrl={content.url}
          downloads={[
            {
              label: "Download email .html",
              filename: `${content.slug}-${previewing.id}.html`,
              content: () => wrapEmailDocument(previewEmail),
              mimeType: "text/html;charset=utf-8",
            },
          ]}
          copies={[{ label: "Copy email", value: () => previewEmail.html, html: true }]}
          options={
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onVariantChange(previewing.id);
                setPreviewing(null);
              }}
              disabled={previewing.id === variantId}
            >
              {previewing.id === variantId ? "In use" : "Use this design"}
            </Button>
          }
        >
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium text-foreground">Postcard front</figcaption>
              <PostcardMockup variant={previewing} content={content} className="shadow-md" />
            </figure>
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium text-foreground">Social post</figcaption>
              <SocialMockup variant={previewing} content={content} className="shadow-md" />
            </figure>
            <figure className="space-y-2 sm:col-span-2">
              <figcaption className="text-sm font-medium text-foreground">Email</figcaption>
              <iframe
                sandbox=""
                title="Email design preview"
                srcDoc={wrapEmailDocument(previewEmail)}
                className="h-[520px] w-full rounded-lg border border-border bg-white"
              />
            </figure>
          </div>
        </MarketingPreviewDialog>
      ) : null}
    </div>
  );
}

/** Stand-in so the gallery still demonstrates the designs with no campaign yet. */
const SAMPLE_CONTENT = {
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
} satisfies ReturnType<typeof buildMarketingContent>;
