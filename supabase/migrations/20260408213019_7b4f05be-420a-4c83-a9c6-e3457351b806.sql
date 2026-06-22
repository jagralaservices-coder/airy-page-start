CREATE TABLE IF NOT EXISTS public.subscription_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.subscription_categories(id) ON DELETE CASCADE,
  tier_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_category_tier_unique UNIQUE (category_id, tier_key)
);

CREATE TABLE IF NOT EXISTS public.subscription_plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plan_features_plan_feature_unique UNIQUE (plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_subscription_categories_key ON public.subscription_categories(key);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_category_id ON public.subscription_plans(category_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_key ON public.subscription_plans(tier_key);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_features_plan_id ON public.subscription_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_features_feature_key ON public.subscription_plan_features(feature_key);

ALTER TABLE public.subscription_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_categories' AND policyname = 'Admins can manage subscription categories'
  ) THEN
    CREATE POLICY "Admins can manage subscription categories"
    ON public.subscription_categories
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_categories' AND policyname = 'Anyone can view active subscription categories'
  ) THEN
    CREATE POLICY "Anyone can view active subscription categories"
    ON public.subscription_categories
    FOR SELECT
    USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_plans' AND policyname = 'Admins can manage subscription plans'
  ) THEN
    CREATE POLICY "Admins can manage subscription plans"
    ON public.subscription_plans
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_plans' AND policyname = 'Anyone can view visible active subscription plans'
  ) THEN
    CREATE POLICY "Anyone can view visible active subscription plans"
    ON public.subscription_plans
    FOR SELECT
    USING (
      is_active = true
      AND is_visible = true
      AND EXISTS (
        SELECT 1
        FROM public.subscription_categories sc
        WHERE sc.id = subscription_plans.category_id
          AND sc.is_active = true
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_plan_features' AND policyname = 'Admins can manage subscription plan features'
  ) THEN
    CREATE POLICY "Admins can manage subscription plan features"
    ON public.subscription_plan_features
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_plan_features' AND policyname = 'Anyone can view features for visible active plans'
  ) THEN
    CREATE POLICY "Anyone can view features for visible active plans"
    ON public.subscription_plan_features
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.subscription_plans sp
        JOIN public.subscription_categories sc ON sc.id = sp.category_id
        WHERE sp.id = subscription_plan_features.plan_id
          AND sp.is_active = true
          AND sp.is_visible = true
          AND sc.is_active = true
      )
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_customer_plan_id(_customer_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id
  FROM public.customers c
  JOIN public.subscription_categories sc
    ON sc.key = c.business_type
   AND sc.is_active = true
  JOIN public.subscription_plans sp
    ON sp.category_id = sc.id
   AND sp.tier_key = c.subscription_tier
   AND sp.is_active = true
  WHERE c.id = _customer_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_store_plan_id(_store_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_customer_plan_id(s.customer_id)
  FROM public.stores s
  WHERE s.id = _store_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_customer_feature(_customer_id UUID, _feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT spf.is_enabled
    FROM public.subscription_plan_features spf
    WHERE spf.plan_id = public.get_customer_plan_id(_customer_id)
      AND spf.feature_key = _feature_key
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.has_store_feature(_store_id UUID, _feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT spf.is_enabled
    FROM public.subscription_plan_features spf
    WHERE spf.plan_id = public.get_store_plan_id(_store_id)
      AND spf.feature_key = _feature_key
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.get_customer_enabled_features(_customer_id UUID)
RETURNS TABLE(feature_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT spf.feature_key
  FROM public.subscription_plan_features spf
  WHERE spf.plan_id = public.get_customer_plan_id(_customer_id)
    AND spf.is_enabled = true
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_subscription_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_subscription_categories_updated_at
    BEFORE UPDATE ON public.subscription_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_subscription_plans_updated_at'
  ) THEN
    CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_subscription_plan_features_updated_at'
  ) THEN
    CREATE TRIGGER update_subscription_plan_features_updated_at
    BEFORE UPDATE ON public.subscription_plan_features
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;