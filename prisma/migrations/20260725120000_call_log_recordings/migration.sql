-- Browser Voice SDK: caller ID, recordings, and voicemail on call_logs
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "caller_id" TEXT;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "recording_url" TEXT;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "recording_sid" TEXT;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "recording_duration_seconds" INTEGER;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "is_voicemail" BOOLEAN NOT NULL DEFAULT false;
