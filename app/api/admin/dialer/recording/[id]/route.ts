import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getTwilioSettingsForServer } from "@/lib/admin/integration-settings-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Streams a Twilio call recording through the server (Twilio media needs Basic auth). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const call = await prisma.callLog.findUnique({ where: { id }, select: { recordingUrl: true } });
  if (!call?.recordingUrl) return NextResponse.json({ error: "No recording." }, { status: 404 });

  const settings = await getTwilioSettingsForServer();
  if (!settings.accountSid || !settings.authToken) {
    return NextResponse.json({ error: "Twilio not configured." }, { status: 400 });
  }

  const mediaUrl = call.recordingUrl.endsWith(".mp3") ? call.recordingUrl : `${call.recordingUrl}.mp3`;
  const credentials = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64");
  const upstream = await fetch(mediaUrl, { headers: { Authorization: `Basic ${credentials}` } });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Recording unavailable." }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
