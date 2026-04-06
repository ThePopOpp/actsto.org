"use client";

import { useState } from "react";

import { PostcardBuilder } from "@/components/dashboard/marketing/postcard-builder";
import { SocialCampaignBuilder } from "@/components/dashboard/marketing/social-campaign-builder";
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

export function MarketingHub({ variant }: { variant: "admin" | "parent" }) {
  const [tab, setTab] = useState<MarketingTab>("digital");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/20 p-1 sm:inline-flex sm:flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors sm:w-auto sm:text-center",
              tab === t.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{tabs.find((x) => x.id === tab)?.description}</p>

      {tab === "digital" ? <PostcardBuilder channel="digital" variant={variant} /> : null}
      {tab === "print" ? <PostcardBuilder channel="print" variant={variant} /> : null}
      {tab === "social" ? <SocialCampaignBuilder variant={variant} /> : null}
    </div>
  );
}
