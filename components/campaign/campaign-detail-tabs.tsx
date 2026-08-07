"use client";

import { useState } from "react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { CampaignStorySection } from "@/lib/campaigns";
import type {
  CampaignDonorItem,
  CampaignFaqItem,
  CampaignUpdateItem,
} from "@/lib/campaign-detail-record-types";
import { Stars } from "@/components/dashboard/campaign-reviews-manager";
import type { PublicReview } from "@/lib/dashboard/campaign-reviews";
import { cn, FACE_SAFE_CROP, formatLongDate, initialsOf } from "@/lib/utils";

type TabId = "story" | "updates" | "donors" | "reviews" | "faq";

export function CampaignDetailTabs({
  storySections,
  description,
  updateCount,
  donorCount,
  reviews,
  reviewsEnabled,
  gallery,
  updates,
  donors,
  faqs,
}: {
  storySections: CampaignStorySection[];
  description: string;
  updateCount: number;
  donorCount: number;
  reviews: PublicReview[];
  /** Families can turn reviews off; the tab disappears entirely when they do. */
  reviewsEnabled: boolean;
  gallery: string[];
  updates: CampaignUpdateItem[];
  donors: CampaignDonorItem[];
  faqs: CampaignFaqItem[];
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
            ...(reviewsEnabled ? [{ id: "reviews" as const, label: "Reviews" }] : []),
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
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab(id)}
          >
            <span>{label}</span>
            {id === "reviews" && reviews.length > 0 ? (
              <Badge className="h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {reviews.length}
              </Badge>
            ) : null}
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
                      <Image src={src} alt="" fill className={cn("object-cover", FACE_SAFE_CROP)} sizes="200px" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {tab === "updates" && (
          <div className="space-y-5">
            {updates.length > 0 ? (
              updates.map((update) => (
                <article key={update.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatDate(update.publishedAt)}
                  </p>
                  <h3 className="mt-2 font-heading text-lg font-semibold text-primary">{update.title}</h3>
                  {update.body ? (
                    <p className="mt-2 leading-relaxed text-muted-foreground">{update.body}</p>
                  ) : null}
                </article>
              ))
            ) : updateCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                {updateCount} update{updateCount === 1 ? "" : "s"} recorded. Published update content
                will appear here once approved.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )}
          </div>
        )}

        {tab === "donors" && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              {donorCount.toLocaleString()} donor{donorCount === 1 ? "" : "s"} so far
            </p>
            {donors.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {donors.map((donor) => (
                  <div key={donor.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{donor.displayName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(donor.createdAt)}</p>
                      </div>
                      {donor.showAmount && donor.amount != null ? (
                        <p className="font-heading font-semibold tabular-nums text-primary">
                          {formatMoney(donor.amount)}
                        </p>
                      ) : null}
                    </div>
                    {donor.message ? (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{donor.message}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Donor names and messages will appear here when paid campaign gifts are marked visible.
              </p>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews yet. Supporters can leave one from the campaign manager card above.
              </p>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    {review.authorPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.authorPhoto}
                        alt=""
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {initialsOf(review.authorName)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{review.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLongDate(review.createdAt)} ·{" "}
                        {new Date(review.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Stars rating={review.rating} />
                  </div>
                  {review.comment ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "faq" && (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <p key={faq.id}>
                  <strong className="text-foreground">{faq.question}</strong> {faq.answer}
                </p>
              ))
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Update";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
