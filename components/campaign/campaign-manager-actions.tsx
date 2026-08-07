"use client";

import { useState } from "react";
import { Eye, Mail, Phone, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/**
 * The three actions on the campaign manager card: call, message, review.
 *
 * Both dialogs stay mounted and are driven by an `open` prop rather than being
 * conditionally rendered — unmounting a dialog mid-close leaves its scroll lock
 * on `<body>`, which freezes the page on iOS.
 */
export function CampaignManagerActions({
  campaignSlug,
  parentId,
  parentName,
  phoneLink,
  reviewsEnabled,
}: {
  campaignSlug: string;
  parentId?: string;
  parentName: string;
  phoneLink: string | null;
  reviewsEnabled: boolean;
}) {
  const [messageOpen, setMessageOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div className="mt-auto space-y-2 pt-1">
      {phoneLink ? (
        <a
          href={phoneLink}
          className={cn(
            buttonVariants({ variant: "cta", size: "lg" }),
            "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold",
          )}
        >
          <Phone className="size-4 shrink-0" aria-hidden />
          Call Parent
        </a>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "cta", size: "lg" }),
            "flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold opacity-60",
          )}
        >
          <Phone className="size-4 shrink-0" aria-hidden />
          No phone on file
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2 text-sm font-semibold"
        onClick={() => setMessageOpen(true)}
      >
        <Mail className="size-4 shrink-0" aria-hidden />
        Send Message
      </Button>

      {reviewsEnabled ? (
        <Button
          type="button"
          className="h-10 w-full gap-2 text-sm font-semibold"
          onClick={() => setReviewOpen(true)}
        >
          <Eye className="size-4 shrink-0" aria-hidden />
          Review
        </Button>
      ) : null}

      <MessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        parentId={parentId}
        parentName={parentName}
      />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        campaignSlug={campaignSlug}
        parentName={parentName}
      />
    </div>
  );
}

function MessageDialog({
  open,
  onOpenChange,
  parentId,
  parentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  parentName: string;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!parentId) {
      setError("This campaign manager can't be messaged yet.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Start (or reuse) the conversation, then post into it.
      const convo = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: parentId }),
      });
      const convoData = (await convo.json().catch(() => null)) as
        | { conversation?: { id: string }; id?: string; error?: string }
        | null;
      if (convo.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!convo.ok) throw new Error(convoData?.error ?? "Could not start a conversation.");

      const conversationId = convoData?.conversation?.id ?? convoData?.id;
      if (!conversationId) throw new Error("Could not start a conversation.");

      const res = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not send that message.");

      setSent(true);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Message {parentName}</DialogTitle>
          <DialogDescription>
            This goes straight to their inbox on ACTSTO.org. They&apos;ll be notified, and can
            reply there.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <p className="rounded-md border border-act-action/30 bg-act-action/5 px-3 py-3 text-sm">
            Message sent. You&apos;ll find their reply in your Messages.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="cm-message">Your message</Label>
              <Textarea
                id="cm-message"
                className="mt-1.5 min-h-32"
                placeholder="Say hello, ask a question, or send some encouragement."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {sent ? "Close" : "Cancel"}
          </Button>
          {!sent ? (
            <Button type="button" onClick={() => void send()} disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  campaignSlug,
  parentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignSlug: string;
  parentName: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignSlug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not submit your review.");
      setDone(data?.message ?? "Thanks — your review has been sent for approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Leave a review</DialogTitle>
          <DialogDescription>
            Share what stood out about {parentName}&apos;s campaign. Reviews are read by the family
            before they appear.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="rounded-md border border-act-action/30 bg-act-action/5 px-3 py-3 text-sm">
            {done}
          </p>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium text-foreground">Rating</legend>
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    aria-pressed={rating === n}
                    className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="cm-review">Your review</Label>
              <Textarea
                id="cm-review"
                className="mt-1.5 min-h-32"
                placeholder="What made you want to support this family?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done ? (
            <Button type="button" onClick={() => void submit()} disabled={saving || !comment.trim()}>
              {saving ? "Sending…" : "Submit review"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
