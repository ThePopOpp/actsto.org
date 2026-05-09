ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "student_user_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_student_user_id_fkey'
  ) THEN
    ALTER TABLE "students"
      ADD CONSTRAINT "students_student_user_id_fkey"
      FOREIGN KEY ("student_user_id")
      REFERENCES "profiles"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_students_student_user"
  ON "students" ("student_user_id")
  WHERE "student_user_id" IS NOT NULL;
