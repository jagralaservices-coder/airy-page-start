-- Make pgcrypto functions accessible from public schema by granting usage
-- The triggers use gen_salt and crypt without schema qualification
-- We need to ensure the search_path includes the extensions schema

-- Drop and recreate triggers with correct search_path
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin != '' THEN
    IF LEFT(NEW.pin, 2) != '$2' THEN
      NEW.pin := crypt(NEW.pin, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_store_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password != '' THEN
    IF LEFT(NEW.password, 2) != '$2' THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_store_login(p_store_code text, p_password text)
RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_staff_code text, p_pin text)
RETURNS TABLE(user_id uuid, role text, store_id uuid, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ur.user_id,
    ur.role::text,
    ur.store_id,
    ur.customer_id
  FROM user_roles ur
  WHERE ur.staff_code = p_staff_code
    AND ur.is_active = true
    AND ur.pin IS NOT NULL
    AND ur.pin = crypt(p_pin, ur.pin);
END;
$function$;

CREATE OR REPLACE FUNCTION public.secure_store_login(p_store_code text, p_password text)
RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;