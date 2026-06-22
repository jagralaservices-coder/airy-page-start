
-- 1) Role helpers now require is_active = true
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles) AND is_active = true
  );
$$;

-- Helper: any active role at all (used as the floor for operational table reads).
-- This is a meaningful narrowing vs `true`: a freshly authenticated user with no
-- assigned role can no longer read any operational data.
CREATE OR REPLACE FUNCTION public.has_any_active_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_any_active_role(uuid) TO authenticated;

-- 2) CUSTOMERS (merchant accounts) — remove the open SELECT.
DROP POLICY IF EXISTS "customers_select_auth" ON public.customers;
-- "Owners view own customer record" and "Admins manage all customers" already cover legitimate reads.
-- Add a policy so active staff/managers can read their own merchant's customer row.
CREATE POLICY "customers_select_team_member"
  ON public.customers FOR SELECT TO authenticated
  USING (
    id = public.get_user_customer_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (ur.customer_id = customers.id OR ur.merchant_id = customers.id)
    )
  );

-- 3) PROFILES — restrict to self + admins.
DROP POLICY IF EXISTS "profiles_select_all_auth" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  );

-- 4) STAFF — remove the open "view staff" policy. The pre-existing
--    "Owners manage own staff" policy (FOR ALL) already grants SELECT to the
--    right owners/admins and is scoped by customer_id / store ownership.
DROP POLICY IF EXISTS "view staff" ON public.staff;

-- 5) Tighten operational table SELECTs from USING(true) to "any active role".
--    True per-merchant scoping would require a merchant_id column on these
--    tables (not present today); this still removes anonymous-style reads by
--    any authenticated account that has no assigned role.

DROP POLICY IF EXISTS "cash view auth" ON public.cash_sessions;
CREATE POLICY "cash_sessions_select_role"
  ON public.cash_sessions FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "exp view auth" ON public.expenses;
CREATE POLICY "expenses_select_role"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "orders_select_auth" ON public.orders;
CREATE POLICY "orders_select_role"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "order_items_select_auth" ON public.order_items;
CREATE POLICY "order_items_select_role"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "payments_select_auth" ON public.payments;
CREATE POLICY "payments_select_role"
  ON public.payments FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "kot view auth" ON public.kot_tickets;
CREATE POLICY "kot_tickets_select_role"
  ON public.kot_tickets FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "koti view auth" ON public.kot_items;
CREATE POLICY "kot_items_select_role"
  ON public.kot_items FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "tables view all auth" ON public.restaurant_tables;
CREATE POLICY "restaurant_tables_select_role"
  ON public.restaurant_tables FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "view po" ON public.purchase_orders;
CREATE POLICY "purchase_orders_select_role"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "view po items" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_select_role"
  ON public.purchase_order_items FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "view adj" ON public.stock_adjustments;
CREATE POLICY "stock_adjustments_select_role"
  ON public.stock_adjustments FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "view suppliers" ON public.suppliers;
CREATE POLICY "suppliers_select_role"
  ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "products_select_auth" ON public.products;
CREATE POLICY "products_select_role"
  ON public.products FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

DROP POLICY IF EXISTS "categories_select_auth" ON public.categories;
CREATE POLICY "categories_select_role"
  ON public.categories FOR SELECT TO authenticated
  USING (public.has_any_active_role(auth.uid()));

-- 6) Tighten permissive writes on KOT and restaurant tables (was WITH CHECK true / USING true).
DROP POLICY IF EXISTS "kot write auth" ON public.kot_tickets;
CREATE POLICY "kot_tickets_insert_role"
  ON public.kot_tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]));

DROP POLICY IF EXISTS "kot update auth" ON public.kot_tickets;
CREATE POLICY "kot_tickets_update_role"
  ON public.kot_tickets FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]));

DROP POLICY IF EXISTS "koti write auth" ON public.kot_items;
CREATE POLICY "kot_items_insert_role"
  ON public.kot_items FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]));

DROP POLICY IF EXISTS "koti update auth" ON public.kot_items;
CREATE POLICY "kot_items_update_role"
  ON public.kot_items FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]));

DROP POLICY IF EXISTS "tables write auth" ON public.restaurant_tables;
CREATE POLICY "restaurant_tables_insert_role"
  ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['manager','owner','store_manager','super_admin']::app_role[]));

DROP POLICY IF EXISTS "tables update auth" ON public.restaurant_tables;
CREATE POLICY "restaurant_tables_update_role"
  ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['cashier','manager','owner','store_manager','staff','super_admin']::app_role[]));
