"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

import { usePushSubscription } from "@/components/pwa/use-push-subscription";
import { Button } from "@/components/ui/button";

export function PushOptIn({ className }: { className?: string }) {
  const {
    supported,
    configured,
    permission,
    subscribed,
    busy,
    isIOS,
    isStandalone,
    subscribe,
    unsubscribe,
  } = usePushSubscription();
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubscribe() {
    const result = await subscribe();
    if (result === "subscribed") {
      setNotice("You're subscribed to ACTSTO notifications on this device.");
    } else if (result === "denied") {
      setNotice("Notifications were not enabled. You can allow them in your browser settings.");
    } else if (result === "error") {
      setNotice("Could not enable notifications. Please try again.");
    }
  }

  async function handleUnsubscribe() {
    await unsubscribe();
    setNotice("Notifications turned off on this device.");
  }

  // iOS only supports Web Push from an installed (home-screen) PWA.
  if (isIOS && !isStandalone) {
    return (
      <div className={className}>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
          To get push notifications on iPhone or iPad, first install the app to your home screen
          (Share → Add to Home Screen), then open it and enable notifications here.
        </p>
      </div>
    );
  }

  if (!supported || permission === "unsupported" || configured === false) {
    return (
      <div className={className}>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <BellOff className="mt-0.5 size-4 shrink-0" />
          Push notifications aren&apos;t available in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {subscribed ? (
          <Button type="button" variant="outline" onClick={() => void handleUnsubscribe()} disabled={busy}>
            <BellOff className="mr-2 size-4" />
            {busy ? "Turning off…" : "Turn off notifications"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={busy || permission === "denied" || configured === null}
          >
            <BellRing className="mr-2 size-4" />
            {busy ? "Enabling…" : "Enable notifications"}
          </Button>
        )}
        {subscribed ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <BellRing className="size-4" /> On for this device
          </span>
        ) : null}
      </div>
      {permission === "denied" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Notifications are blocked. Allow them for actsto.org in your browser settings, then
          reload.
        </p>
      ) : null}
      {notice ? <p className="mt-2 text-sm text-primary">{notice}</p> : null}
    </div>
  );
}
