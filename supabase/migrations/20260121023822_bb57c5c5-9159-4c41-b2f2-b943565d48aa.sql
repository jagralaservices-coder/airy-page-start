-- =====================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. DROP DANGEROUS POLICIES FIRST
DROP POLICY IF EXISTS "Allow store login verification" ON public.stores;
DROP POLICY IF EXISTS "Allow pending owner signup" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations on inventory_components" ON public.inventory_components;
DROP POLICY IF EXISTS "Allow all operations on menu_item_ingredients" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Allow menu operations for active stores" ON public.menu_items;
DROP POLICY IF EXISTS "Allow order operations for active stores" ON public.orders;
DROP POLICY IF EXISTS "Store managers can view own store" ON public.stores;
DROP POLICY IF EXISTS "Staff can view their store" ON public.stores;
DROP POLICY IF EXISTS "Admins can manage inventory components" ON public.inventory_components;
DROP POLICY IF EXISTS "Owners can manage inventory components" ON public.inventory_components;
DROP POLICY IF EXISTS "Store managers can manage inventory components" ON public.inventory_components;
DROP POLICY IF EXISTS "Admins can manage menu ingredients" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Owners can manage menu ingredients" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Store managers can manage menu ingredients" ON public.menu_item_ingredients;

-- 2. CREATE SECURE POLICIES FOR STORES
CREATE POLICY "Staff can view their store"
  ON public.stores FOR SELECT
  USING (id = get_user_store_id(auth.uid()));

-- 3. CREATE SECURE POLICIES FOR CUSTOMERS
CREATE POLICY "Authenticated users can signup as owner"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. CREATE SECURE POLICIES FOR INVENTORY_COMPONENTS
CREATE POLICY "Admins can manage inventory components"
  ON public.inventory_components FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Owners can manage inventory components"
  ON public.inventory_components FOR ALL
  USING (is_owner(auth.uid()))
  WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Store managers can manage inventory components"
  ON public.inventory_components FOR ALL
  USING (get_user_store_id(auth.uid()) IS NOT NULL)
  WITH CHECK (get_user_store_id(auth.uid()) IS NOT NULL);

-- 5. CREATE SECURE POLICIES FOR MENU_ITEM_INGREDIENTS
CREATE POLICY "Admins can manage menu ingredients"
  ON public.menu_item_ingredients FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Owners can manage menu ingredients"
  ON public.menu_item_ingredients FOR ALL
  USING (is_owner(auth.uid()))
  WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Store managers can manage menu ingredients"
  ON public.menu_item_ingredients FOR ALL
  USING (get_user_store_id(auth.uid()) IS NOT NULL)
  WITH CHECK (get_user_store_id(auth.uid()) IS NOT NULL);

-- 6. CREATE RATE LIMITING TABLE
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL,
  attempt_time timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false,
  ip_address text
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for login attempts" ON public.login_attempts;
CREATE POLICY "Service role only for login attempts"
  ON public.login_attempts FOR ALL
  USING (false)
  WITH CHECK (false);

-- 7. CREATE FUNCTION TO CHECK RATE LIMITING
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_type text, p_max_attempts int DEFAULT 5, p_window_minutes int DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count int;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_type
    AND success = false
    AND attempt_time > now() - (p_window_minutes || ' minutes')::interval;
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- 8. CREATE FUNCTION TO LOG LOGIN ATTEMPT
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_identifier text, p_type text, p_success boolean, p_ip text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, attempt_type, success, ip_address)
  VALUES (p_identifier, p_type, p_success, p_ip);
END;
$$;

-- 9. CREATE AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log FOR SELECT
  USING (is_admin(auth.uid()));

-- 10. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.login_attempts(identifier, attempt_type, attempt_time);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action, created_at);

-- 11. CREATE SECURE STORE LOGIN FUNCTION (for edge functions to use)
CREATE OR REPLACE FUNCTION public.secure_store_login(p_store_code text, p_password text)
RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit first
  IF NOT check_rate_limit(p_store_code, 'store') THEN
    RAISE EXCEPTION 'Too many login attempts. Please try again later.';
  END IF;
  
  -- Attempt login
  RETURN QUERY
  SELECT 
    s.id,
    s.store_name,
    s.address,
    s.phone,
    s.customer_id
  FROM stores s
  WHERE s.store_code = p_store_code 
    AND s.password = p_password
    AND s.is_active = true;
    
  -- If no rows returned, it's a failed attempt
  IF NOT FOUND THEN
    PERFORM log_login_attempt(p_store_code, 'store', false);
  ELSE
    PERFORM log_login_attempt(p_store_code, 'store', true);
  END IF;
END;
$$;
