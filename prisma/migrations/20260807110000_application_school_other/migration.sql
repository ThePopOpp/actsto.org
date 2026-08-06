-- "Other" on the school picker: a family whose school isn't in our list types
-- the name instead of being unable to continue. Staff reconcile it against the
-- schools table during review.

ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "school_name_other" TEXT;
