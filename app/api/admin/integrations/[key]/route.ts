import { NextResponse } from "next/server";

import {
  isIntegrationKey,
  normalizePaypalPayload,
  normalizeTwilioPayload,
  parsePaypalPayload,
  parseTwilioPayload,
} from "@/lib/admin/integration-settings";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { key } = await context.params;
  if (!isIntegrationKey(key)) {
    return NextResponse.json({ error: "Unknown integration key." }, { status: 404 });
  }

  const row = await prisma.adminIntegrationSettings.findUnique({ where: { key } });
  if (!row) {
    if (key === "paypal") {
      return NextResponse.json({ payload: normalizePaypalPayload(null), persisted: false });
    }
    return NextResponse.json({ payload: normalizeTwilioPayload(null), persisted: false });
  }

  const payload =
    key === "paypal"
      ? normalizePaypalPayload(row.payload)
      : normalizeTwilioPayload(row.payload);

  return NextResponse.json({ payload, persisted: true });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { key } = await context.params;
  if (!isIntegrationKey(key)) {
    return NextResponse.json({ error: "Unknown integration key." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { payload?: unknown } | null;
  const raw = body?.payload;

  if (key === "paypal") {
    const parsed = parsePaypalPayload(raw);
    if (!parsed) {
      return NextResponse.json(
        { error: "Body must include a payload object with PayPal string fields." },
        { status: 400 },
      );
    }
    await prisma.adminIntegrationSettings.upsert({
      where: { key: "paypal" },
      create: { key: "paypal", payload: parsed },
      update: { payload: parsed },
    });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTwilioPayload(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Body must include a payload object with Twilio string fields." },
      { status: 400 },
    );
  }
  await prisma.adminIntegrationSettings.upsert({
    where: { key: "twilio" },
    create: { key: "twilio", payload: parsed },
    update: { payload: parsed },
  });
  return NextResponse.json({ ok: true });
}
