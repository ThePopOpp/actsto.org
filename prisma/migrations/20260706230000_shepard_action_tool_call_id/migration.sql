ALTER TABLE "shepard_actions" ADD COLUMN IF NOT EXISTS "tool_call_id" text NOT NULL DEFAULT '';
ALTER TABLE "shepard_actions" ALTER COLUMN "tool_call_id" DROP DEFAULT;
