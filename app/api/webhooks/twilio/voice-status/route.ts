import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { twilioSignatureUrls, validateTwilioSignature } from "@/lib/sms/twilio";

/** Twilio voice status callback — updates the matching call_logs row. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const valid = await validateTwilioSignature({
    url: twilioSignatureUrls(request.url),
    params: form,
    signature: request.headers.get("x-twilio-signature"),
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const sid = String(form.get("CallSid") ?? "");
  const status = String(form.get("CallStatus") ?? "");
  const durationRaw = String(form.get("CallDuration") ?? "");
  const duration = durationRaw ? Number.parseInt(durationRaw, 10) : null;
  const ended = ["completed", "busy", "failed", "no-answer", "canceled"].includes(status);

  if (sid) {
    await prisma.callLog.updateMany({
      where: { providerCallId: sid },
      data: {
        status: status || undefined,
        durationSeconds: Number.isFinite(duration) ? duration : undefined,
        endedAt: ended ? new Date() : undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
