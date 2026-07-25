import twilio from "twilio";

import { prisma } from "@/lib/prisma";
import { validateTwilioSignature } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";

function origin(request: Request): string {
  const fromEnv = process.env.APP_URL?.trim();
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

/** Runs after an inbound <Dial> to the browser client finishes. If nobody
 *  answered, prompt the caller and record a voicemail. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return xml("<Response><Hangup/></Response>");

  const valid = await validateTwilioSignature({
    url: request.url,
    params: form,
    signature: request.headers.get("x-twilio-signature"),
  });
  if (!valid) return xml("<Response><Hangup/></Response>");

  const dialStatus = String(form.get("DialCallStatus") ?? "");
  const callSid = String(form.get("CallSid") ?? "");
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  if (dialStatus === "completed" || dialStatus === "answered") {
    response.hangup();
    return xml(response.toString());
  }

  if (callSid) {
    await prisma.callLog
      .updateMany({ where: { providerCallId: callSid }, data: { isVoicemail: true, status: "voicemail" } })
      .catch(() => null);
  }

  const base = origin(request);
  response.say(
    { voice: "alice" },
    "Thank you for calling A C T S T O. We're unable to take your call right now. Please leave a message after the tone.",
  );
  response.record({
    maxLength: 120,
    playBeep: true,
    ...(base
      ? {
          recordingStatusCallback: `${base}/api/webhooks/twilio/voice-recording`,
          recordingStatusCallbackEvent: ["completed"],
        }
      : {}),
  });
  response.hangup();
  return xml(response.toString());
}
