
-- Fix subscription system to use user_roles.merchant_id (correct FK)
-- instead of user_roles.customer_id (legacy field, unused for subscriptions).

-- ============ Rewrite resolver functions ============
CREATE OR REPLACE FUNCTION public.get_merchant_plan(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_merchant uuid;
  v_expiry timestamptz;
  v_status public.subscription_status;
BEGIN
  IF public.has_role(_user_id, 'super_admin') OR public.has_role(_user_id, 'admin') THEN
    RETURN 'platinum';
  END IF;

  SELECT merchant_id INTO v_merchant
    FROM public.user_roles
   WHERE user_id = _user_id AND is_active = true AND merchant_id IS NOT NULL
   ORDER BY CASE role
     WHEN 'owner' THEN 1
     WHEN 'store_manager' THEN 2
     WHEN 'staff' THEN 3
     ELSE 9 END
   LIMIT 1;

  IF v_merchant IS NULL THEN
    RETURN 'basic';
  END IF;

  SELECT plan_name::text, expiry_date, status
    INTO v_plan, v_expiry, v_status
    FROM public.merchant_subscription
   WHERE merchant_id = v_merchant;

  IF v_plan IS NULL THEN RETURN 'basic'; END IF;
  IF v_status <> 'active' OR v_expiry < now() THEN RETURN 'basic'; END IF;
  RETURN v_plan;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_merchant_features(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_merchant uuid;
  v_plan text;
  v_features text[];
  v_addons text[];
  v_custom text[];
  v_expiry timestamptz;
  v_status public.subscription_status;
BEGIN
  IF public.has_role(_user_id, 'super_admin') OR public.has_role(_user_id, 'admin') THEN
    RETURN ARRAY['*'];
  END IF;

  SELECT merchant_id INTO v_merchant
    FROM public.user_roles
   WHERE user_id = _user_id AND is_active = true AND merchant_id IS NOT NULL
   ORDER BY CASE role
     WHEN 'owner' THEN 1
     WHEN 'store_manager' THEN 2
     WHEN 'staff' THEN 3
     ELSE 9 END
   LIMIT 1;

  IF v_merchant IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT plan_name::text, expiry_date, status
    INTO v_plan, v_expiry, v_status
    FROM public.merchant_subscription
   WHERE merchant_id = v_merchant;

  IF v_plan IS NULL OR v_status <> 'active' OR v_expiry < now() THEN
    v_plan := 'basic';
  END IF;

  SELECT COALESCE(array_agg(feature_key), ARRAY[]::text[])
    INTO v_features
    FROM public.feature_catalog
   WHERE v_plan = ANY(included_in) AND is_active = true;

  SELECT COALESCE(array_agg(feature_key), ARRAY[]::text[])
    INTO v_addons
    FROM public.merchant_addons
   WHERE merchant_id = v_merchant
     AND enabled = true
     AND expiry_date >= now();

  SELECT COALESCE(features, ARRAY[]::text[])
    INTO v_custom
    FROM public.merchant_custom_plan
   WHERE merchant_id = v_merchant AND is_active = true;

  RETURN ARRAY(SELECT DISTINCT unnest(v_features || v_addons || COALESCE(v_custom, ARRAY[]::text[])));
END;
$function$;

-- ============ Rewrite RLS policies to use merchant_id ============

-- merchant_subscription: owners read their own
DROP POLICY IF EXISTS "Owners read own subscription" ON public.merchant_subscription;
CREATE POLICY "Owners read own subscription"
  ON public.merchant_subscription FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.is_active = true
         AND ur.merchant_id = merchant_subscription.merchant_id
    )
  );

-- merchant_addons
DROP POLICY IF EXISTS "Owners read own addons" ON public.merchant_addons;
CREATE POLICY "Owners read own addons"
  ON public.merchant_addons FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.is_active = true
         AND ur.merchant_id = merchant_addons.merchant_id
    )
  );

-- merchant_custom_plan
DROP POLICY IF EXISTS "Owners read own custom plan" ON public.merchant_custom_plan;
CREATE POLICY "Owners read own custom plan"
  ON public.merchant_custom_plan FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.is_active = true
         AND ur.merchant_id = merchant_custom_plan.merchant_id
    )
  );

-- subscription_requests: owners read & create their own
DROP POLICY IF EXISTS "Owners read own requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Owners create own requests" ON public.subscription_requests;

CREATE POLICY "Owners read own requests"
  ON public.subscription_requests FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.is_active = true
         AND ur.merchant_id = subscription_requests.merchant_id
    )
  );

CREATE POLICY "Owners create own requests"
  ON public.subscription_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.is_active = true
         AND ur.role = 'owner'
         AND ur.merchant_id = subscription_requests.merchant_id
    )
  );

-- ============ Mark legacy column deprecated (kept for compatibility) ============
COMMENT ON COLUMN public.user_roles.customer_id IS
  'DEPRECATED for subscription scoping. Use merchant_id. Still used by legacy stores/staff RLS that reference public.customers.';
