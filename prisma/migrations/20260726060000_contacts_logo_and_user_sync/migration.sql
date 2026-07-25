-- Contact logo field + automatic Users <-> Contacts sync
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS "logo_url" TEXT;

DROP INDEX IF EXISTS "contacts_user_id_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_user_id_key" ON public.contacts ("user_id");

CREATE OR REPLACE FUNCTION public.map_role_to_contact_type(role text) RETURNS text AS $$
  SELECT CASE
    WHEN role IN ('individual_donor','donor_individual','donor') THEN 'donor'
    WHEN role IN ('business_donor','donor_business') THEN 'business'
    WHEN role = 'parent' THEN 'parent'
    WHEN role = 'student' THEN 'student'
    WHEN role = 'super_admin' THEN 'other'
    ELSE role
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.sync_profile_to_contact() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.contacts (user_id, first_name, last_name, display_name, email, email_normalized, phone, phone_normalized, avatar_url, contact_type, source, created_at, updated_at)
  VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.display_name, NEW.email, lower(NEW.email), NEW.phone, NEW.phone_normalized, NEW.avatar_url, public.map_role_to_contact_type(NEW.active_account_type), 'user', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    email_normalized = EXCLUDED.email_normalized,
    phone = COALESCE(EXCLUDED.phone, contacts.phone),
    phone_normalized = COALESCE(EXCLUDED.phone_normalized, contacts.phone_normalized),
    avatar_url = COALESCE(contacts.avatar_url, EXCLUDED.avatar_url),
    contact_type = COALESCE(contacts.contact_type, EXCLUDED.contact_type),
    updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_profile_to_contact ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_contact AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_contact();

CREATE OR REPLACE FUNCTION public.sync_role_to_contact() RETURNS trigger AS $$
DECLARE uid uuid;
BEGIN
  uid := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE public.contacts SET contact_type = public.map_role_to_contact_type((
    SELECT role FROM public.user_roles WHERE user_id = uid AND status = 'active'
    ORDER BY CASE role
      WHEN 'parent' THEN 1
      WHEN 'individual_donor' THEN 2 WHEN 'donor_individual' THEN 2
      WHEN 'business_donor' THEN 3 WHEN 'donor_business' THEN 3
      WHEN 'student' THEN 4 ELSE 9 END
    LIMIT 1
  )), updated_at = now() WHERE user_id = uid;
  RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_role_to_contact ON public.user_roles;
CREATE TRIGGER trg_sync_role_to_contact AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_contact();

INSERT INTO public.contacts (user_id, first_name, last_name, display_name, email, email_normalized, phone, phone_normalized, avatar_url, contact_type, source)
SELECT p.id, p.first_name, p.last_name, p.display_name, p.email, lower(p.email), p.phone, p.phone_normalized, p.avatar_url, public.map_role_to_contact_type(p.active_account_type), 'user'
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;
