CREATE OR REPLACE FUNCTION public.actsto_normalize_phone(raw_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH cleaned AS (
    SELECT
      btrim(coalesce(raw_phone, '')) AS trimmed,
      regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g') AS digits
  )
  SELECT CASE
    WHEN digits = '' THEN NULL
    WHEN left(trimmed, 1) = '+' THEN '+' || digits
    WHEN length(digits) = 10 THEN '+1' || digits
    WHEN length(digits) = 11 AND left(digits, 1) = '1' THEN '+' || digits
    ELSE '+' || digits
  END
  FROM cleaned;
$$;

ALTER TABLE profiles ADD COLUMN phone_normalized text;
ALTER TABLE parent_guardian_profiles ADD COLUMN emergency_contact_phone_normalized text;
ALTER TABLE business_donor_profiles ADD COLUMN business_phone_normalized text;
ALTER TABLE schools ADD COLUMN phone_normalized text;
ALTER TABLE students ADD COLUMN phone text;
ALTER TABLE students ADD COLUMN phone_normalized text;
ALTER TABLE donor_billing_profiles ADD COLUMN phone_normalized text;
ALTER TABLE donation_details ADD COLUMN donor_phone_normalized text;

ALTER TABLE sms_logs ADD COLUMN profile_id uuid;
ALTER TABLE sms_logs ADD COLUMN role_type text;
ALTER TABLE sms_logs ADD COLUMN campaign_id uuid;
ALTER TABLE sms_logs ADD COLUMN contact_name text;
ALTER TABLE sms_logs ADD COLUMN contact_email text;
ALTER TABLE sms_logs ADD COLUMN contact_source text;
ALTER TABLE sms_logs ADD COLUMN matched_phone text;

UPDATE profiles SET phone_normalized = public.actsto_normalize_phone(phone) WHERE phone IS NOT NULL;
UPDATE parent_guardian_profiles
SET emergency_contact_phone_normalized = public.actsto_normalize_phone(emergency_contact_phone)
WHERE emergency_contact_phone IS NOT NULL;
UPDATE business_donor_profiles
SET business_phone_normalized = public.actsto_normalize_phone(business_phone)
WHERE business_phone IS NOT NULL;
UPDATE schools SET phone_normalized = public.actsto_normalize_phone(phone) WHERE phone IS NOT NULL;
UPDATE donor_billing_profiles SET phone_normalized = public.actsto_normalize_phone(phone) WHERE phone IS NOT NULL;
UPDATE donation_details SET donor_phone_normalized = public.actsto_normalize_phone(donor_phone) WHERE donor_phone IS NOT NULL;
UPDATE sms_logs
SET matched_phone = public.actsto_normalize_phone(CASE WHEN direction = 'inbound' THEN from_phone ELSE to_phone END)
WHERE matched_phone IS NULL;

UPDATE sms_logs AS sms
SET
  user_id = COALESCE(sms.user_id, matched_profile.id),
  profile_id = COALESCE(sms.profile_id, matched_profile.id),
  role_type = COALESCE(sms.role_type, matched_profile.role),
  contact_name = COALESCE(sms.contact_name, matched_profile.contact_name),
  contact_email = COALESCE(sms.contact_email, matched_profile.email),
  contact_source = COALESCE(sms.contact_source, 'profiles.phone')
FROM (
  SELECT
    p.id,
    p.phone_normalized,
    p.email,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.full_name, ''), NULLIF(concat_ws(' ', p.first_name, p.last_name), ''), p.email) AS contact_name,
    COALESCE(ur.role, p.active_account_type, p.primary_account_type) AS role
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT role
    FROM user_roles
    WHERE user_id = p.id AND status = 'active'
    ORDER BY
      CASE role
        WHEN 'parent' THEN 1
        WHEN 'student' THEN 2
        WHEN 'individual_donor' THEN 3
        WHEN 'donor_individual' THEN 3
        WHEN 'business_donor' THEN 4
        WHEN 'donor_business' THEN 4
        WHEN 'super_admin' THEN 5
        ELSE 10
      END
    LIMIT 1
  ) ur ON true
  WHERE p.phone_normalized IS NOT NULL
) AS matched_profile
WHERE sms.profile_id IS NULL
  AND sms.matched_phone = matched_profile.phone_normalized;

UPDATE sms_logs AS sms
SET campaign_id = COALESCE(sms.campaign_id, campaign_match.id)
FROM (
  SELECT DISTINCT ON (created_by_user_id) id, created_by_user_id
  FROM campaigns
  WHERE status IN ('active', 'pending_review', 'draft')
  ORDER BY created_by_user_id, updated_at DESC
) AS campaign_match
WHERE sms.campaign_id IS NULL
  AND sms.profile_id = campaign_match.created_by_user_id;

CREATE INDEX profiles_phone_normalized_idx ON profiles(phone_normalized);
CREATE INDEX parent_guardian_profiles_emergency_contact_phone_normalized_idx ON parent_guardian_profiles(emergency_contact_phone_normalized);
CREATE INDEX business_donor_profiles_business_phone_normalized_idx ON business_donor_profiles(business_phone_normalized);
CREATE INDEX schools_phone_normalized_idx ON schools(phone_normalized);
CREATE INDEX students_phone_normalized_idx ON students(phone_normalized);
CREATE INDEX donor_billing_profiles_phone_normalized_idx ON donor_billing_profiles(phone_normalized);
CREATE INDEX donation_details_donor_phone_normalized_idx ON donation_details(donor_phone_normalized);
CREATE INDEX sms_logs_profile_id_idx ON sms_logs(profile_id);
CREATE INDEX sms_logs_campaign_id_idx ON sms_logs(campaign_id);
CREATE INDEX sms_logs_matched_phone_idx ON sms_logs(matched_phone);
