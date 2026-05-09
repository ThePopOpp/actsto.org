-- Parent-issued invites are the source of truth for linking a 16+ student
-- login to an existing parent-created student row.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_invite_email text,
  ADD COLUMN IF NOT EXISTS student_invite_token text,
  ADD COLUMN IF NOT EXISTS student_invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS student_invite_accepted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_invite_token
  ON public.students (student_invite_token)
  WHERE student_invite_token IS NOT NULL;
