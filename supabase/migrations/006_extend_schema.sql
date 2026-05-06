-- ACT Next.js — Phase 1 schema extension
-- Extends 005_new_project_schema.sql with all missing tables, columns, RLS, views, and seed data
-- Safe to re-run: uses IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, ON CONFLICT DO NOTHING

-- =============================================================================
-- 1. Extend existing enums
-- =============================================================================

ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TYPE public.donation_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.donation_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.donation_status ADD VALUE IF NOT EXISTS 'partially_refunded';

-- =============================================================================
-- 2. Extend existing tables (add missing columns only — no drops or renames)
-- =============================================================================

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS primary_account_type text,
  ADD COLUMN IF NOT EXISTS active_account_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS short_excerpt text,
  ADD COLUMN IF NOT EXISTS campaign_type text,
  ADD COLUMN IF NOT EXISTS donor_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_image_url text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_type text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- giving_levels
ALTER TABLE public.giving_levels
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS spots_available integer,
  ADD COLUMN IF NOT EXISTS spots_claimed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- campaign_updates
ALTER TABLE public.campaign_updates
  ADD COLUMN IF NOT EXISTS author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- campaign_faqs
ALTER TABLE public.campaign_faqs
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- donations
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS tip_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS donation_type text NOT NULL DEFAULT 'quick',
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'paypal',
  ADD COLUMN IF NOT EXISTS payment_provider_order_id text,
  ADD COLUMN IF NOT EXISTS payment_provider_capture_id text,
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS donor_message text,
  ADD COLUMN IF NOT EXISTS tax_year integer;

-- =============================================================================
-- 3. updated_at triggers for newly-extended tables
--    (wrapped in DO blocks — PostgreSQL <17 lacks CREATE TRIGGER IF NOT EXISTS)
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_giving_levels_updated_at') THEN
    CREATE TRIGGER tr_giving_levels_updated_at
      BEFORE UPDATE ON public.giving_levels
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_campaign_updates_updated_at') THEN
    CREATE TRIGGER tr_campaign_updates_updated_at
      BEFORE UPDATE ON public.campaign_updates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_campaign_faqs_updated_at') THEN
    CREATE TRIGGER tr_campaign_faqs_updated_at
      BEFORE UPDATE ON public.campaign_faqs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- =============================================================================
-- 4. New tables
-- =============================================================================

-- user_roles — extended role model for Hybrid User support
CREATE TABLE IF NOT EXISTS public.user_roles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              text        NOT NULL,
  status            text        NOT NULL DEFAULT 'active',
  completion_percent integer    NOT NULL DEFAULT 0,
  is_complete       boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_user_roles_updated_at') THEN
    CREATE TRIGGER tr_user_roles_updated_at
      BEFORE UPDATE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- account_setup_progress — per-role completion tracking
CREATE TABLE IF NOT EXISTS public.account_setup_progress (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                text        NOT NULL,
  required_fields     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  completed_fields    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  missing_fields      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  completion_percent  integer     NOT NULL DEFAULT 0,
  last_checked_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_account_setup_progress_updated_at') THEN
    CREATE TRIGGER tr_account_setup_progress_updated_at
      BEFORE UPDATE ON public.account_setup_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- parent_guardian_profiles
CREATE TABLE IF NOT EXISTS public.parent_guardian_profiles (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_to_student text,
  address_line_1          text,
  address_line_2          text,
  city                    text,
  state                   text,
  zip                     text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  profile_status          text        NOT NULL DEFAULT 'incomplete',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_parent_guardian_profiles_updated_at') THEN
    CREATE TRIGGER tr_parent_guardian_profiles_updated_at
      BEFORE UPDATE ON public.parent_guardian_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- individual_donor_profiles
CREATE TABLE IF NOT EXISTS public.individual_donor_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_status    text,
  az_resident      boolean,
  default_tax_year integer,
  annual_limit     numeric(14,2),
  profile_status   text        NOT NULL DEFAULT 'incomplete',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_individual_donor_profiles_updated_at') THEN
    CREATE TRIGGER tr_individual_donor_profiles_updated_at
      BEFORE UPDATE ON public.individual_donor_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- business_donor_profiles
CREATE TABLE IF NOT EXISTS public.business_donor_profiles (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name  text,
  business_title text,
  ein            text,
  business_email text,
  business_phone text,
  business_type  text,
  address_line_1 text,
  address_line_2 text,
  city           text,
  state          text,
  zip            text,
  profile_status text        NOT NULL DEFAULT 'incomplete',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_business_donor_profiles_updated_at') THEN
    CREATE TRIGGER tr_business_donor_profiles_updated_at
      BEFORE UPDATE ON public.business_donor_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- student_guardians — links students to guardian profiles
CREATE TABLE IF NOT EXISTS public.student_guardians (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship      text,
  is_primary        boolean     NOT NULL DEFAULT false,
  permission_status text        NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, guardian_user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_student_guardians_updated_at') THEN
    CREATE TRIGGER tr_student_guardians_updated_at
      BEFORE UPDATE ON public.student_guardians
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- school_admins
CREATE TABLE IF NOT EXISTS public.school_admins (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- campaign_students — one campaign may cover multiple students
CREATE TABLE IF NOT EXISTS public.campaign_students (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  student_id       uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  individual_goal  numeric(14,2) NOT NULL DEFAULT 0,
  amount_allocated numeric(14,2) NOT NULL DEFAULT 0,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, student_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_campaign_students_updated_at') THEN
    CREATE TRIGGER tr_campaign_students_updated_at
      BEFORE UPDATE ON public.campaign_students
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- campaign_media — richer media record (supersedes photos)
CREATE TABLE IF NOT EXISTS public.campaign_media (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  media_type   text        NOT NULL DEFAULT 'gallery_image',
  file_url     text,
  storage_path text,
  alt_text     text,
  caption      text,
  sort_order   integer     NOT NULL DEFAULT 0,
  uploaded_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- campaign_backers — public-facing supporter record generated from paid donations
CREATE TABLE IF NOT EXISTS public.campaign_backers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  donation_id     uuid        REFERENCES public.donations(id) ON DELETE SET NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name    text,
  avatar_url      text,
  amount          numeric(14,2),
  message         text,
  is_anonymous    boolean     NOT NULL DEFAULT false,
  show_amount     boolean     NOT NULL DEFAULT false,
  show_message    boolean     NOT NULL DEFAULT true,
  backer_type     text,
  giving_level_id uuid        REFERENCES public.giving_levels(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'pending_review',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_campaign_backers_updated_at') THEN
    CREATE TRIGGER tr_campaign_backers_updated_at
      BEFORE UPDATE ON public.campaign_backers
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- campaign_comments — moderated; default pending because campaigns involve students/families
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id uuid       REFERENCES public.campaign_comments(id) ON DELETE CASCADE,
  author_name      text,
  author_email     text,
  comment_body     text        NOT NULL,
  comment_type     text        NOT NULL DEFAULT 'encouragement',
  status           text        NOT NULL DEFAULT 'pending',
  is_pinned        boolean     NOT NULL DEFAULT false,
  is_private       boolean     NOT NULL DEFAULT false,
  moderated_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_campaign_comments_updated_at') THEN
    CREATE TRIGGER tr_campaign_comments_updated_at
      BEFORE UPDATE ON public.campaign_comments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- donation_details — donor-entered billing/tax fields separate from core transaction
CREATE TABLE IF NOT EXISTS public.donation_details (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id           uuid        NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  donor_first_name      text,
  donor_middle_name     text,
  donor_last_name       text,
  donor_email           text,
  donor_phone           text,
  billing_address_line_1 text,
  billing_address_line_2 text,
  billing_city          text,
  billing_state         text,
  billing_zip           text,
  tax_year              integer,
  filing_status         text,
  is_arizona_resident   boolean,
  wants_tax_receipt     boolean     NOT NULL DEFAULT true,
  dedication_type       text,
  dedication_name       text,
  dedication_message    text,
  public_display_name   text,
  public_message        text,
  show_name_publicly    boolean     NOT NULL DEFAULT true,
  show_amount_publicly  boolean     NOT NULL DEFAULT false,
  metadata              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(donation_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_donation_details_updated_at') THEN
    CREATE TRIGGER tr_donation_details_updated_at
      BEFORE UPDATE ON public.donation_details
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- donation_allocations — how a donation is split across campaign/student/school/general fund
CREATE TABLE IF NOT EXISTS public.donation_allocations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id     uuid        NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  campaign_id     uuid        REFERENCES public.campaigns(id) ON DELETE SET NULL,
  student_id      uuid        REFERENCES public.students(id) ON DELETE SET NULL,
  school_id       uuid        REFERENCES public.schools(id) ON DELETE SET NULL,
  amount          numeric(14,2) NOT NULL,
  allocation_type text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- donor_billing_profiles — saved billing addresses for returning donors
CREATE TABLE IF NOT EXISTS public.donor_billing_profiles (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name     text,
  middle_name    text,
  last_name      text,
  email          text,
  phone          text,
  address_line_1 text,
  address_line_2 text,
  city           text,
  state          text,
  zip            text,
  is_default     boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_donor_billing_profiles_updated_at') THEN
    CREATE TRIGGER tr_donor_billing_profiles_updated_at
      BEFORE UPDATE ON public.donor_billing_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- payment_events — raw PayPal / webhook event log; deduplicated by provider_event_id
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            text        NOT NULL,
  event_type          text        NOT NULL,
  provider_event_id   text        UNIQUE,
  provider_order_id   text,
  provider_capture_id text,
  donation_id         uuid        REFERENCES public.donations(id) ON DELETE SET NULL,
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processed           boolean     NOT NULL DEFAULT false,
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- donor_recommendations — Arizona-law-compliant donor preference (not binding scholarship earmark)
CREATE TABLE IF NOT EXISTS public.donor_recommendations (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id             uuid        NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  recommended_student_id  uuid        REFERENCES public.students(id) ON DELETE SET NULL,
  recommended_school_id   uuid        REFERENCES public.schools(id) ON DELETE SET NULL,
  recommended_campaign_id uuid        REFERENCES public.campaigns(id) ON DELETE SET NULL,
  relationship_disclosure text,
  is_dependent_of_donor   boolean,
  compliance_status       text        NOT NULL DEFAULT 'pending',
  reviewed_by             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- scholarship_applications
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id             uuid        REFERENCES public.schools(id) ON DELETE SET NULL,
  school_year           text,
  requested_amount      numeric(14,2),
  household_income_range text,
  application_status    text        NOT NULL DEFAULT 'draft',
  submitted_at          timestamptz,
  reviewed_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_scholarship_applications_updated_at') THEN
    CREATE TRIGGER tr_scholarship_applications_updated_at
      BEFORE UPDATE ON public.scholarship_applications
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- scholarship_awards
CREATE TABLE IF NOT EXISTS public.scholarship_awards (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        REFERENCES public.scholarship_applications(id) ON DELETE SET NULL,
  student_id     uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id      uuid        REFERENCES public.schools(id) ON DELETE SET NULL,
  campaign_id    uuid        REFERENCES public.campaigns(id) ON DELETE SET NULL,
  award_amount   numeric(14,2) NOT NULL,
  award_date     date,
  school_year    text,
  status         text        NOT NULL DEFAULT 'pending',
  approved_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_scholarship_awards_updated_at') THEN
    CREATE TRIGGER tr_scholarship_awards_updated_at
      BEFORE UPDATE ON public.scholarship_awards
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- scholarship_payments
CREATE TABLE IF NOT EXISTS public.scholarship_payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id         uuid        NOT NULL REFERENCES public.scholarship_awards(id) ON DELETE CASCADE,
  school_id        uuid        REFERENCES public.schools(id) ON DELETE SET NULL,
  amount           numeric(14,2) NOT NULL,
  payment_method   text,
  payment_reference text,
  paid_at          timestamptz,
  status           text        NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_scholarship_payments_updated_at') THEN
    CREATE TRIGGER tr_scholarship_payments_updated_at
      BEFORE UPDATE ON public.scholarship_payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- tax_receipts
CREATE TABLE IF NOT EXISTS public.tax_receipts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id     uuid        NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  receipt_number  text        UNIQUE NOT NULL,
  tax_year        integer,
  receipt_pdf_url text,
  storage_path    text,
  issued_to_name  text,
  issued_to_email text,
  amount          numeric(14,2),
  issued_at       timestamptz,
  emailed_at      timestamptz,
  status          text        NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- tax_credit_limits — Arizona STO annual limits per filing status
CREATE TABLE IF NOT EXISTS public.tax_credit_limits (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year             integer     NOT NULL,
  filing_status        text        NOT NULL,
  original_credit_limit numeric(14,2),
  overflow_credit_limit numeric(14,2),
  combined_limit        numeric(14,2),
  effective_start_date  date,
  effective_end_date    date,
  source_url            text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tax_year, filing_status)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_tax_credit_limits_updated_at') THEN
    CREATE TRIGGER tr_tax_credit_limits_updated_at
      BEFORE UPDATE ON public.tax_credit_limits
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- compliance_checks — ARS § 43-1089 earmarking and STO compliance audit records
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text        NOT NULL,
  entity_id   uuid        NOT NULL,
  check_type  text        NOT NULL,
  status      text        NOT NULL,
  notes       text,
  reviewed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- communication_preferences
CREATE TABLE IF NOT EXISTS public.communication_preferences (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_opt_in                boolean     NOT NULL DEFAULT true,
  sms_opt_in                  boolean     NOT NULL DEFAULT false,
  transactional_email_enabled boolean     NOT NULL DEFAULT true,
  marketing_email_enabled     boolean     NOT NULL DEFAULT false,
  donation_updates_enabled    boolean     NOT NULL DEFAULT true,
  campaign_updates_enabled    boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_communication_preferences_updated_at') THEN
    CREATE TRIGGER tr_communication_preferences_updated_at
      BEFORE UPDATE ON public.communication_preferences
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email            text        NOT NULL,
  subject             text,
  template_key        text,
  provider            text,
  provider_message_id text,
  status              text,
  payload             jsonb,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- sms_logs
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_phone            text        NOT NULL,
  message             text        NOT NULL,
  provider            text        NOT NULL DEFAULT 'twilio',
  provider_message_id text,
  status              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- approval_queue — unified review queue for campaigns, schools, scholarship applications, comments, reviews
CREATE TABLE IF NOT EXISTS public.approval_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text        NOT NULL,
  entity_id    uuid        NOT NULL,
  submitted_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status       text        NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- admin_activity_logs — immutable audit trail of Super Admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action         text        NOT NULL,
  entity_type    text,
  entity_id      uuid,
  before_data    jsonb,
  after_data     jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- integration_logs — WordPress, FluentCRM, FluentBoards, FluentBooking, PayPal, Resend, Twilio
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text        NOT NULL,
  event_type       text,
  direction        text,
  status           text,
  entity_type      text,
  entity_id        uuid,
  request_payload  jsonb,
  response_payload jsonb,
  error_message    text,
  processed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. Indexes for new tables
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_account_setup_progress_user ON public.account_setup_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_guardian_profiles_user ON public.parent_guardian_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_donor_profiles_user ON public.individual_donor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_donor_profiles_user ON public.business_donor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_school ON public.school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_user ON public.school_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_students_campaign ON public.campaign_students(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_students_student ON public.campaign_students(student_id);
CREATE INDEX IF NOT EXISTS idx_campaign_media_campaign ON public.campaign_media(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_backers_campaign ON public.campaign_backers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_backers_donation ON public.campaign_backers(donation_id);
CREATE INDEX IF NOT EXISTS idx_campaign_backers_status ON public.campaign_backers(status);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign ON public.campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_status ON public.campaign_comments(status);
CREATE INDEX IF NOT EXISTS idx_donation_details_donation ON public.donation_details(donation_id);
CREATE INDEX IF NOT EXISTS idx_donation_allocations_donation ON public.donation_allocations(donation_id);
CREATE INDEX IF NOT EXISTS idx_donor_billing_profiles_user ON public.donor_billing_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_donation ON public.payment_events(donation_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event ON public.payment_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON public.payment_events(processed);
CREATE INDEX IF NOT EXISTS idx_donor_recommendations_donation ON public.donor_recommendations(donation_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_student ON public.scholarship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_awards_student ON public.scholarship_awards(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_payments_award ON public.scholarship_payments(award_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_donation ON public.tax_receipts(donation_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_tax_year ON public.tax_receipts(tax_year);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_entity ON public.compliance_checks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_communication_preferences_user ON public.communication_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON public.approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_entity ON public.approval_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON public.admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_name ON public.integration_logs(integration_name);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON public.integration_logs(status);

-- Extended-table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status_featured ON public.campaigns(status, is_featured);
CREATE INDEX IF NOT EXISTS idx_campaigns_submitted_at ON public.campaigns(submitted_at);
CREATE INDEX IF NOT EXISTS idx_donations_payment_provider_order ON public.donations(payment_provider_order_id);

-- =============================================================================
-- 6. Row Level Security for new tables
-- =============================================================================

ALTER TABLE public.user_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_setup_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_guardian_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_donor_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_backers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_details         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_allocations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_billing_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_recommendations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_awards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_credit_limits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_queue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs        ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_insert_own_or_admin"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_update_own_or_admin"
  ON public.user_roles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_delete_admin"
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- account_setup_progress
CREATE POLICY "account_setup_progress_own_or_admin"
  ON public.account_setup_progress FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- parent_guardian_profiles
CREATE POLICY "parent_guardian_profiles_own_or_admin"
  ON public.parent_guardian_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- individual_donor_profiles
CREATE POLICY "individual_donor_profiles_own_or_admin"
  ON public.individual_donor_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- business_donor_profiles (EIN is sensitive — only owner and admin)
CREATE POLICY "business_donor_profiles_own_or_admin"
  ON public.business_donor_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- student_guardians (guardian owns; admin all)
CREATE POLICY "student_guardians_select_guardian_or_admin"
  ON public.student_guardians FOR SELECT
  USING (guardian_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "student_guardians_insert_guardian_or_admin"
  ON public.student_guardians FOR INSERT
  WITH CHECK (guardian_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "student_guardians_update_guardian_or_admin"
  ON public.student_guardians FOR UPDATE
  USING (guardian_user_id = auth.uid() OR public.is_admin());

-- school_admins (school admin can see their own; super admin sees all)
CREATE POLICY "school_admins_select_own_or_admin"
  ON public.school_admins FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "school_admins_write_admin"
  ON public.school_admins FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- campaign_students (public for active campaigns; write = campaign owner or admin)
CREATE POLICY "campaign_students_select_visible"
  ON public.campaign_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.status = 'active'::public.campaign_status OR c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "campaign_students_write_owner_or_admin"
  ON public.campaign_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- campaign_media (same visibility as photos)
CREATE POLICY "campaign_media_select_visible"
  ON public.campaign_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.status = 'active'::public.campaign_status OR c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "campaign_media_write_owner_or_admin"
  ON public.campaign_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- campaign_backers (visible status = public; pending/hidden = admin/owner only)
CREATE POLICY "campaign_backers_select_visible_or_admin"
  ON public.campaign_backers FOR SELECT
  USING (
    status = 'visible'
    OR user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "campaign_backers_write_admin"
  ON public.campaign_backers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- campaign_comments (approved = public; others = admin/campaign owner only)
CREATE POLICY "campaign_comments_select_approved_or_admin"
  ON public.campaign_comments FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "campaign_comments_insert_authenticated"
  ON public.campaign_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin());

CREATE POLICY "campaign_comments_update_admin"
  ON public.campaign_comments FOR UPDATE
  USING (public.is_admin());

-- donation_details (private: own donor or admin)
CREATE POLICY "donation_details_select_own_or_admin"
  ON public.donation_details FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = donation_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "donation_details_insert_own_or_admin"
  ON public.donation_details FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = donation_id AND (d.user_id = auth.uid() OR d.user_id IS NULL)
    )
  );

CREATE POLICY "donation_details_update_admin"
  ON public.donation_details FOR UPDATE
  USING (public.is_admin());

-- donation_allocations (admin only for writes; read same as donations)
CREATE POLICY "donation_allocations_select_own_or_admin"
  ON public.donation_allocations FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = donation_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "donation_allocations_write_admin"
  ON public.donation_allocations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- donor_billing_profiles (own or admin)
CREATE POLICY "donor_billing_profiles_own_or_admin"
  ON public.donor_billing_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- payment_events (admin only — raw PayPal webhook data)
CREATE POLICY "payment_events_admin_only"
  ON public.payment_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- donor_recommendations (admin only)
CREATE POLICY "donor_recommendations_admin_only"
  ON public.donor_recommendations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- scholarship_applications (student/guardian + admin)
CREATE POLICY "scholarship_applications_select_guardian_or_admin"
  ON public.scholarship_applications FOR SELECT
  USING (guardian_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "scholarship_applications_insert_guardian_or_admin"
  ON public.scholarship_applications FOR INSERT
  WITH CHECK (guardian_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "scholarship_applications_update_admin"
  ON public.scholarship_applications FOR UPDATE
  USING (public.is_admin());

-- scholarship_awards (admin only for write; guardian can read their student's awards)
CREATE POLICY "scholarship_awards_select_guardian_or_admin"
  ON public.scholarship_awards FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = student_id AND sg.guardian_user_id = auth.uid()
    )
  );

CREATE POLICY "scholarship_awards_write_admin"
  ON public.scholarship_awards FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- scholarship_payments (admin only)
CREATE POLICY "scholarship_payments_admin_only"
  ON public.scholarship_payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- tax_receipts (own donor + admin)
CREATE POLICY "tax_receipts_select_own_or_admin"
  ON public.tax_receipts FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = donation_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "tax_receipts_write_admin"
  ON public.tax_receipts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- tax_credit_limits (public read; admin write)
CREATE POLICY "tax_credit_limits_select_all"
  ON public.tax_credit_limits FOR SELECT
  USING (true);

CREATE POLICY "tax_credit_limits_write_admin"
  ON public.tax_credit_limits FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- compliance_checks (admin only)
CREATE POLICY "compliance_checks_admin_only"
  ON public.compliance_checks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- communication_preferences (own + admin)
CREATE POLICY "communication_preferences_own_or_admin"
  ON public.communication_preferences FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- email_logs (admin only)
CREATE POLICY "email_logs_admin_only"
  ON public.email_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- sms_logs (admin only)
CREATE POLICY "sms_logs_admin_only"
  ON public.sms_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- approval_queue (admin only)
CREATE POLICY "approval_queue_admin_only"
  ON public.approval_queue FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- admin_activity_logs (admin only; append-only in practice)
CREATE POLICY "admin_activity_logs_admin_only"
  ON public.admin_activity_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- integration_logs (admin only)
CREATE POLICY "integration_logs_admin_only"
  ON public.integration_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 7. Additional storage buckets (private)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('receipts',          'receipts',          false, 10485760,
   ARRAY['application/pdf']::text[]),
  ('documents',         'documents',         false, 20971520,
   ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]),
  ('student-photos',    'student-photos',    false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('blog-images',       'blog-images',       true,  10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]),
  ('campaign-featured', 'campaign-featured', true,  10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for public buckets
CREATE POLICY "storage_public_read_blog_images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'blog-images');

CREATE POLICY "storage_public_read_campaign_featured"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'campaign-featured');

-- Private buckets: authenticated upload, admin read, owner delete
CREATE POLICY "storage_authenticated_upload_receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND public.is_admin());

CREATE POLICY "storage_admin_read_receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND public.is_admin());

CREATE POLICY "storage_admin_read_documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "storage_authenticated_upload_student_photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL);

-- =============================================================================
-- 8. SQL views for reporting and UI
-- =============================================================================

CREATE OR REPLACE VIEW public.campaign_summary_view AS
SELECT
  c.id                AS campaign_id,
  c.title,
  c.slug,
  c.status,
  c.goal_amount       AS financial_goal,
  c.raised_amount     AS amount_raised,
  c.donor_count,
  CASE
    WHEN c.goal_amount > 0
    THEN ROUND((c.raised_amount / c.goal_amount) * 100, 1)
    ELSE 0
  END                 AS percent_funded,
  GREATEST(0, EXTRACT(DAY FROM (c.ends_at - now()))::integer) AS days_left,
  GREATEST(0, c.goal_amount - c.raised_amount) AS amount_remaining,
  s.name              AS school_name,
  COUNT(cs.id)        AS student_count,
  c.featured_image_url,
  c.is_featured,
  c.campaign_type,
  c.city,
  c.state,
  c.created_at
FROM public.campaigns c
LEFT JOIN public.schools s ON s.id = c.school_id
LEFT JOIN public.campaign_students cs ON cs.campaign_id = c.id
GROUP BY c.id, s.name;

CREATE OR REPLACE VIEW public.donor_summary_view AS
SELECT
  d.user_id           AS donor_user_id,
  SUM(d.amount)       AS total_donated,
  COUNT(d.id)         AS donation_count,
  MAX(d.created_at)   AS last_donation_date,
  MAX(d.tax_year)     AS tax_year,
  COUNT(tr.id)        AS receipt_count
FROM public.donations d
LEFT JOIN public.tax_receipts tr ON tr.donation_id = d.id
WHERE d.status IN ('completed', 'paid')
GROUP BY d.user_id;

CREATE OR REPLACE VIEW public.student_funding_summary_view AS
SELECT
  st.id               AS student_id,
  st.first_name || ' ' || COALESCE(st.last_name, '') AS student_name,
  sc.name             AS school_name,
  COUNT(DISTINCT cs.campaign_id) AS campaign_count,
  COALESCE(SUM(cs.individual_goal), 0)     AS individual_goal,
  COALESCE(SUM(cs.amount_allocated), 0)    AS amount_allocated,
  CASE
    WHEN COALESCE(SUM(cs.individual_goal), 0) > 0
    THEN ROUND((COALESCE(SUM(cs.amount_allocated), 0) / SUM(cs.individual_goal)) * 100, 1)
    ELSE 0
  END                 AS percent_funded
FROM public.students st
LEFT JOIN public.schools sc ON sc.id = st.school_id
LEFT JOIN public.campaign_students cs ON cs.student_id = st.id
GROUP BY st.id, sc.name;

CREATE OR REPLACE VIEW public.admin_dashboard_summary_view AS
SELECT
  (SELECT COALESCE(SUM(amount), 0) FROM public.donations WHERE status IN ('completed', 'paid'))
    AS total_donations,
  (SELECT COALESCE(SUM(amount), 0) FROM public.donations WHERE status IN ('completed', 'paid'))
    AS paid_donations,
  (SELECT COALESCE(SUM(amount), 0) FROM public.donations WHERE status = 'pending')
    AS pending_donations,
  (SELECT COALESCE(SUM(amount), 0) FROM public.donations WHERE status = 'failed')
    AS failed_donations,
  (SELECT COUNT(*) FROM public.campaigns WHERE status = 'active')
    AS active_campaigns,
  (SELECT COUNT(*) FROM public.campaigns WHERE status = 'pending_review')
    AS pending_campaigns,
  (SELECT COUNT(*) FROM public.campaign_comments WHERE status = 'pending')
    AS pending_comments,
  (SELECT COUNT(*) FROM public.reviews WHERE status = 'pending'::public.review_status)
    AS pending_reviews,
  (SELECT COUNT(*) FROM public.compliance_checks WHERE status = 'pending')
    AS pending_compliance_checks,
  (SELECT COUNT(*) FROM public.tax_receipts WHERE status = 'pending')
    AS pending_receipts;

-- Grant authenticated users read access to public views
GRANT SELECT ON public.campaign_summary_view TO authenticated, anon;
GRANT SELECT ON public.donor_summary_view TO authenticated;
GRANT SELECT ON public.student_funding_summary_view TO authenticated;
GRANT SELECT ON public.admin_dashboard_summary_view TO authenticated;

-- =============================================================================
-- 9. Seed: Arizona STO tax-credit limits (2026 tax year)
--    Source: ARS § 43-1089, ARS § 43-1089.03 — subject to annual ADOR adjustment
-- =============================================================================

INSERT INTO public.tax_credit_limits
  (tax_year, filing_status, original_credit_limit, overflow_credit_limit, combined_limit,
   effective_start_date, effective_end_date, source_url, notes)
VALUES
  (2026, 'single',
   787.00, 784.00, 1571.00,
   '2026-01-01', '2026-12-31',
   'https://azdor.gov/individual-income-tax-credits/school-tuition-organization-tax-credit',
   'Single / Head of Household. Original: $787, Overflow: $784, Combined: $1,571'),
  (2026, 'married_filing_jointly',
   1570.00, 1561.00, 3131.00,
   '2026-01-01', '2026-12-31',
   'https://azdor.gov/individual-income-tax-credits/school-tuition-organization-tax-credit',
   'Married Filing Jointly. Original: $1,570, Overflow: $1,561, Combined: $3,131'),
  (2026, 'married_filing_separately',
   787.00, 784.00, 1571.00,
   '2026-01-01', '2026-12-31',
   'https://azdor.gov/individual-income-tax-credits/school-tuition-organization-tax-credit',
   'Married Filing Separately. Same limits as single filer.'),
  (2026, 'corporate',
   NULL, NULL, NULL,
   '2026-01-01', '2026-12-31',
   'https://azdor.gov/corporate-income-tax-credits/school-tuition-organization-tax-credit',
   'Corporate: up to 100% of AZ tax liability. Requires ADOR pre-approval. See ARS § 43-1183.')
ON CONFLICT (tax_year, filing_status) DO NOTHING;
