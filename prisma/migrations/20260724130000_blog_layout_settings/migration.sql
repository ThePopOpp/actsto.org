-- Per-post public reading layout controls.
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "content_width" TEXT;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "content_surface" TEXT;
