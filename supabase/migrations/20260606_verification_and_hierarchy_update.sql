-- 1. Add verification and address fields to public.customers (Owners)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS mobile_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS gov_id_url text,
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- 2. Add verification and address fields to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- 3. Add verification and Aadhaar fields to public.user_roles (Staff)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS aadhaar_name text,
  ADD COLUMN IF NOT EXISTS aadhaar_front_url text,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url text,
  ADD COLUMN IF NOT EXISTS aadhaar_verification_status text DEFAULT 'pending' CHECK (aadhaar_verification_status IN ('pending', 'verified', 'rejected'));

-- 4. Storage bucket setup for aadhaar-documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('aadhaar-documents', 'aadhaar-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public access on the bucket for reading files
CREATE POLICY "Public Access for Aadhaar Scans"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aadhaar-documents');

-- Allow authenticated users to upload Aadhaar scans
CREATE POLICY "Authenticated Users Upload Aadhaar Scans"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'aadhaar-documents');

-- Allow authenticated users to update/delete Aadhaar scans
CREATE POLICY "Authenticated Users Modify Aadhaar Scans"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'aadhaar-documents');

CREATE POLICY "Authenticated Users Delete Aadhaar Scans"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'aadhaar-documents');


-- 5. Trigger function to sync Auth state to public profile and customers
CREATE OR REPLACE FUNCTION public.sync_auth_user_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync last sign in
  IF (NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at != OLD.last_sign_in_at)) THEN
    UPDATE public.profiles
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;

    UPDATE public.customers
    SET last_login = NEW.last_sign_in_at
    WHERE owner_email = NEW.email;
  END IF;

  -- Sync email confirmed
  IF (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = NEW.id;

    UPDATE public.customers
    SET email_verified = true
    WHERE owner_email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_auth_user_status ON auth.users;
CREATE TRIGGER trg_sync_auth_user_status
  AFTER UPDATE OF last_sign_in_at, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_status();


-- 6. Audit Logging Triggers
CREATE OR REPLACE FUNCTION public.process_security_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_table text;
  v_record_id uuid;
  v_old_data jsonb := null;
  v_new_data jsonb := null;
  v_user_id uuid;
BEGIN
  v_table := TG_TABLE_NAME::text;
  v_user_id := auth.uid();

  IF (TG_OP = 'INSERT') THEN
    v_record_id := NEW.id;
    v_new_data := to_jsonb(NEW);
    IF v_table = 'customers' THEN
      v_action := 'owner_created';
    ELSIF v_table = 'stores' THEN
      v_action := 'store_created';
    ELSIF v_table = 'user_roles' THEN
      IF NEW.role IN ('staff', 'store_manager') THEN
        v_action := 'staff_created';
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    IF v_table = 'customers' THEN
      IF OLD.is_active != NEW.is_active OR OLD.approval_status != NEW.approval_status THEN
        IF NEW.approval_status = 'approved' THEN
          v_action := 'verification_approved';
        ELSIF NEW.approval_status = 'rejected' THEN
          v_action := 'verification_rejected';
        ELSE
          v_action := 'owner_updated';
        END IF;
      ELSE
        v_action := 'owner_updated';
      END IF;
    ELSIF v_table = 'stores' THEN
      v_action := 'store_updated';
    ELSIF v_table = 'user_roles' THEN
      IF NEW.role IN ('staff', 'store_manager') THEN
        IF OLD.aadhaar_verification_status IS DISTINCT FROM NEW.aadhaar_verification_status THEN
          IF NEW.aadhaar_verification_status = 'verified' THEN
            v_action := 'verification_approved';
          ELSIF NEW.aadhaar_verification_status = 'rejected' THEN
            v_action := 'verification_rejected';
          ELSE
            v_action := 'staff_updated';
          END IF;
        ELSE
          v_action := 'staff_updated';
        END IF;
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    IF v_table = 'customers' THEN
      v_action := 'owner_deleted';
    ELSIF v_table = 'stores' THEN
      v_action := 'store_deleted';
    ELSIF v_table = 'user_roles' THEN
      IF OLD.role IN ('staff', 'store_manager') THEN
        v_action := 'staff_deleted';
      ELSE
        RETURN OLD;
      END IF;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_user_id,
    v_action,
    v_table,
    v_record_id,
    v_old_data,
    v_new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for customers
DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.process_security_audit_log();

-- Recreate trigger for stores
DROP TRIGGER IF EXISTS trg_audit_stores ON public.stores;
CREATE TRIGGER trg_audit_stores
  AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.process_security_audit_log();

-- Recreate trigger for user_roles (Staff)
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.process_security_audit_log();
