-- CRM contacts (users and non-users)
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "first_name" TEXT,
  "last_name" TEXT,
  "display_name" TEXT,
  "email" TEXT,
  "email_normalized" TEXT,
  "phone" TEXT,
  "phone_normalized" TEXT,
  "company" TEXT,
  "job_title" TEXT,
  "contact_type" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'new',
  "status" TEXT NOT NULL DEFAULT 'active',
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "source" TEXT,
  "notes" TEXT,
  "avatar_url" TEXT,
  "city" TEXT,
  "state" TEXT,
  "last_contacted_at" TIMESTAMP(3),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "contacts_status_idx" ON "contacts" ("status");
CREATE INDEX IF NOT EXISTS "contacts_stage_idx" ON "contacts" ("stage");
CREATE INDEX IF NOT EXISTS "contacts_email_normalized_idx" ON "contacts" ("email_normalized");
CREATE INDEX IF NOT EXISTS "contacts_phone_normalized_idx" ON "contacts" ("phone_normalized");
CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts" ("user_id");
