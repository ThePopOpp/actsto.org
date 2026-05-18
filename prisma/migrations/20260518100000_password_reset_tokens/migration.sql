CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx"
  ON "password_reset_tokens" ("email");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx"
  ON "password_reset_tokens" ("expires_at");

ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;

