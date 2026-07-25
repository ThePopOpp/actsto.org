import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { resolveSmsContact } from "@/lib/sms/contact-matching";
import { normalizePhone } from "@/lib/sms/twilio";
import { initiateBridgeCall } from "@/lib/voice/twilio-voice";

function appOrigin(request: Request): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { to?: string; agentPhone?: string; notes?: string }
    | null;
  const to = normalizePhone(body?.to ?? "");
  const agentPhone = normalizePhone(body?.agentPhone ?? "");
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) : null;

  if (!to) return NextResponse.json({ error: "A number to call is required." }, { status: 400 });
  if (!agentPhone) return NextResponse.json({ error: "Your call-back number is required." }, { status: 400 });

  const origin = appOrigin(request);
  const statusCallbackUrl = origin ? `${origin}/api/webhooks/twilio/voice-status` : undefined;

  const contact = await resolveSmsContact(to);
  const result = await initiateBridgeCall({ agentPhone, toPhone: to, statusCallbackUrl });

  const log = await prisma.callLog.create({
    data: {
      userId: contact.userId,
      profileId: contact.profileId,
      roleType: contact.roleType,
      campaignId: contact.campaignId,
      contactName: contact.contactName,
      contactEmail: contact.contactEmail,
      contactSource: contact.contactSource,
      matchedPhone: contact.matchedPhone,
      direction: "outbound",
      agentPhone,
      fromPhone: result.ok ? result.from : null,
      toPhone: to,
      provider: "twilio",
      providerCallId: result.ok ? result.sid : null,
      status: result.ok ? result.status : "failed",
      errorMessage: result.ok ? null : result.error,
      initiatedByEmail: auth.email,
      notes,
      startedAt: result.ok ? new Date() : null,
    },
  });

  return NextResponse.json({
    ok: result.ok,
    error: result.ok ? null : result.error,
    logId: log.id,
    contactName: contact.contactName,
  });
}
