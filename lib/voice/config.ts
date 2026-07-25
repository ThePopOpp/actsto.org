import "server-only";

import { getTwilioSettingsForServer } from "@/lib/admin/integration-settings-server";
import { normalizePhone } from "@/lib/sms/twilio";

/** Shared client identity that Super Admin browsers register under for the softphone. */
export const VOICE_IDENTITY = "actsto_admin";

export type VoiceServerConfig = {
  accountSid: string;
  authToken: string;
  apiKey: string;
  apiSecret: string;
  twimlAppSid: string;
  phoneNumber: string;
  callerIds: string[];
  /** True when outbound browser calling can be authorized (token minting). */
  ready: boolean;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Voice SDK configuration. Account SID / Auth Token / phone number come from the
 * shared Twilio settings; the API Key/Secret and TwiML App SID are voice-only and
 * read from env. TWILIO_CALLER_IDS (comma-separated E.164) lists the numbers the
 * dialer can present as caller ID; it falls back to the single Twilio number.
 */
export async function getVoiceServerConfig(): Promise<VoiceServerConfig> {
  const twilio = await getTwilioSettingsForServer();
  const apiKey = env("TWILIO_API_KEY");
  const apiSecret = env("TWILIO_API_SECRET");
  const twimlAppSid = env("TWILIO_TWIML_APP_SID") || env("TWILIO_VOICE_SDK_APP_SID");

  const configuredCallerIds = env("TWILIO_CALLER_IDS")
    .split(/[\n,;]+/)
    .map((value) => normalizePhone(value))
    .filter(Boolean);
  const callerIds = Array.from(
    new Set([twilio.phoneNumber ? normalizePhone(twilio.phoneNumber) : "", ...configuredCallerIds].filter(Boolean)),
  );

  const ready = Boolean(twilio.accountSid && apiKey && apiSecret && twimlAppSid && callerIds.length);

  return {
    accountSid: twilio.accountSid,
    authToken: twilio.authToken,
    apiKey,
    apiSecret,
    twimlAppSid,
    phoneNumber: twilio.phoneNumber ? normalizePhone(twilio.phoneNumber) : "",
    callerIds,
    ready,
  };
}

/** True when `value` is one of our own Twilio numbers (i.e. an inbound leg, not a dial-out target). */
export function isOwnNumber(value: string, callerIds: string[]): boolean {
  const normalized = normalizePhone(value);
  return Boolean(normalized) && callerIds.includes(normalized);
}
