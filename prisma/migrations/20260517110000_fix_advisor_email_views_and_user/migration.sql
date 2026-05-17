-- Follow-up Supabase Advisor fixes:
-- - RLS on email inbox tables
-- - Security invoker mode on summary views
-- - Explicitly revoke public access to the legacy PascalCase User table

DO $$
BEGIN
  IF to_regclass('public.email_threads') IS NOT NULL THEN
    ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'email_threads' AND policyname = 'email_threads_admin_only'
    ) THEN
      CREATE POLICY "email_threads_admin_only"
        ON public.email_threads FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;

  IF to_regclass('public.email_messages') IS NOT NULL THEN
    ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'email_messages' AND policyname = 'email_messages_admin_only'
    ) THEN
      CREATE POLICY "email_messages_admin_only"
        ON public.email_messages FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL THEN
    REVOKE ALL ON TABLE public."User" FROM anon, authenticated;
    ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'user_admin_only'
    ) THEN
      CREATE POLICY "user_admin_only"
        ON public."User" FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'campaign_summary_view',
    'donor_summary_view',
    'student_funding_summary_view',
    'admin_dashboard_summary_view'
  ]
  LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
    END IF;
  END LOOP;
END $$;

-- These views should be readable only through their intended roles.
DO $$
BEGIN
  IF to_regclass('public.donor_summary_view') IS NOT NULL THEN
    REVOKE ALL ON public.donor_summary_view FROM anon;
  END IF;
  IF to_regclass('public.student_funding_summary_view') IS NOT NULL THEN
    REVOKE ALL ON public.student_funding_summary_view FROM anon;
  END IF;
  IF to_regclass('public.admin_dashboard_summary_view') IS NOT NULL THEN
    REVOKE ALL ON public.admin_dashboard_summary_view FROM anon;
  END IF;
END $$;
