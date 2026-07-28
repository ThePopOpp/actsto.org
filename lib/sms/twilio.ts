import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { getTwilioSettingsForServer } from "@/lib/admin/integration-settings-server";

export type TwilioSendResult =
  | {
      ok: true;
      sid: string;
      status: string;
      from: string;
      to: string;
      segments?: number;
      price?: string | null;
      priceUnit?: string | null;
    }
  | { ok: false; error: string; status?: number };

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export function parsePhoneList(input: string): string[] {
  const phones = input
    .split(/[\n,;]+/)
    .map(normalizePhone)
    .filter(Boolean);
  return Array.from(new Set(phones));
}

export async function getTwilioRuntimeStatus() {
  const settings = await getTwilioSettingsForServer();
  const hasAccountSid = Boolean(settings.accountSid);
  const hasAuthToken = Boolean(settings.authToken);
  const hasSender = Boolean(settings.messagingServiceSid || settings.phoneNumber);
  const ready = hasAccountSid && hasAuthToken && hasSender;

  return {
    ready,
    hasAccountSid,
    hasAuthToken,
    hasPhoneNumber: Boolean(settings.phoneNumber),
    hasMessagingServiceSid: Boolean(settings.messagingServiceSid),
    sender: settings.messagingServiceSid ? "Messaging Service" : settings.phoneNumber ? settings.phoneNumber : "",
  };
}

/**
 * Candidate URLs to validate a Twilio signature against. Twilio signs the exact
 * URL configured in its console (the public https origin), but behind a reverse
 * proxy `request.url` can arrive as an internal http host — so we also try the
 * APP_URL-based public URL (with and without a trailing slash).
 */
export function twilioSignatureUrls(requestUrl: string): string[] {
  const urls = new Set<string>([requestUrl]);
  const appUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (appUrl) {
    try {
      const parsed = new URL(requestUrl);
      const base = appUrl.replace(/\/$/, "");
      urls.add(`${base}${parsed.pathname}${parsed.search}`);
    } catch {
      // ignore malformed request URL
    }
  }
  return Array.from(urls);
}

export async function validateTwilioSignature({
  url,
  params,
  signature,
}: {
  url: string | string[];
  params: FormData;
  signature: string | null;
}) {
  const settings = await getTwilioSettingsForServer();
  if (!settings.authToken) return false;
  if (!signature) return false;

  const sorted = Array.from(params.entries())
    .filter(([, value]) => typeof value === "string")
    .sort(([a], [b]) => a.localeCompare(b));
  const candidates = Array.isArray(url) ? url : [url];
  const sig = Buffer.from(signature);

  for (const candidate of candidates) {
    const base = sorted.reduce((acc, [key, value]) => `${acc}${key}${value}`, candidate);
    const expected = Buffer.from(createHmac("sha1", settings.authToken).update(base).digest("base64"));
    if (sig.length === expected.length && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}

export async function sendTwilioSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<TwilioSendResult> {
  const settings = await getTwilioSettingsForServer();
  const normalizedTo = normalizePhone(to);
  if (!settings.accountSid || !settings.authToken) {
    return { ok: false, error: "Twilio Account SID and Auth Token are not configured." };
  }
  if (!settings.messagingServiceSid && !settings.phoneNumber) {
    return { ok: false, error: "Twilio sender is not configured. Add a phone number or Messaging Service SID." };
  }
  if (!normalizedTo) return { ok: false, error: "Recipient phone number is required." };
  if (!body.trim()) return { ok: false, error: "Message body is required." };

  const params = new URLSearchParams();
  params.set("To", normalizedTo);
  params.set("Body", body.trim());
  if (settings.messagingServiceSid) {
    params.set("MessagingServiceSid", settings.messagingServiceSid);
  } else {
    params.set("From", settings.phoneNumber);
  }

  const auth = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );
  const data = (await response.json().catch(() => null)) as
    | {
        sid?: string;
        status?: string;
        from?: string;
        to?: string;
        num_segments?: string;
        price?: string | null;
        price_unit?: string | null;
        message?: string;
      }
    | null;

  if (!response.ok || !data?.sid) {
    return {
      ok: false,
      status: response.status,
      error: data?.message ?? "Twilio could not send the message.",
    };
  }

  return {
    ok: true,
    sid: data.sid,
    status: data.status ?? "queued",
    from: data.from ?? settings.phoneNumber,
    to: data.to ?? normalizedTo,
    segments: data.num_segments ? Number.parseInt(data.num_segments, 10) : undefined,
    price: data.price,
    priceUnit: data.price_unit,
  };
}
