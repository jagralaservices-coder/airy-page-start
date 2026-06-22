
-- ============ feature_catalog ============
CREATE TABLE IF NOT EXISTS public.feature_catalog (
  feature_key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  price_yearly numeric NOT NULL DEFAULT 0,
  included_in text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_catalog TO authenticated, anon;
GRANT ALL ON public.feature_catalog TO service_role;

ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_catalog readable by all"
  ON public.feature_catalog FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "feature_catalog admin manage"
  ON public.feature_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_feature_catalog_updated_at
  BEFORE UPDATE ON public.feature_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ merchant_addons ============
CREATE TABLE IF NOT EXISTS public.merchant_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.feature_catalog(feature_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  price_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, feature_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_addons TO authenticated;
GRANT ALL ON public.merchant_addons TO service_role;

ALTER TABLE public.merchant_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own addons"
  ON public.merchant_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.customer_id = merchant_addons.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners manage own addons"
  ON public.merchant_addons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role = 'owner'
        AND ur.customer_id = merchant_addons.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role = 'owner'
        AND ur.customer_id = merchant_addons.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_merchant_addons_updated_at
  BEFORE UPDATE ON public.merchant_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ merchant_custom_plan ============
CREATE TABLE IF NOT EXISTS public.merchant_custom_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_custom_plan TO authenticated;
GRANT ALL ON public.merchant_custom_plan TO service_role;

ALTER TABLE public.merchant_custom_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own custom plan"
  ON public.merchant_custom_plan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.customer_id = merchant_custom_plan.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners manage own custom plan"
  ON public.merchant_custom_plan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role = 'owner'
        AND ur.customer_id = merchant_custom_plan.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role = 'owner'
        AND ur.customer_id = merchant_custom_plan.merchant_id
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_merchant_custom_plan_updated_at
  BEFORE UPDATE ON public.merchant_custom_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Seed feature_catalog ============
INSERT INTO public.feature_catalog (feature_key, label, category, price_yearly, included_in) VALUES
  -- Sales & Billing
  ('billing_pos', 'Billing & KOT', 'sales', 0, ARRAY['basic','gold','platinum']),
  ('gst_invoice', 'GST Invoice', 'sales', 0, ARRAY['basic','gold','platinum']),
  ('multiple_payments', 'Multiple Payment Option', 'sales', 0, ARRAY['basic','gold','platinum']),
  ('dine_in', 'Dine-In', 'sales', 999, ARRAY['gold','platinum']),
  ('takeaway', 'Takeaway', 'sales', 499, ARRAY['gold','platinum']),
  ('delivery', 'Delivery', 'sales', 999, ARRAY['gold','platinum']),
  ('kot_system', 'KOT System', 'sales', 999, ARRAY['gold','platinum']),
  ('kot_listing', 'KOT Listing', 'sales', 499, ARRAY['gold','platinum']),
  ('kot_print', 'KOT Print', 'sales', 499, ARRAY['gold','platinum']),
  ('kot_search', 'KOT Search', 'sales', 299, ARRAY['gold','platinum']),
  ('qr_orders', 'QR Orders', 'sales', 1499, ARRAY['gold','platinum']),
  ('qr_menu_ordering', 'QR Menu Ordering', 'sales', 999, ARRAY['gold','platinum']),

  -- Inventory
  ('basic_inventory', 'Basic Inventory', 'inventory', 0, ARRAY['basic','gold','platinum']),
  ('manual_stock_update', 'Manual Stock Update', 'inventory', 0, ARRAY['basic','gold','platinum']),
  ('full_inventory', 'Full Inventory Management', 'inventory', 1499, ARRAY['gold','platinum']),
  ('recipe_management', 'Recipe Management', 'inventory', 1999, ARRAY['platinum']),
  ('recipe_auto_deduction', 'Recipe Based Auto Deduction', 'inventory', 1499, ARRAY['platinum']),
  ('auto_stock_requirement', 'Auto Stock Requirement (AI)', 'inventory', 2499, ARRAY['platinum']),
  ('smart_inventory_ai', 'Smart Inventory AI Prediction', 'inventory', 2999, ARRAY['platinum']),
  ('purchase_orders', 'Purchase Orders', 'inventory', 1499, ARRAY['platinum']),
  ('auto_purchase_orders', 'Auto Purchase Orders', 'inventory', 1999, ARRAY['platinum']),

  -- Staff & HR
  ('staff_management', 'Staff Management', 'staff', 1499, ARRAY['gold','platinum']),
  ('face_attendance', 'Face Verification Attendance', 'staff', 999, ARRAY['gold','platinum']),
  ('geo_fencing', 'Geo Fencing', 'staff', 799, ARRAY['gold','platinum']),
  ('delivery_boys', 'Delivery Boys Management', 'staff', 999, ARRAY['gold','platinum']),
  ('team_chat', 'Team Chat', 'staff', 499, ARRAY['gold','platinum']),
  ('workforce_analytics', 'Workforce Analytics', 'staff', 2499, ARRAY['platinum']),

  -- Customer
  ('customer_management', 'Customer Management', 'customer', 0, ARRAY['basic','gold','platinum']),
  ('credit_ledger', 'Credit Ledger', 'customer', 0, ARRAY['basic','gold','platinum']),

  -- Reports (basic 3 included in basic; others paid)
  ('rpt_category_summary', 'Category Summary', 'reports', 0, ARRAY['basic','gold','platinum']),
  ('rpt_item_summary', 'Item Summary', 'reports', 0, ARRAY['basic','gold','platinum']),
  ('rpt_sales_summary', 'Sales Summary', 'reports', 0, ARRAY['basic','gold','platinum']),
  ('rpt_order_summary', 'Order Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_executive_sales', 'Executive Sales', 'reports', 499, ARRAY['gold','platinum']),
  ('rpt_employee_summary', 'Employee Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_group_summary', 'Group Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_variation_summary', 'Variation Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_cover_size_summary', 'Cover Size Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_tip_summary', 'Tip Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_counter_summary', 'Counter Summary', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_expense_tracker', 'Expense Tracker', 'reports', 499, ARRAY['gold','platinum']),
  ('rpt_due_payment', 'Due Payment', 'reports', 0, ARRAY['basic','gold','platinum']),
  ('rpt_cash_flow', 'Cash Flow', 'reports', 499, ARRAY['gold','platinum']),
  ('rpt_withdrawal', 'Withdrawal', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_cash_topup', 'Cash Top-Up', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_profit_loss', 'Profit & Loss', 'reports', 999, ARRAY['platinum']),
  ('rpt_sales_trend', 'Sales Trend', 'reports', 499, ARRAY['platinum']),
  ('rpt_hourly', 'Hourly Report', 'reports', 299, ARRAY['platinum']),
  ('rpt_customers', 'Customers Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_tables', 'Tables Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_orders', 'Orders Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_payment', 'Payment Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_discount', 'Discount Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_loss_control', 'Loss Control Report', 'reports', 499, ARRAY['platinum']),
  ('rpt_tax_gst', 'Tax / GST Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_items', 'Items Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_retention', 'Retention Report', 'reports', 499, ARRAY['platinum']),
  ('rpt_targets', 'Targets Report', 'reports', 499, ARRAY['platinum']),
  ('rpt_kitchen', 'Kitchen Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_delivery', 'Delivery Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_invoices', 'Invoices Report', 'reports', 299, ARRAY['gold','platinum']),
  ('rpt_outlets', 'Outlets Report', 'reports', 499, ARRAY['platinum']),

  -- Operations
  ('table_management', 'Table Management', 'operations', 999, ARRAY['gold','platinum']),
  ('live_view', 'Live View', 'operations', 1499, ARRAY['gold','platinum']),
  ('tax_engine', 'Tax Engine', 'operations', 999, ARRAY['gold','platinum']),

  -- Delivery
  ('delivery_tracking', 'Delivery Tracking', 'delivery', 1999, ARRAY['platinum']),

  -- AI & Automation
  ('alerts_notifications', 'Alerts & Notifications', 'ai', 499, ARRAY['platinum']),
  ('ai_stock_requirement', 'AI Stock Requirement', 'ai', 1999, ARRAY['platinum']),
  ('ai_insights', 'AI Smart Insights', 'ai', 2999, ARRAY['platinum']),
  ('dynamic_pricing', 'Dynamic Pricing', 'ai', 1999, ARRAY['platinum']),
  ('revenue_forecast', 'Revenue Forecast', 'ai', 1999, ARRAY['platinum']),
  ('multi_outlet', 'Multi Outlet', 'operations', 4999, ARRAY['platinum']),
  ('advanced_reports', 'Advanced Reports Bundle', 'reports', 2499, ARRAY['gold','platinum'])
ON CONFLICT (feature_key) DO UPDATE
  SET label = EXCLUDED.label,
      category = EXCLUDED.category,
      price_yearly = EXCLUDED.price_yearly,
      included_in = EXCLUDED.included_in;

-- ============ Helper function: merged feature set ============
CREATE OR REPLACE FUNCTION public.get_merchant_features(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN ARRAY[]::text[];
  END IF;

  SELECT plan_name::text, expiry_date, status
    INTO v_plan, v_expiry, v_status
    FROM public.merchant_subscription
   WHERE merchant_id = v_merchant;

  IF v_plan IS NULL OR v_status <> 'active' OR v_expiry < now() THEN
    v_plan := 'basic';
  END IF;

  -- Plan-included features
  SELECT COALESCE(array_agg(feature_key), ARRAY[]::text[])
    INTO v_features
    FROM public.feature_catalog
   WHERE v_plan = ANY(included_in) AND is_active = true;

  -- Active addons
  SELECT COALESCE(array_agg(feature_key), ARRAY[]::text[])
    INTO v_addons
    FROM public.merchant_addons
   WHERE merchant_id = v_merchant
     AND enabled = true
     AND expiry_date >= now();

  -- Custom plan (only if active)
  SELECT COALESCE(features, ARRAY[]::text[])
    INTO v_custom
    FROM public.merchant_custom_plan
   WHERE merchant_id = v_merchant AND is_active = true;

  RETURN ARRAY(SELECT DISTINCT unnest(v_features || v_addons || COALESCE(v_custom, ARRAY[]::text[])));
END;
$$;

-- Seed an empty custom_plan row for each existing merchant
INSERT INTO public.merchant_custom_plan (merchant_id, features, is_active, total_price)
SELECT m.id, ARRAY[]::text[], false, 0
  FROM public.merchants m
  LEFT JOIN public.merchant_custom_plan cp ON cp.merchant_id = m.id
 WHERE cp.id IS NULL;
