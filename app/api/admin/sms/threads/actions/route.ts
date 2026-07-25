import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

/** Hide or delete an entire SMS conversation (all rows whose counterparty matches the phone). */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { phone?: string; action?: string } | null;
  const phone = normalizePhone(body?.phone ?? "");
  const action = body?.action;
  if (!phone) return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
  if (action !== "hide" && action !== "delete") {
    return NextResponse.json({ error: "action must be 'hide' or 'delete'." }, { status: 400 });
  }

  const where = { OR: [{ toPhone: phone }, { fromPhone: phone }, { matchedPhone: phone }] };
  if (action === "delete") {
    const { count } = await prisma.smsLog.deleteMany({ where });
    return NextResponse.json({ ok: true, count });
  }
  const { count } = await prisma.smsLog.updateMany({ where, data: { hidden: true } });
  return NextResponse.json({ ok: true, count });
}
