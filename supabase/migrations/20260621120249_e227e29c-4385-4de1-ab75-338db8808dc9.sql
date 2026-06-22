
-- 1) CUSTOMERS
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS business_name      text,
  ADD COLUMN IF NOT EXISTS owner_name         text,
  ADD COLUMN IF NOT EXISTS owner_email        text,
  ADD COLUMN IF NOT EXISTS approval_status    text    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ref_code           text,
  ADD COLUMN IF NOT EXISTS subscription_plan  text    DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_tier  text    DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS subscription_start date,
  ADD COLUMN IF NOT EXISTS subscription_end   date,
  ADD COLUMN IF NOT EXISTS max_stores         integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS staff_limit        integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS outlet_limit       integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS business_type      text    DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS enabled_addons     jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address_line1      text,
  ADD COLUMN IF NOT EXISTS locality           text,
  ADD COLUMN IF NOT EXISTS city               text,
  ADD COLUMN IF NOT EXISTS state              text,
  ADD COLUMN IF NOT EXISTS pincode            text,
  ADD COLUMN IF NOT EXISTS gov_id_url         text,
  ADD COLUMN IF NOT EXISTS mobile_verified    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at        timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by        uuid,
  ADD COLUMN IF NOT EXISTS rejected_at        timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason   text,
  ADD COLUMN IF NOT EXISTS owner_user_id      uuid;

CREATE INDEX IF NOT EXISTS idx_customers_owner_email   ON public.customers (lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_customers_owner_user_id ON public.customers (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_approval      ON public.customers (approval_status);

-- 2) PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS address_line1   text,
  ADD COLUMN IF NOT EXISTS locality        text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS state           text,
  ADD COLUMN IF NOT EXISTS pincode         text,
  ADD COLUMN IF NOT EXISTS mobile_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified  boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));

UPDATE public.profiles p SET email = u.email
  FROM auth.users u
 WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 3) USER_ROLES
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_roles_customer_id ON public.user_roles (customer_id);

-- 4) STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS owner_id         uuid,
  ADD COLUMN IF NOT EXISTS customer_id      uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status  text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid,
  ADD COLUMN IF NOT EXISTS rejected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_stores_owner_id    ON public.stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_customer_id ON public.stores (customer_id);

-- 5) STAFF (needs store_id added since base schema lacks it)
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS store_id         uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id          uuid,
  ADD COLUMN IF NOT EXISTS customer_id      uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status  text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid,
  ADD COLUMN IF NOT EXISTS rejected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_staff_store_id    ON public.staff (store_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id     ON public.staff (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_customer_id ON public.staff (customer_id);

-- 6) Updated handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email);

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
      INSERT INTO public.user_roles (user_id, role, is_active) VALUES (NEW.id, 'super_admin', true);
    ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
      INSERT INTO public.user_roles (user_id, role, is_active) VALUES (NEW.id, 'owner', true);
    ELSE
      INSERT INTO public.user_roles (user_id, role, is_active) VALUES (NEW.id, 'cashier', true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) Helper
CREATE OR REPLACE FUNCTION public.get_user_customer_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id FROM public.user_roles
   WHERE user_id = _user_id AND role = 'owner' AND is_active = true
   LIMIT 1;
$$;

-- 8) Stores RLS
DROP POLICY IF EXISTS "Owners manage own stores" ON public.stores;
CREATE POLICY "Owners manage own stores"
  ON public.stores FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR customer_id = public.get_user_customer_id(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR customer_id = public.get_user_customer_id(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  );

-- 9) Staff RLS
DROP POLICY IF EXISTS "Owners manage own staff" ON public.staff;
CREATE POLICY "Owners manage own staff"
  ON public.staff FOR ALL TO authenticated
  USING (
    customer_id = public.get_user_customer_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = staff.store_id
                AND (s.owner_id = auth.uid() OR s.customer_id = public.get_user_customer_id(auth.uid())))
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  )
  WITH CHECK (
    customer_id = public.get_user_customer_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = staff.store_id
                AND (s.owner_id = auth.uid() OR s.customer_id = public.get_user_customer_id(auth.uid())))
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  );

-- 10) Customers RLS
DROP POLICY IF EXISTS "Admins manage all customers" ON public.customers;
CREATE POLICY "Admins manage all customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

DROP POLICY IF EXISTS "Owners view own customer record" ON public.customers;
CREATE POLICY "Owners view own customer record"
  ON public.customers FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR id = public.get_user_customer_id(auth.uid()));

-- 11) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT ALL ON public.customers, public.stores, public.staff, public.user_roles, public.profiles TO service_role;
