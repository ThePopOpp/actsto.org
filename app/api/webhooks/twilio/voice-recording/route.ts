import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { twilioSignatureUrls, validateTwilioSignature } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";

/** Twilio recording status callback — attaches the recording to its call_logs row. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const valid = await validateTwilioSignature({
    url: twilioSignatureUrls(request.url),
    params: form,
    signature: request.headers.get("x-twilio-signature"),
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const callSid = String(form.get("CallSid") ?? "");
  const recordingSid = String(form.get("RecordingSid") ?? "");
  const recordingUrl = String(form.get("RecordingUrl") ?? "");
  const durationRaw = String(form.get("RecordingDuration") ?? "");
  const duration = durationRaw ? Number.parseInt(durationRaw, 10) : null;

  if (callSid && recordingSid) {
    await prisma.callLog
      .updateMany({
        where: { providerCallId: callSid },
        data: {
          recordingSid,
          recordingUrl: recordingUrl || undefined,
          recordingDurationSeconds: Number.isFinite(duration) ? duration : undefined,
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
