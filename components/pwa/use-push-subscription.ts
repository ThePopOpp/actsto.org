"use client";

import { useCallback, useEffect, useState } from "react";

import { usePwa } from "@/components/pwa/pwa-provider";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/** Convert a base64url VAPID key into the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushSubscription() {
  const { registration, isIOS, isStandalone } = usePwa();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
    fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d: { configured?: boolean; publicKey?: string | null }) => {
        setConfigured(Boolean(d.configured));
        setPublicKey(d.publicKey ?? null);
      })
      .catch(() => setConfigured(false));
  }, [supported]);

  useEffect(() => {
    if (!registration) return;
    registration.pushManager
      .getSubscription()
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [registration]);

  const subscribe = useCallback(async (): Promise<
    "subscribed" | "denied" | "error" | "unavailable"
  > => {
    if (!registration || !publicKey) return "unavailable";
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return "denied";
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("save failed");
      setSubscribed(true);
      return "subscribed";
    } catch {
      return "error";
    } finally {
      setBusy(false);
    }
  }, [registration, publicKey]);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;
    setBusy(true);
    try {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [registration]);

  return {
    supported,
    configured,
    permission,
    subscribed,
    busy,
    publicKey,
    isIOS,
    isStandalone,
    subscribe,
    unsubscribe,
  };
}
