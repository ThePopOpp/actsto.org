import "server-only";

import { getTwilioSettingsForServer } from "@/lib/admin/integration-settings-server";
import { normalizePhone } from "@/lib/sms/twilio";

export type BridgeCallResult =
  | { ok: true; sid: string; status: string; from: string; to: string }
  | { ok: false; error: string; status?: number };

/**
 * Click-to-call bridge: Twilio first dials the agent's own phone, and when they
 * answer, connects them to the contact. Uses inline TwiML so no public TwiML
 * app is required — only a voice-capable Twilio phone number (the SMS Messaging
 * Service SID cannot place voice calls).
 */
export async function initiateBridgeCall({
  agentPhone,
  toPhone,
  statusCallbackUrl,
}: {
  agentPhone: string;
  toPhone: string;
  statusCallbackUrl?: string;
}): Promise<BridgeCallResult> {
  const settings = await getTwilioSettingsForServer();
  const agent = normalizePhone(agentPhone);
  const contact = normalizePhone(toPhone);

  if (!settings.accountSid || !settings.authToken) {
    return { ok: false, error: "Twilio Account SID and Auth Token are not configured." };
  }
  if (!settings.phoneNumber) {
    return {
      ok: false,
      error: "A voice-capable Twilio phone number is required for the dialer (a Messaging Service SID cannot place calls).",
    };
  }
  if (!agent) return { ok: false, error: "Your call-back number is required." };
  if (!contact) return { ok: false, error: "A valid number to call is required." };

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Connecting your A C T S T O call. Please hold.</Say><Dial callerId="${settings.phoneNumber}">${contact}</Dial></Response>`;

  const params = new URLSearchParams();
  params.set("To", agent);
  params.set("From", settings.phoneNumber);
  params.set("Twiml", twiml);
  if (statusCallbackUrl) {
    params.set("StatusCallback", statusCallbackUrl);
    for (const event of ["initiated", "ringing", "answered", "completed"]) {
      params.append("StatusCallbackEvent", event);
    }
    params.set("StatusCallbackMethod", "POST");
  }

  const auth = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Calls.json`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    },
  );
  const data = (await response.json().catch(() => null)) as
    | { sid?: string; status?: string; from?: string; to?: string; message?: string }
    | null;

  if (!response.ok || !data?.sid) {
    return { ok: false, status: response.status, error: data?.message ?? "Twilio could not place the call." };
  }
  return {
    ok: true,
    sid: data.sid,
    status: data.status ?? "queued",
    from: data.from ?? settings.phoneNumber,
    to: data.to ?? agent,
  };
}
