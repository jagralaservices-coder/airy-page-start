
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a trigger to auto-hash passwords on insert/update
CREATE OR REPLACE FUNCTION public.hash_store_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if password is being set/changed and isn't already hashed
  IF NEW.password IS NOT NULL AND NEW.password != '' THEN
    -- Check if already hashed (bcrypt hashes start with $2)
    IF LEFT(NEW.password, 2) != '$2' THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_store_password_trigger
BEFORE INSERT OR UPDATE OF password ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.hash_store_password();

-- Hash all existing plain-text passwords
UPDATE public.stores
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password != '' AND LEFT(password, 2) != '$2';

-- Update secure_store_login to use bcrypt comparison
CREATE OR REPLACE FUNCTION public.secure_store_login(p_store_code text, p_password text)
RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(p_store_code, 'store') THEN
    RAISE EXCEPTION 'Too many login attempts. Please try again later.';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.store_name,
    s.address,
    s.phone,
    s.customer_id
  FROM stores s
  WHERE s.store_code = p_store_code 
    AND s.password = crypt(p_password, s.password)
    AND s.is_active = true;
    
  IF NOT FOUND THEN
    PERFORM log_login_attempt(p_store_code, 'store', false);
  ELSE
    PERFORM log_login_attempt(p_store_code, 'store', true);
  END IF;
END;
$$;

-- Update validate_store_login to use bcrypt comparison
CREATE OR REPLACE FUNCTION public.validate_store_login(p_store_code text, p_password text)
RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.store_name,
    s.address,
    s.phone,
    s.customer_id
  FROM stores s
  WHERE s.store_code = p_store_code 
    AND s.password = crypt(p_password, s.password)
    AND s.is_active = true;
END;
$$;
