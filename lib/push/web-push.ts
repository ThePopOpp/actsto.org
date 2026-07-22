import "server-only";

import webpush from "web-push";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@actsto.org";

let configured = false;

/** True when the VAPID keypair is present in the environment. */
export function isPushConfigured() {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured || !isPushConfigured()) return isPushConfigured();
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  broadcastId?: string | null;
};

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushSendResult = {
  ok: boolean;
  /** Endpoint should be deleted (expired / unsubscribed): 404 or 410. */
  gone: boolean;
  statusCode?: number;
  error?: string;
};

/** Send a single Web Push message. Never throws — returns a structured result. */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!ensureConfigured()) {
    return { ok: false, gone: false, error: "Push notifications are not configured." };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return { ok: true, gone: false, statusCode: 201 };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      gone,
      statusCode,
      error: error instanceof Error ? error.message : "Push send failed.",
    };
  }
}
