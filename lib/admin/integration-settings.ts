export const INTEGRATION_KEYS = ["paypal", "twilio"] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export function isIntegrationKey(value: string): value is IntegrationKey {
  return INTEGRATION_KEYS.includes(value as IntegrationKey);
}

export type PaypalSettingsPayload = {
  sandboxClientId: string;
  sandboxSecret: string;
  liveClientId: string;
  liveSecret: string;
  webhookId: string;
};

export type TwilioSettingsPayload = {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
};

export const DEFAULT_PAYPAL_PAYLOAD: PaypalSettingsPayload = {
  sandboxClientId: "",
  sandboxSecret: "",
  liveClientId: "",
  liveSecret: "",
  webhookId: "",
};

export const DEFAULT_TWILIO_PAYLOAD: TwilioSettingsPayload = {
  accountSid: "",
  authToken: "",
  messagingServiceSid: "",
};

const MAX_FIELD_BYTES = 8192;

function trimField(v: string): string {
  return v.slice(0, MAX_FIELD_BYTES);
}

function optionalString(v: unknown): string {
  if (typeof v !== "string") return "";
  return trimField(v);
}

export function parsePaypalPayload(raw: unknown): PaypalSettingsPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    sandboxClientId: optionalString(o.sandboxClientId),
    sandboxSecret: optionalString(o.sandboxSecret),
    liveClientId: optionalString(o.liveClientId),
    liveSecret: optionalString(o.liveSecret),
    webhookId: optionalString(o.webhookId),
  };
}

export function parseTwilioPayload(raw: unknown): TwilioSettingsPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    accountSid: optionalString(o.accountSid),
    authToken: optionalString(o.authToken),
    messagingServiceSid: optionalString(o.messagingServiceSid),
  };
}

export function normalizePaypalPayload(raw: unknown): PaypalSettingsPayload {
  return parsePaypalPayload(raw) ?? { ...DEFAULT_PAYPAL_PAYLOAD };
}

export function normalizeTwilioPayload(raw: unknown): TwilioSettingsPayload {
  return parseTwilioPayload(raw) ?? { ...DEFAULT_TWILIO_PAYLOAD };
}
