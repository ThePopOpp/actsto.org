import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveSmsContact } from "@/lib/sms/contact-matching";
import { normalizePhone, validateTwilioSignature } from "@/lib/sms/twilio";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const valid = await validateTwilioSignature({
    url: request.url,
    params: form,
    signature: request.headers.get("x-twilio-signature"),
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const sid = String(form.get("MessageSid") ?? form.get("SmsSid") ?? "");
  const status = String(form.get("MessageStatus") ?? form.get("SmsStatus") ?? "");
  const from = normalizePhone(String(form.get("From") ?? ""));
  const to = normalizePhone(String(form.get("To") ?? ""));
  const body = String(form.get("Body") ?? "");
  const errorMessage = String(form.get("ErrorMessage") ?? "");

  if (body && from) {
    const contact = await resolveSmsContact(from);
    await prisma.smsLog.create({
      data: {
        userId: contact.userId,
        profileId: contact.profileId,
        roleType: contact.roleType,
        campaignId: contact.campaignId,
        contactName: contact.contactName,
        contactEmail: contact.contactEmail,
        contactSource: contact.contactSource,
        matchedPhone: contact.matchedPhone,
        direction: "inbound",
        fromPhone: from,
        toPhone: to || "ACT",
        message: body,
        provider: "twilio",
        providerMessageId: sid || null,
        status: status || "received",
      },
    });
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (sid) {
    await prisma.smsLog.updateMany({
      where: { providerMessageId: sid },
      data: {
        status: status || undefined,
        errorMessage: errorMessage || undefined,
        deliveredAt: status === "delivered" ? new Date() : undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
