
-- Add ref_code columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;

-- Function for store ref code
CREATE OR REPLACE FUNCTION public.generate_store_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'STR' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.stores WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.ref_code := new_code;
  RETURN NEW;
END;
$$;

-- Function for user_roles ref code
CREATE OR REPLACE FUNCTION public.generate_user_role_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  prefix TEXT;
BEGIN
  CASE NEW.role
    WHEN 'admin' THEN prefix := 'ADM';
    WHEN 'owner' THEN prefix := 'OWN';
    WHEN 'store_manager' THEN prefix := 'MGR';
    WHEN 'staff' THEN prefix := 'STF';
    ELSE prefix := 'USR';
  END CASE;
  LOOP
    new_code := prefix || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.ref_code := new_code;
  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER set_store_ref_code
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  WHEN (NEW.ref_code IS NULL)
  EXECUTE FUNCTION public.generate_store_ref_code();

CREATE TRIGGER set_user_role_ref_code
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.ref_code IS NULL)
  EXECUTE FUNCTION public.generate_user_role_ref_code();

-- Backfill stores
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM public.stores WHERE ref_code IS NULL LOOP
    LOOP
      new_code := 'STR' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
      SELECT EXISTS(SELECT 1 FROM public.stores WHERE ref_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.stores SET ref_code = new_code WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill user_roles
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
  prefix TEXT;
BEGIN
  FOR r IN SELECT id, role::text as role FROM public.user_roles WHERE ref_code IS NULL LOOP
    CASE r.role
      WHEN 'admin' THEN prefix := 'ADM';
      WHEN 'owner' THEN prefix := 'OWN';
      WHEN 'store_manager' THEN prefix := 'MGR';
      WHEN 'staff' THEN prefix := 'STF';
      ELSE prefix := 'USR';
    END CASE;
    LOOP
      new_code := prefix || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
      SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE ref_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.user_roles SET ref_code = new_code WHERE id = r.id;
  END LOOP;
END $$;
