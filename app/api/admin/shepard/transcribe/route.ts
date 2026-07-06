import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getOpenAIClient } from "@/lib/shepard/client";

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "An audio file is required." }, { status: 400 });
  }

  const client = getOpenAIClient();
  const file = new File([audio], "shepard-voice-note.webm", { type: audio.type || "audio/webm" });

  try {
    const transcription = await client.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed." },
      { status: 500 }
    );
  }
}
