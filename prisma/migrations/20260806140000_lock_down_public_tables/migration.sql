-- Close direct anon/authenticated access to server-only tables.
--
-- Supabase grants anon and authenticated full DML on public tables by default,
-- and RLS was never enabled on these. The anon key ships in the browser bundle
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY), so anyone could read *and delete* CRM
-- contacts, call logs, and SMS consent records straight from a console.
--
-- Every one of these tables is reached exclusively through Prisma on the direct
-- Postgres connection, which is the table owner and therefore bypasses RLS. The
-- only browser use of the Supabase client is a realtime subscription on
-- `direct_messages`, which has its own policies and is untouched here.
--
-- RLS on with zero policies denies everything for non-privileged roles, which
-- is the correct posture for tables no client should ever reach directly.

DO $$
DECLARE
  t text;
  locked text[] := ARRAY[
    -- CRM and consent — the sensitive ones
    'contacts',
    'contact_consents',
    'consent_events',
    'sms_consent_records',
    'call_logs',
    -- Marketing and automation
    'social_posts',
    'automations',
    'automation_steps',
    'automation_jobs',
    -- Business cards
    'business_cards',
    'business_card_links',
    'business_card_sections',
    'business_card_events',
    'business_card_leads',
    -- Plan builder
    'plans',
    'plan_groups',
    'plan_labels',
    'plan_members',
    'plan_tasks',
    'plan_task_assignees',
    'plan_task_labels',
    'plan_task_checklist_items'
  ];
BEGIN
  FOREACH t IN ARRAY locked LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Belt and braces: drop the blanket grants as well, so the posture does
      -- not depend on RLS alone.
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- `application_chains` was created without an explicit security mode, so it runs
-- with the creator's permissions rather than the caller's — meaning it could
-- expose application rows past whatever policies the caller is subject to.
-- Nothing queries it through PostgREST today, but a view that ignores RLS is a
-- trap left lying around for whoever adds the first caller.
ALTER VIEW public.application_chains SET (security_invoker = true);
