"use client";

import { useState, useSyncExternalStore } from "react";
import { LayoutTemplate, Mail, Printer, Share2 } from "lucide-react";

import { MediaBuilder } from "@/components/dashboard/marketing/media-builder";
import { PostcardBuilder } from "@/components/dashboard/marketing/postcard-builder";
import { SocialCampaignBuilder } from "@/components/dashboard/marketing/social-campaign-builder";
import { TemplateGallery } from "@/components/dashboard/marketing/template-gallery";
import { SegmentedTabs, type SegmentedTab } from "@/components/ui/segmented-tabs";
import type { Campaign } from "@/lib/campaigns";
import {
  getVariantServerSnapshot,
  getVariantSnapshot,
  setVariantChoice,
  subscribeVariant,
} from "@/lib/marketing/variant-store";
import { getMediaType, type MediaTypeId } from "@/lib/marketing/media-types";

type MarketingTab = "templates" | MediaTypeId;

/** Second level, inside a media type. Only shown where one exists. */
type SubTab = "builder" | "channel";

const tabs: SegmentedTab<MarketingTab>[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "postcard", label: "Postcards", icon: Printer },
  { id: "email", label: "Emails", icon: Mail },
  { id: "social", label: "Social", icon: Share2 },
];

const descriptions: Record<MarketingTab, string> = {
  templates: "Pick a starting point. Each category opens on its own.",
  postcard: "Build a postcard block by block — templates left, canvas centre, settings right.",
  email: "Build an email you can copy into Gmail, Outlook or your own mailing tool.",
  social: "Build a feed post or story at the exact pixel size each network wants.",
};

/**
 * The channel-specific workflows that predate the block builder and don't fit a
 * block canvas — mailing lists, USPS panels, network safe zones. They stay
 * nested under their own media type rather than becoming top-level tabs, so
 * postcards stay with postcards and social with social.
 */
const SUB_TABS: Partial<Record<MarketingTab, { label: string; description: string }>> = {
  postcard: {
    label: "Print & mail",
    description: "Mailing lists, USPS back panels, and handoff to a print vendor.",
  },
  social: {
    label: "Classic composer",
    description: "Network presets, story safe zones, and hashtag sets.",
  },
};

export function MarketingHub({
  variant,
  campaigns,
}: {
  variant: "admin" | "parent";
  campaigns?: Campaign[];
}) {
  const [tab, setTab] = useState<MarketingTab>("templates");
  const [subTab, setSubTab] = useState<SubTab>("builder");
  // Set when someone picks a template in the gallery, so the builder it jumps to
  // opens with that template already applied.
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

  // The design choice is persisted, so it comes from a store rather than local
  // state — see lib/marketing/variant-store.ts for why.
  const designId = useSyncExternalStore(
    subscribeVariant,
    getVariantSnapshot,
    getVariantServerSnapshot,
  );

  function openBuilder(mediaType: MediaTypeId, templateId: string) {
    setPendingTemplate(templateId);
    setSubTab("builder");
    setTab(mediaType);
  }

  const sub = SUB_TABS[tab];

  return (
    <div className="space-y-6">
      {/* Sticky so the channel you're working in stays visible down a long
          builder. top-14 clears the mobile dashboard header; there is no such
          bar from lg up, so it sits at the top there. */}
      <div className="sticky top-14 z-20 -mx-1 bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-0">
        <SegmentedTabs
          tabs={tabs}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setSubTab("builder");
          }}
          ariaLabel="Marketing channels"
        />
      </div>

      {sub ? (
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedTabs
            tabs={[
              { id: "builder" as const, label: "Builder" },
              { id: "channel" as const, label: sub.label },
            ]}
            value={subTab}
            onChange={setSubTab}
            ariaLabel={`${descriptions[tab]} sections`}
            className="bg-muted/40"
          />
          <p className="text-sm text-muted-foreground">
            {subTab === "builder" ? descriptions[tab] : sub.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{descriptions[tab]}</p>
      )}

      {tab === "templates" ? (
        <TemplateGallery
          campaigns={campaigns}
          variantId={designId}
          onVariantChange={setVariantChoice}
          onOpenBuilder={openBuilder}
        />
      ) : null}

      {tab !== "templates" && subTab === "builder" ? (
        <MediaBuilder
          // Remounting per media type is deliberate: each keeps its own
          // document, and carrying a postcard's blocks into the email builder
          // would be worse than starting clean.
          key={tab}
          mediaType={getMediaType(tab)}
          campaigns={campaigns}
          designId={designId}
          onDesignChange={setVariantChoice}
          initialTemplateId={pendingTemplate}
        />
      ) : null}

      {tab === "postcard" && subTab === "channel" ? (
        <PostcardBuilder
          channel="print"
          variant={variant}
          campaigns={campaigns}
          designId={designId}
          onDesignChange={setVariantChoice}
        />
      ) : null}

      {tab === "social" && subTab === "channel" ? (
        <SocialCampaignBuilder
          variant={variant}
          campaigns={campaigns}
          designId={designId}
          onDesignChange={setVariantChoice}
        />
      ) : null}
    </div>
  );
}
