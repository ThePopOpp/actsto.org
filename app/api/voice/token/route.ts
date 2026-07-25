import { NextResponse } from "next/server";
import twilio from "twilio";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getVoiceServerConfig, VOICE_IDENTITY } from "@/lib/voice/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const config = await getVoiceServerConfig();
  if (!config.ready) {
    return NextResponse.json(
      {
        error:
          "Voice calling is not configured. Add TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID (plus a voice-capable number).",
        callerIds: config.callerIds,
      },
      { status: 400 },
    );
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(config.accountSid, config.apiKey, config.apiSecret, {
    identity: VOICE_IDENTITY,
    ttl: 3600,
  });
  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: config.twimlAppSid,
      incomingAllow: true,
    }),
  );

  return NextResponse.json({
    token: token.toJwt(),
    identity: VOICE_IDENTITY,
    callerIds: config.callerIds,
    defaultCallerId: config.callerIds[0] ?? "",
  });
}
