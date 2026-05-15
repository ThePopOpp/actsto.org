ALTER TABLE public.communication_preferences
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_version text,
  ADD COLUMN IF NOT EXISTS sms_consent_source text;

CREATE TABLE IF NOT EXISTS public.sms_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_consent boolean NOT NULL DEFAULT false,
  sms_consent_timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  email text,
  sms_consent_phone_number text,
  phone_normalized text,
  source text NOT NULL,
  sms_consent_source_url text,
  sms_consent_form_name text NOT NULL,
  sms_consent_disclosure_version text NOT NULL,
  consent_text text NOT NULL,
  sms_consent_ip_address text,
  sms_consent_user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_consent_records_user_id_idx ON public.sms_consent_records(user_id);
CREATE INDEX IF NOT EXISTS sms_consent_records_phone_normalized_idx ON public.sms_consent_records(phone_normalized);
CREATE INDEX IF NOT EXISTS sms_consent_records_sms_consent_idx ON public.sms_consent_records(sms_consent);
CREATE INDEX IF NOT EXISTS sms_consent_records_source_idx ON public.sms_consent_records(source);
CREATE INDEX IF NOT EXISTS sms_consent_records_form_name_idx ON public.sms_consent_records(sms_consent_form_name);
CREATE INDEX IF NOT EXISTS sms_consent_records_created_at_idx ON public.sms_consent_records(created_at);

ALTER TABLE public.sms_consent_records ENABLE ROW LEVEL SECURITY;
