
-- Create inventory_items table for cloud sync
CREATE TABLE public.inventory_items (
  id text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  min_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  cost_unit text DEFAULT 'pcs',
  production_yield numeric DEFAULT NULL,
  production_yield_unit text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id, store_id)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all inventory" ON public.inventory_items FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage inventory in their stores" ON public.inventory_items FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage inventory in their store" ON public.inventory_items FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Create expenses table for cloud sync
CREATE TABLE public.expenses (
  id text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  category text NOT NULL DEFAULT 'General',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date timestamp with time zone NOT NULL DEFAULT now(),
  paid_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id, store_id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all expenses" ON public.expenses FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage expenses in their stores" ON public.expenses FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage expenses in their store" ON public.expenses FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Create held_bills table for cloud sync
CREATE TABLE public.held_bills (
  id text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  items jsonb NOT NULL DEFAULT '[]',
  table_number integer,
  customer_name text,
  held_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id, store_id)
);

ALTER TABLE public.held_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all held bills" ON public.held_bills FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage held bills in their stores" ON public.held_bills FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage held bills in their store" ON public.held_bills FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
