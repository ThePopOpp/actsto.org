"use client";

import { useSyncExternalStore, useState } from "react";

import { EmailStudio } from "@/components/dashboard/marketing/email-studio";
import { PostcardBuilder } from "@/components/dashboard/marketing/postcard-builder";
import { SocialCampaignBuilder } from "@/components/dashboard/marketing/social-campaign-builder";
import { TemplateGallery } from "@/components/dashboard/marketing/template-gallery";
import type { Campaign } from "@/lib/campaigns";
import {
  getVariantServerSnapshot,
  getVariantSnapshot,
  setVariantChoice,
  subscribeVariant,
} from "@/lib/marketing/variant-store";
import { cn } from "@/lib/utils";

type MarketingTab = "templates" | "emails" | "digital" | "print" | "social";

const tabs: { id: MarketingTab; label: string; description: string }[] = [
  {
    id: "templates",
    label: "Templates",
    description: "Pick one design and every channel below follows it.",
  },
  {
    id: "emails",
    label: "Emails",
    description:
      "Ready-to-send emails built from your campaign — copy, download, or send yourself a test.",
  },
  {
    id: "digital",
    label: "Digital postcards",
    description: "Email-friendly layouts, share links, and free digital distribution.",
  },
  {
    id: "print",
    label: "Print postcards",
    description: "Direct mail panels, mailing lists, and print-vendor handoff.",
  },
  {
    id: "social",
    label: "Social media",
    description: "Story and feed templates aligned with ACTSTO.org campaigns.",
  },
];

export function MarketingHub({
  variant,
  campaigns,
}: {
  variant: "admin" | "parent";
  campaigns?: Campaign[];
}) {
  const [tab, setTab] = useState<MarketingTab>("templates");
  // The design choice is persisted, so it comes from a store rather than local
  // state — see lib/marketing/variant-store.ts for why.
  const designId = useSyncExternalStore(
    subscribeVariant,
    getVariantSnapshot,
    getVariantServerSnapshot,
  );

  return (
    <div className="space-y-6">
      {/* Sticky so the channel you're working in stays visible down a long
          builder. top-14 clears the mobile dashboard header; there is no such
          bar from lg up, so it sits at the top there. */}
      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap gap-1 rounded-xl border border-border bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors sm:flex-none",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{tabs.find((x) => x.id === tab)?.description}</p>

      {tab === "templates" ? (
        <TemplateGallery campaigns={campaigns} variantId={designId} onVariantChange={setVariantChoice} />
      ) : null}
      {tab === "emails" ? (
        <EmailStudio campaigns={campaigns} variantId={designId} onVariantChange={setVariantChoice} />
      ) : null}
      {tab === "digital" ? (
        <PostcardBuilder
          channel="digital"
          variant={variant}
          campaigns={campaigns}
          designId={designId}
          onDesignChange={setVariantChoice}
        />
      ) : null}
      {tab === "print" ? (
        <PostcardBuilder
          channel="print"
          variant={variant}
          campaigns={campaigns}
          designId={designId}
          onDesignChange={setVariantChoice}
        />
      ) : null}
      {tab === "social" ? (
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
