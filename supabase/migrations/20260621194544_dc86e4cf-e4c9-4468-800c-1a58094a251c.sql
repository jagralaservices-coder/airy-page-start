
-- Tighten RLS: merchants read-only; only admin/service_role can write
DROP POLICY IF EXISTS "Owners manage own addons" ON public.merchant_addons;
DROP POLICY IF EXISTS "Owners read own addons" ON public.merchant_addons;
DROP POLICY IF EXISTS "Owners manage own custom plan" ON public.merchant_custom_plan;
DROP POLICY IF EXISTS "Owners read own custom plan" ON public.merchant_custom_plan;

CREATE POLICY "Merchant reads own addons" ON public.merchant_addons FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true AND ur.customer_id = merchant_addons.merchant_id)
  OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admins write addons" ON public.merchant_addons FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Merchant reads own custom plan" ON public.merchant_custom_plan FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true AND ur.customer_id = merchant_custom_plan.merchant_id)
  OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admins write custom plan" ON public.merchant_custom_plan FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- Subscription requests table (merchant-initiated, admin-approved)
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('plan_upgrade','addon','extra_staff','extra_outlet','custom')),
  requested_plan text,
  requested_feature text,
  quantity integer DEFAULT 1,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant inserts own request" ON public.subscription_requests FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true AND ur.customer_id = subscription_requests.merchant_id)
);

CREATE POLICY "Merchant reads own requests" ON public.subscription_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true AND ur.customer_id = subscription_requests.merchant_id)
  OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
);

CREATE POLICY "Admins manage all requests" ON public.subscription_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER set_subscription_requests_updated_at BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime sync for merchants when admin changes their subscription/addons/custom plan
ALTER TABLE public.merchant_subscription REPLICA IDENTITY FULL;
ALTER TABLE public.merchant_addons REPLICA IDENTITY FULL;
ALTER TABLE public.merchant_custom_plan REPLICA IDENTITY FULL;
ALTER TABLE public.subscription_requests REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_subscription;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_addons;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_custom_plan;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
