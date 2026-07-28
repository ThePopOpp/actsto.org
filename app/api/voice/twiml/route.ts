import twilio from "twilio";

import { prisma } from "@/lib/prisma";
import { resolveSmsContact } from "@/lib/sms/contact-matching";
import { normalizePhone, twilioSignatureUrls, validateTwilioSignature } from "@/lib/sms/twilio";
import { getVoiceServerConfig, VOICE_IDENTITY } from "@/lib/voice/config";

export const dynamic = "force-dynamic";

function origin(request: Request): string {
  const fromEnv = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function xml(body: string) {
  return new Response(body, { headers: { "Content-Type": "text/xml" } });
}

/** Log a call leg once per Twilio CallSid. */
async function logCall(data: {
  callSid: string;
  direction: "inbound" | "outbound";
  fromPhone: string | null;
  toPhone: string;
  callerId: string | null;
  contactPhone: string;
}) {
  if (!data.callSid) return;
  const existing = await prisma.callLog.findFirst({ where: { providerCallId: data.callSid }, select: { id: true } });
  if (existing) return;
  const contact = await resolveSmsContact(data.contactPhone);
  await prisma.callLog
    .create({
      data: {
        userId: contact.userId,
        profileId: contact.profileId,
        roleType: contact.roleType,
        campaignId: contact.campaignId,
        contactName: contact.contactName,
        contactEmail: contact.contactEmail,
        contactSource: contact.contactSource,
        matchedPhone: contact.matchedPhone,
        direction: data.direction,
        callerId: data.callerId,
        fromPhone: data.fromPhone,
        toPhone: data.toPhone,
        provider: "twilio",
        providerCallId: data.callSid,
        status: data.direction === "inbound" ? "ringing" : "in-progress",
        startedAt: new Date(),
      },
    })
    .catch(() => null);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return xml("<Response><Reject/></Response>");

  const valid = await validateTwilioSignature({
    url: twilioSignatureUrls(request.url),
    params: form,
    signature: request.headers.get("x-twilio-signature"),
  });
  if (!valid) return xml("<Response><Reject/></Response>");

  const config = await getVoiceServerConfig();
  const base = origin(request);
  const from = String(form.get("From") ?? "");
  const to = String(form.get("To") ?? "");
  const callSid = String(form.get("CallSid") ?? "");
  const paramCallerId = normalizePhone(String(form.get("CallerId") ?? ""));

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  const recordingCallback = base ? `${base}/api/webhooks/twilio/voice-recording` : undefined;

  const outbound = from.startsWith("client:");
  if (outbound) {
    // Browser softphone dialing out to a PSTN number.
    const target = normalizePhone(to);
    const callerId = paramCallerId || config.callerIds[0] || config.phoneNumber;
    if (!target) {
      response.say("Sorry, that number is invalid.");
      return xml(response.toString());
    }
    const dial = response.dial({
      callerId,
      answerOnBridge: true,
      record: "record-from-answer-dual",
      ...(recordingCallback
        ? { recordingStatusCallback: recordingCallback, recordingStatusCallbackEvent: ["completed"] }
        : {}),
    });
    dial.number(target);
    await logCall({ callSid, direction: "outbound", fromPhone: callerId, toPhone: target, callerId, contactPhone: target });
    return xml(response.toString());
  }

  // Inbound PSTN caller — ring the registered browser client, fall back to voicemail.
  const caller = normalizePhone(from);
  const calledNumber = normalizePhone(to);
  const actionUrl = base ? `${base}/api/voice/twiml/voicemail` : undefined;
  const dial = response.dial({
    answerOnBridge: true,
    timeout: 20,
    record: "record-from-answer-dual",
    ...(actionUrl ? { action: actionUrl } : {}),
    ...(recordingCallback
      ? { recordingStatusCallback: recordingCallback, recordingStatusCallbackEvent: ["completed"] }
      : {}),
  });
  dial.client(VOICE_IDENTITY);
  await logCall({
    callSid,
    direction: "inbound",
    fromPhone: caller || from,
    toPhone: calledNumber || to,
    callerId: calledNumber || null,
    contactPhone: caller || from,
  });
  return xml(response.toString());
}
