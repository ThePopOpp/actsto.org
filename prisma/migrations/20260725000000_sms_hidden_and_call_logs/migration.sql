-- SMS thread hide + Dialer call log
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "call_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "profile_id" UUID,
  "role_type" TEXT,
  "campaign_id" UUID,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_source" TEXT,
  "matched_phone" TEXT,
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "agent_phone" TEXT,
  "from_phone" TEXT,
  "to_phone" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'twilio',
  "provider_call_id" TEXT,
  "status" TEXT,
  "error_message" TEXT,
  "duration_seconds" INTEGER,
  "price" DECIMAL(10,4),
  "price_unit" TEXT,
  "initiated_by_email" TEXT,
  "notes" TEXT,
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_logs_created_at_idx" ON "call_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "call_logs_provider_call_id_idx" ON "call_logs" ("provider_call_id");
CREATE INDEX IF NOT EXISTS "call_logs_matched_phone_idx" ON "call_logs" ("matched_phone");
CREATE INDEX IF NOT EXISTS "call_logs_campaign_id_idx" ON "call_logs" ("campaign_id");
