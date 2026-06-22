
-- Plan enum
DO $$ BEGIN
  CREATE TYPE public.merchant_plan AS ENUM ('basic', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.merchant_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  plan_name public.merchant_plan NOT NULL DEFAULT 'basic',
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  staff_limit integer NOT NULL DEFAULT 0,
  outlet_limit integer NOT NULL DEFAULT 1,
  extra_staff integer NOT NULL DEFAULT 0,
  extra_outlets integer NOT NULL DEFAULT 0,
  status public.subscription_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_subscription TO authenticated;
GRANT ALL ON public.merchant_subscription TO service_role;

ALTER TABLE public.merchant_subscription ENABLE ROW LEVEL SECURITY;

-- Owners can read their own subscription via user_roles.customer_id == merchant_id
CREATE POLICY "Owners read own subscription"
  ON public.merchant_subscription FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.customer_id = merchant_subscription.merchant_id
    )
  );

CREATE POLICY "Admins read all subscriptions"
  ON public.merchant_subscription FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subscriptions"
  ON public.merchant_subscription FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_merchant_subscription_updated_at
  BEFORE UPDATE ON public.merchant_subscription
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: effective plan for a user
CREATE OR REPLACE FUNCTION public.get_merchant_plan(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_merchant uuid;
  v_expiry timestamptz;
  v_status public.subscription_status;
BEGIN
  IF public.has_role(_user_id, 'super_admin') OR public.has_role(_user_id, 'admin') THEN
    RETURN 'platinum';
  END IF;

  SELECT customer_id INTO v_merchant
    FROM public.user_roles
   WHERE user_id = _user_id AND is_active = true AND customer_id IS NOT NULL
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

  IF v_plan IS NULL THEN
    RETURN 'basic';
  END IF;
  IF v_status <> 'active' OR v_expiry < now() THEN
    RETURN 'basic';
  END IF;
  RETURN v_plan;
END;
$$;

-- Seed: every existing merchant gets a basic subscription if none exists
INSERT INTO public.merchant_subscription (merchant_id, plan_name, staff_limit, outlet_limit)
SELECT m.id, 'basic', 0, 1
  FROM public.merchants m
  LEFT JOIN public.merchant_subscription s ON s.merchant_id = m.id
 WHERE s.id IS NULL;
