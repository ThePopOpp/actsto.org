"use client";

import { useState } from "react";
import { MessageSquareQuote, Star } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ManagedReview } from "@/lib/dashboard/campaign-reviews";
import { cn, formatLongDate, initialsOf } from "@/lib/utils";

/**
 * Moderate reviews and decide whether the campaign accepts them at all.
 *
 * Nothing appears publicly until it's approved here — these pages are about
 * children, and an unmoderated comment box on one is not something to ship.
 */
export function CampaignReviewsManager({
  slug,
  initialReviews,
  initialEnabled,
}: {
  slug: string;
  initialReviews: ManagedReview[];
  initialEnabled: boolean;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(payload: Record<string, unknown>, key: string) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(slug)}/reviews/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { reviews?: ManagedReview[]; reviewsEnabled?: boolean; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save that.");
      if (data?.reviews) setReviews(data.reviews);
      if (typeof data?.reviewsEnabled === "boolean") setEnabled(data.reviewsEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setPending(null);
    }
  }

  const waiting = reviews.filter((r) => r.status === "pending");
  const approved = reviews.filter((r) => r.status === "approved");
  const rejected = reviews.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Reviews on your campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="reviews-enabled"
              checked={enabled}
              disabled={pending !== null}
              onCheckedChange={(checked) =>
                void send({ action: "toggle", enabled: checked === true }, "toggle")
              }
            />
            <div>
              <Label htmlFor="reviews-enabled" className="font-normal leading-snug">
                Let supporters leave a review on my campaign page
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Turning this off hides the Reviews tab and stops new reviews. Anything already
                approved stays hidden until you turn it back on — nothing is deleted.
              </p>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Reviews are held until you approve them. Nothing appears on your campaign page without
            your say-so.
          </p>
        </CardContent>
      </Card>

      {waiting.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Waiting for you ({waiting.length})
          </h2>
          {waiting.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              pending={pending === review.id}
              onApprove={() => void send({ action: "approve", reviewId: review.id }, review.id)}
              onReject={() => void send({ action: "reject", reviewId: review.id }, review.id)}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-primary">Published</h2>
          <Badge variant="secondary">{approved.length}</Badge>
        </div>
        {approved.length === 0 ? (
          <Alert>
            <MessageSquareQuote className="size-4" />
            <AlertDescription>
              No published reviews yet. Supporters who donate are the most likely to leave one.
            </AlertDescription>
          </Alert>
        ) : (
          approved.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              pending={pending === review.id}
              onReject={() => void send({ action: "reject", reviewId: review.id }, review.id)}
            />
          ))
        )}
      </section>

      {rejected.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-muted-foreground">
            Hidden ({rejected.length})
          </h2>
          {rejected.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              pending={pending === review.id}
              onApprove={() => void send({ action: "approve", reviewId: review.id }, review.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ReviewCard({
  review,
  pending,
  onApprove,
  onReject,
}: {
  review: ManagedReview;
  pending: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <Card className="border-border/80">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {review.authorPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.authorPhoto} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary"
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

        <p className="whitespace-pre-wrap text-sm text-foreground">{review.comment}</p>

        <div className="flex flex-wrap gap-2">
          {onApprove ? (
            <Button type="button" size="sm" onClick={onApprove} disabled={pending}>
              {pending ? "Saving…" : "Publish"}
            </Button>
          ) : null}
          {onReject ? (
            <Button type="button" size="sm" variant="outline" onClick={onReject} disabled={pending}>
              {review.status === "approved" ? "Hide" : "Decline"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}
