import {
  normalizePaypalPayload,
  normalizeTwilioPayload,
  type PaypalSettingsPayload,
  type TwilioSettingsPayload,
} from "@/lib/admin/integration-settings";
import { prisma } from "@/lib/prisma";

function envValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Server-only: PayPal settings persisted by Super Admin (empty defaults if unset). */
export async function getPaypalSettingsForServer(): Promise<PaypalSettingsPayload> {
  const row = await prisma.adminIntegrationSettings
    .findUnique({ where: { key: "paypal" } })
    .catch(() => null);
  const stored = normalizePaypalPayload(row?.payload ?? undefined);

  const sandboxClientId =
    envValue("PAYPAL_SANDBOX_CLIENT_ID") || envValue("PAYPAL_CLIENT_ID");
  const sandboxSecret =
    envValue("PAYPAL_SANDBOX_CLIENT_SECRET") || envValue("PAYPAL_CLIENT_SECRET");
  const liveClientId =
    envValue("PAYPAL_LIVE_CLIENT_ID") || envValue("PAYPAL_CLIENT_ID");
  const liveSecret =
    envValue("PAYPAL_LIVE_CLIENT_SECRET") || envValue("PAYPAL_CLIENT_SECRET");

  return {
    sandboxClientId: sandboxClientId || stored.sandboxClientId,
    sandboxSecret: sandboxSecret || stored.sandboxSecret,
    liveClientId: liveClientId || stored.liveClientId,
    liveSecret: liveSecret || stored.liveSecret,
    webhookId: envValue("PAYPAL_WEBHOOK_ID") || stored.webhookId,
  };
}

/** Server-only: Twilio settings persisted by Super Admin (empty defaults if unset). */
export async function getTwilioSettingsForServer(): Promise<TwilioSettingsPayload> {
  const row = await prisma.adminIntegrationSettings
    .findUnique({ where: { key: "twilio" } })
    .catch(() => null);
  const stored = normalizeTwilioPayload(row?.payload ?? undefined);
  return {
    accountSid: envValue("TWILIO_ACCOUNT_SID") || stored.accountSid,
    authToken: envValue("TWILIO_AUTH_TOKEN") || stored.authToken,
    phoneNumber: envValue("TWILIO_PHONE_NUMBER") || stored.phoneNumber,
    messagingServiceSid: envValue("TWILIO_MESSAGING_SERVICE_SID") || stored.messagingServiceSid,
  };
}
