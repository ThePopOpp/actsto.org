-- Track when a scheduled social post's "time to post" reminder was sent
ALTER TABLE "social_posts" ADD COLUMN IF NOT EXISTS "notified_at" TIMESTAMP(3);
