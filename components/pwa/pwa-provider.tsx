"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaContextValue = {
  /** A native install prompt is available (Chrome / Edge / Android). */
  canInstall: boolean;
  /** The app is already running as an installed PWA. */
  isStandalone: boolean;
  /** iOS Safari — needs the manual "Add to Home Screen" instructions. */
  isIOS: boolean;
  /** Service worker registration, once ready. */
  registration: ServiceWorkerRegistration | null;
  /** Triggers the native install prompt. Returns the user's choice. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaContext = createContext<PwaContextValue | null>(null);

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac but exposes touch points.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari exposes navigator.standalone.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(displayMode || iosStandalone);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Detect platform after mount only — running these during render would
    // desync SSR (always false) from the client and cause a hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsIOS(detectIOS());
    setIsStandalone(detectStandalone());
    /* eslint-enable react-hooks/set-state-in-effect */

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const media = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(detectStandalone());
    media?.addEventListener?.("change", onDisplayChange);

    // Register the service worker (push + offline shell).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => setRegistration(reg))
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  }, [deferredPrompt]);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: Boolean(deferredPrompt),
      isStandalone,
      isIOS,
      registration,
      promptInstall,
    }),
    [deferredPrompt, isStandalone, isIOS, registration, promptInstall],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    // Safe fallback so the hook never throws outside the provider.
    return {
      canInstall: false,
      isStandalone: false,
      isIOS: false,
      registration: null,
      promptInstall: async () => "unavailable" as const,
    } satisfies PwaContextValue;
  }
  return ctx;
}
