-- Manual open/closed override for application windows, on top of the dates.
--
-- Three states rather than a boolean: "forced closed" and "following the
-- schedule" are different intentions, and a boolean cannot tell them apart.

DO $$ BEGIN
  CREATE TYPE "window_override" AS ENUM ('auto', 'open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "application_windows"
  ADD COLUMN IF NOT EXISTS "manual_override" "window_override" NOT NULL DEFAULT 'auto';
ALTER TABLE "application_windows" ADD COLUMN IF NOT EXISTS "override_note" TEXT;
ALTER TABLE "application_windows" ADD COLUMN IF NOT EXISTS "override_by" UUID;
ALTER TABLE "application_windows" ADD COLUMN IF NOT EXISTS "override_at" TIMESTAMPTZ;
