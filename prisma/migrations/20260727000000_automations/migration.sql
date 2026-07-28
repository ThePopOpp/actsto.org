-- Automation engine: rules, steps, and the scheduled job queue
CREATE TABLE IF NOT EXISTS "automations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger_event" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automations_trigger_event_enabled_idx" ON "automations" ("trigger_event", "enabled");

CREATE TABLE IF NOT EXISTS "automation_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "automation_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "email_template_id" UUID,
  "sms_template_id" UUID,
  "subject_override" TEXT,
  "delay_minutes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_steps_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "automation_steps_automation_id_idx" ON "automation_steps" ("automation_id");

CREATE TABLE IF NOT EXISTS "automation_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "automation_id" UUID NOT NULL,
  "step_id" UUID NOT NULL,
  "trigger_event" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "recipient_user_id" UUID,
  "recipient_email" TEXT,
  "recipient_phone" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sent_at" TIMESTAMP(3),
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_jobs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "automation_jobs_status_scheduled_for_idx" ON "automation_jobs" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "automation_jobs_automation_id_idx" ON "automation_jobs" ("automation_id");
