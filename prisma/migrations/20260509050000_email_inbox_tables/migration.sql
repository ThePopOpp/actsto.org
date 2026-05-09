CREATE TABLE IF NOT EXISTS "email_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel" text NOT NULL DEFAULT 'email',
  "subject" text,
  "from_name" text,
  "from_email" text,
  "campaign_slug" text,
  "campaign_title" text,
  "unread" boolean NOT NULL DEFAULT true,
  "flagged" boolean NOT NULL DEFAULT false,
  "last_message_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "email_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "email_threads"("id") ON DELETE CASCADE,
  "provider_message_id" text UNIQUE,
  "direction" text NOT NULL DEFAULT 'inbound',
  "from_name" text,
  "from_email" text,
  "to_email" text,
  "subject" text,
  "body_text" text,
  "body_html" text,
  "received_at" timestamptz,
  "sent_at" timestamptz,
  "raw" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_threads_last_message_at"
  ON "email_threads"("last_message_at");

CREATE INDEX IF NOT EXISTS "idx_email_threads_from_email"
  ON "email_threads"("from_email");

CREATE INDEX IF NOT EXISTS "idx_email_messages_thread_id"
  ON "email_messages"("thread_id");

CREATE INDEX IF NOT EXISTS "idx_email_messages_received_at"
  ON "email_messages"("received_at");
