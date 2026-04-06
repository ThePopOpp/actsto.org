"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignStorySection } from "@/lib/campaigns";

type TabId = "story" | "updates" | "donors" | "faq";

export function CampaignDetailTabs({
  storySections,
  description,
  updateCount,
  donorCount,
  gallery,
}: {
  storySections: CampaignStorySection[];
  description: string;
  updateCount: number;
  donorCount: number;
  gallery: string[];
}) {
  const [tab, setTab] = useState<TabId>("story");

  const sections =
    storySections.length > 0
      ? storySections
      : [{ heading: "About this campaign", body: description }];

  return (
    <div className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5">
      <div
        className="flex flex-wrap gap-x-1 border-b border-border/60 px-2 sm:px-4"
        role="tablist"
        aria-label="Campaign sections"
      >
        {(
          [
            { id: "story" as const, label: "Story" },
            { id: "updates" as const, label: "Updates" },
            { id: "donors" as const, label: "Donors" },
            { id: "faq" as const, label: "FAQ" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-[3px] border-transparent px-3 py-3.5 text-sm font-medium transition-colors sm:px-4",
              tab === id
                ? "border-act-action text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab(id)}
          >
            <span>{label}</span>
            {id === "updates" && updateCount > 0 ? (
              <Badge className="h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {updateCount}
              </Badge>
            ) : null}
          </button>
        ))}
      </div>

      <div className="p-6 sm:p-8" role="tabpanel">
        {tab === "story" && (
          <div className="space-y-8">
            {sections.map((s) => (
              <section key={s.heading}>
                <h3 className="font-heading text-lg font-semibold text-primary">{s.heading}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
            {gallery.length > 0 ? (
              <section>
                <h3 className="font-heading text-lg font-semibold text-primary">Gallery</h3>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {gallery.map((src) => (
                    <div key={src} className="relative aspect-video overflow-hidden rounded-lg">
                      <Image src={src} alt="" fill className="object-cover" sizes="200px" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {tab === "updates" && (
          <div className="space-y-4 text-muted-foreground">
            <p className="text-sm leading-relaxed">
              Campaign updates will appear here when the organizer posts news, photos, or thank-you
              notes.
            </p>
            {updateCount > 0 ? (
              <p className="text-sm font-medium text-foreground">
                {updateCount} update{updateCount === 1 ? "" : "s"} — content wiring can connect to
                your CMS.
              </p>
            ) : (
              <p className="text-sm">No updates yet.</p>
            )}
          </div>
        )}

        {tab === "donors" && (
          <div className="space-y-3 text-muted-foreground">
            <p className="text-sm leading-relaxed">
              Thank you to everyone who has given. Donor rolls can respect anonymity settings when you
              connect your database.
            </p>
            <p className="text-sm font-medium text-foreground">
              {donorCount.toLocaleString()} donor{donorCount === 1 ? "" : "s"} so far
            </p>
          </div>
        )}

        {tab === "faq" && (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Is my gift a tax credit?</strong> Qualified Arizona
              private school tax-credit contributions may reduce your state tax liability dollar for
              dollar within annual limits. Consult a tax professional for your situation.
            </p>
            <p>
              <strong className="text-foreground">Can I recommend a student?</strong> You may
              express a recommendation; scholarships must comply with state law and cannot be
              directed to benefit your own dependents.
            </p>
            <p>
              <strong className="text-foreground">Who receives my donation?</strong> Gifts are made
              to the tuition organization for scholarship awards; this page is a family fundraising
              campaign.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
