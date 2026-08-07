"use client";

import { useState } from "react";

import { PostcardBuilder } from "@/components/dashboard/marketing/postcard-builder";
import { SocialCampaignBuilder } from "@/components/dashboard/marketing/social-campaign-builder";
import type { Campaign } from "@/lib/campaigns";
import { cn } from "@/lib/utils";

type MarketingTab = "digital" | "print" | "social";

const tabs: { id: MarketingTab; label: string; description: string }[] = [
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
  const [tab, setTab] = useState<MarketingTab>("digital");

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

      {tab === "digital" ? <PostcardBuilder channel="digital" variant={variant} campaigns={campaigns} /> : null}
      {tab === "print" ? <PostcardBuilder channel="print" variant={variant} campaigns={campaigns} /> : null}
      {tab === "social" ? <SocialCampaignBuilder variant={variant} campaigns={campaigns} /> : null}
    </div>
  );
}
