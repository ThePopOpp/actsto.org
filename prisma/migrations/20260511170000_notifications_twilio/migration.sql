ALTER TABLE "sms_logs"
  ADD COLUMN IF NOT EXISTS "direction" text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS "from_phone" text,
  ADD COLUMN IF NOT EXISTS "error_message" text,
  ADD COLUMN IF NOT EXISTS "segments" integer,
  ADD COLUMN IF NOT EXISTS "price" numeric(10, 4),
  ADD COLUMN IF NOT EXISTS "price_unit" text,
  ADD COLUMN IF NOT EXISTS "sent_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;

CREATE INDEX IF NOT EXISTS "sms_logs_created_at_idx" ON "sms_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "sms_logs_provider_message_id_idx" ON "sms_logs" ("provider_message_id");

CREATE TABLE IF NOT EXISTS "sms_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "category" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "sms_templates_active_idx" ON "sms_templates" ("active");

INSERT INTO "sms_templates" ("title", "message", "category", "created_by")
VALUES
  ('Campaign milestone thank-you', 'Hi {{first_name}}, thank you for supporting {{campaign_title}}. Your generosity is helping students access Christian education through ACT.', 'donor', 'system'),
  ('Tax credit reminder', 'ACT reminder: Arizona tax-credit gifts can redirect your state tax dollars to Christian education. Questions? Reply here or visit actsto.org.', 'tax_credit', 'system'),
  ('Parent campaign launch', 'Your ACT campaign is ready: {{campaign_url}}. Share it with family and friends when you are ready.', 'parent', 'system')
ON CONFLICT DO NOTHING;
