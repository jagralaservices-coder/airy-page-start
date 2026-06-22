
-- =========================
-- merchants
-- =========================
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  owner_email text NOT NULL,
  phone text,
  business_type text DEFAULT 'restaurant',
  subscription_plan text DEFAULT 'basic',
  subscription_tier text DEFAULT 'basic',
  subscription_end date,
  max_stores integer DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'pending',
  address text,
  address_line1 text,
  locality text,
  city text,
  state text,
  pincode text,
  gov_id_url text,
  mobile_verified boolean NOT NULL DEFAULT false,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS merchants_owner_email_lower_idx
  ON public.merchants ((lower(owner_email)));

CREATE INDEX IF NOT EXISTS merchants_owner_user_id_idx
  ON public.merchants (owner_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants_admin_all" ON public.merchants
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "merchants_owner_select" ON public.merchants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "merchants_owner_update" ON public.merchants
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_merchants_updated ON public.merchants;
CREATE TRIGGER trg_merchants_updated
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- stores
-- =========================
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  address_line1 text,
  locality text,
  city text,
  state text,
  pincode text,
  country text DEFAULT 'India',
  currency_code text DEFAULT 'INR',
  tax_type text,
  tax_percentage numeric(5,2),
  business_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_merchant_id_idx ON public.stores (merchant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_admin_all" ON public.stores
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "stores_merchant_owner_all" ON public.stores
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = stores.merchant_id AND m.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = stores.merchant_id AND m.owner_user_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS trg_stores_updated ON public.stores;
CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- user_roles extensions
-- =========================
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS user_roles_merchant_id_idx ON public.user_roles (merchant_id);
CREATE INDEX IF NOT EXISTS user_roles_store_id_idx ON public.user_roles (store_id);
