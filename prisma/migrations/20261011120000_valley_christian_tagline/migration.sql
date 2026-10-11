-- Data correction from the Oct 6 / Oct 11 site review: the Valley Christian
-- school-level campaign's tagline read "Scholarships for student at Valley
-- Christian". It raises money for every student there.
--
-- Matches the exact phrase only, so a tagline staff have since rewritten is
-- left alone, and re-running is a no-op.
UPDATE "campaigns"
SET "tagline" = regexp_replace("tagline", '(?i)scholarships for student at', 'Scholarships for students at')
WHERE "tagline" ~* 'scholarships for student at';
