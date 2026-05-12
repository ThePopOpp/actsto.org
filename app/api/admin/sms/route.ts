import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { getTwilioRuntimeStatus, parsePhoneList, sendTwilioSms } from "@/lib/sms/twilio";

const MAX_BULK_RECIPIENTS = 50;

function cleanMessage(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1600) : "";
}

function dollars(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [runtime, logs] = await Promise.all([
    getTwilioRuntimeStatus(),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ]);

  return NextResponse.json({
    runtime,
    logs: logs.map((log) => ({
      id: log.id,
      direction: log.direction,
      fromPhone: log.fromPhone,
      toPhone: log.toPhone,
      message: log.message,
      status: log.status,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
      sentAt: log.sentAt?.toISOString() ?? null,
      deliveredAt: log.deliveredAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    to?: string;
    contacts?: string;
    message?: string;
    bulk?: boolean;
  } | null;
  const message = cleanMessage(body?.message);
  const recipients = body?.bulk ? parsePhoneList(body?.contacts ?? "") : parsePhoneList(body?.to ?? "");

  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (!recipients.length) return NextResponse.json({ error: "At least one recipient is required." }, { status: 400 });
  if (recipients.length > MAX_BULK_RECIPIENTS) {
    return NextResponse.json({ error: `Bulk SMS is limited to ${MAX_BULK_RECIPIENTS} recipients per send.` }, { status: 400 });
  }

  const results = [];
  for (const to of recipients) {
    const result = await sendTwilioSms({ to, body: message });
    const log = await prisma.smsLog.create({
      data: {
        direction: "outbound",
        fromPhone: result.ok ? result.from : null,
        toPhone: to,
        message,
        provider: "twilio",
        providerMessageId: result.ok ? result.sid : null,
        status: result.ok ? result.status : "failed",
        errorMessage: result.ok ? null : result.error,
        segments: result.ok ? result.segments : null,
        price: result.ok ? dollars(result.price) : null,
        priceUnit: result.ok ? result.priceUnit : null,
        sentAt: result.ok ? new Date() : null,
      },
    });
    results.push({ to, ok: result.ok, error: result.ok ? null : result.error, logId: log.id });
  }

  const sent = results.filter((result) => result.ok).length;
  return NextResponse.json({ ok: sent > 0, sent, failed: results.length - sent, results });
}
