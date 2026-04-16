import {
  normalizePaypalPayload,
  normalizeTwilioPayload,
  type PaypalSettingsPayload,
  type TwilioSettingsPayload,
} from "@/lib/admin/integration-settings";
import { prisma } from "@/lib/prisma";

/** Server-only: PayPal settings persisted by Super Admin (empty defaults if unset). */
export async function getPaypalSettingsForServer(): Promise<PaypalSettingsPayload> {
  const row = await prisma.adminIntegrationSettings.findUnique({ where: { key: "paypal" } });
  return normalizePaypalPayload(row?.payload ?? undefined);
}

/** Server-only: Twilio settings persisted by Super Admin (empty defaults if unset). */
export async function getTwilioSettingsForServer(): Promise<TwilioSettingsPayload> {
  const row = await prisma.adminIntegrationSettings.findUnique({ where: { key: "twilio" } });
  return normalizeTwilioPayload(row?.payload ?? undefined);
}
