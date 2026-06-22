
-- Create trigger function to hash staff PINs (similar to store passwords)
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin != '' THEN
    IF LEFT(NEW.pin, 2) != '$2' THEN
      NEW.pin := crypt(NEW.pin, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS hash_staff_pin_trigger ON public.user_roles;
CREATE TRIGGER hash_staff_pin_trigger
  BEFORE INSERT OR UPDATE OF pin ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_staff_pin();

-- Create a function to verify staff PIN using bcrypt
CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_staff_code text, p_pin text)
RETURNS TABLE(user_id uuid, role text, store_id uuid, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Hash all existing plaintext PINs
UPDATE public.user_roles
SET pin = crypt(pin, gen_salt('bf', 10))
WHERE pin IS NOT NULL 
  AND pin != '' 
  AND LEFT(pin, 2) != '$2';
