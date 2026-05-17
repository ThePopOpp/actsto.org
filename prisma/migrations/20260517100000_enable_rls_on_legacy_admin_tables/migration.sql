-- Enable RLS on legacy/admin tables flagged by Supabase Advisor.
-- Some early Prisma migrations created PascalCase tables; later Supabase
-- migrations created snake_case replacements. This migration handles both.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    '_prisma_migrations',
    'User',
    'AuditLog',
    'LegalDocument',
    'AdminIntegrationSettings',
    'AdminCampaignDirectory',
    'admin_users',
    'audit_logs',
    'legal_documents',
    'admin_integration_settings',
    'admin_campaign_directory',
    'site_cta_blocks',
    'site_content_settings',
    'saved_campaigns',
    'sms_templates'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

-- Public content/config tables are safe to read publicly; only admins may write.
DO $$
DECLARE
  table_name text;
  select_policy text;
  write_policy text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'LegalDocument',
    'legal_documents',
    'site_cta_blocks',
    'site_content_settings',
    'tax_credit_limits'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      select_policy := lower(regexp_replace(table_name, '[^a-zA-Z0-9]+', '_', 'g')) || '_public_select';
      write_policy := lower(regexp_replace(table_name, '[^a-zA-Z0-9]+', '_', 'g')) || '_admin_write';

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name AND policyname = select_policy
      ) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', select_policy, table_name);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name AND policyname = write_policy
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
          write_policy,
          table_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Admin/config/audit tables should not be readable by anonymous users.
DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User',
    'AuditLog',
    'AdminIntegrationSettings',
    'AdminCampaignDirectory',
    'admin_users',
    'audit_logs',
    'admin_integration_settings',
    'admin_campaign_directory',
    'sms_templates'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      policy_name := lower(regexp_replace(table_name, '[^a-zA-Z0-9]+', '_', 'g')) || '_admin_only';

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
          policy_name,
          table_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Saved campaigns are private to the signed-in user who saved them.
DO $$
BEGIN
  IF to_regclass('public.saved_campaigns') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'saved_campaigns' AND policyname = 'saved_campaigns_own_or_admin'
    ) THEN
      CREATE POLICY "saved_campaigns_own_or_admin"
        ON public.saved_campaigns FOR ALL
        USING (user_id = auth.uid() OR public.is_admin())
        WITH CHECK (user_id = auth.uid() OR public.is_admin());
    END IF;
  END IF;
END $$;
