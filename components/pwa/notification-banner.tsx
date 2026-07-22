"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";

import { usePushSubscription } from "@/components/pwa/use-push-subscription";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "actsto:push-banner-dismissed-at";
const REPROMPT_DAYS = 14;
const SHOW_DELAY_MS = 4000;

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < REPROMPT_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function NotificationBanner() {
  const {
    supported,
    configured,
    permission,
    subscribed,
    busy,
    isIOS,
    isStandalone,
    subscribe,
  } = usePushSubscription();
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reveal after a short delay so it never competes with first paint.
  useEffect(() => {
    // localStorage is only readable after mount, so this dismissal check must
    // live in an effect rather than during render (which would break SSR).
    if (recentlyDismissed()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setEligible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function persistDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  async function handleEnable() {
    const result = await subscribe();
    // Whatever the outcome, stop nagging on this device for a while.
    persistDismiss();
    if (result !== "subscribed") return;
  }

  const canPrompt =
    eligible &&
    !dismissed &&
    supported &&
    configured === true &&
    permission === "default" &&
    !subscribed &&
    // On iOS, push only works once the app is installed to the home screen.
    !(isIOS && !isStandalone);

  if (!canPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-md sm:p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Stay in the loop</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Turn on notifications for campaign milestones, tax-credit reminders, and updates from
            ACTSTO.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" onClick={() => void handleEnable()} disabled={busy}>
            {busy ? "Enabling…" : "Enable"}
          </Button>
          <button
            type="button"
            onClick={persistDismiss}
            aria-label="Dismiss"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
