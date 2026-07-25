-- Unified consent audit (consent_events) + current state (contact_consents).

CREATE TABLE IF NOT EXISTS "consent_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "channel" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'all',
  "status" TEXT NOT NULL,
  "previous_status" TEXT,
  "contact_name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "phone_normalized" TEXT,
  "user_id" UUID,
  "disclosure_version" TEXT NOT NULL,
  "consent_text" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "source_url" TEXT,
  "referrer" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "staff_actor_email" TEXT,
  "provider_ref" TEXT,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "consent_events_channel_created_at_idx" ON "consent_events" ("channel", "created_at");
CREATE INDEX IF NOT EXISTS "consent_events_email_idx" ON "consent_events" ("email");
CREATE INDEX IF NOT EXISTS "consent_events_phone_normalized_idx" ON "consent_events" ("phone_normalized");
CREATE INDEX IF NOT EXISTS "consent_events_user_id_idx" ON "consent_events" ("user_id");

CREATE TABLE IF NOT EXISTS "contact_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "channel" TEXT NOT NULL,
  "contact_key" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "phone_normalized" TEXT,
  "user_id" UUID,
  "contact_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'subscribed',
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  "campaign_updates" BOOLEAN NOT NULL DEFAULT true,
  "donation_updates" BOOLEAN NOT NULL DEFAULT true,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "confirm_token" TEXT,
  "confirm_sent_at" TIMESTAMP(3),
  "disclosure_version" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_consents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "contact_consents_channel_contact_key_key" ON "contact_consents" ("channel", "contact_key");
CREATE INDEX IF NOT EXISTS "contact_consents_email_idx" ON "contact_consents" ("email");
CREATE INDEX IF NOT EXISTS "contact_consents_user_id_idx" ON "contact_consents" ("user_id");
