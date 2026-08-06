-- The profile editor has collected a short bio and a timezone since it was
-- built, but neither column existed, so the API dropped both on save and the
-- fields came back empty. The form reported "Profile saved." because the fields
-- it *did* handle saved fine.

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
