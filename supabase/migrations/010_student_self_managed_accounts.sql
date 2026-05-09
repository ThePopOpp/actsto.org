-- Link 16+ self-managed student users to their student profile row without
-- breaking the existing parent-owned student model.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_user
  ON public.students (student_user_id)
  WHERE student_user_id IS NOT NULL;

DROP POLICY IF EXISTS "students_select_own_or_admin" ON public.students;
CREATE POLICY "students_select_own_or_admin"
  ON public.students FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "students_insert_own_or_admin" ON public.students;
CREATE POLICY "students_insert_own_or_admin"
  ON public.students FOR INSERT
  WITH CHECK (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "students_update_own_or_admin" ON public.students;
CREATE POLICY "students_update_own_or_admin"
  ON public.students FOR UPDATE
  USING (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "students_delete_own_or_admin" ON public.students;
CREATE POLICY "students_delete_own_or_admin"
  ON public.students FOR DELETE
  USING (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.is_admin()
  );
