
-- Categories table per store
CREATE TABLE public.store_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  name text NOT NULL,
  name_hindi text,
  icon text NOT NULL DEFAULT '📦',
  color text NOT NULL DEFAULT 'cat-food',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, category_id)
);

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all categories" ON public.store_categories FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage categories in their stores" ON public.store_categories FOR ALL TO public USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid()))) WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage categories in their store" ON public.store_categories FOR ALL TO public USING (store_id = get_user_store_id(auth.uid())) WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Bill counters table per store per day
CREATE TABLE public.bill_counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  counter_date date NOT NULL DEFAULT CURRENT_DATE,
  bill_counter integer NOT NULL DEFAULT 0,
  kot_counter integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, counter_date)
);

ALTER TABLE public.bill_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all counters" ON public.bill_counters FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage counters in their stores" ON public.bill_counters FOR ALL TO public USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid()))) WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage counters in their store" ON public.bill_counters FOR ALL TO public USING (store_id = get_user_store_id(auth.uid())) WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Function to atomically increment bill counter
CREATE OR REPLACE FUNCTION public.increment_bill_counter(p_store_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_counter integer;
BEGIN
  INSERT INTO public.bill_counters (store_id, counter_date, bill_counter, kot_counter)
  VALUES (p_store_id, p_date, 1, 0)
  ON CONFLICT (store_id, counter_date)
  DO UPDATE SET bill_counter = bill_counters.bill_counter + 1, updated_at = now()
  RETURNING bill_counter INTO new_counter;
  RETURN new_counter;
END;
$$;

-- Function to atomically increment KOT counter
CREATE OR REPLACE FUNCTION public.increment_kot_counter(p_store_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_counter integer;
BEGIN
  INSERT INTO public.bill_counters (store_id, counter_date, bill_counter, kot_counter)
  VALUES (p_store_id, p_date, 0, 1)
  ON CONFLICT (store_id, counter_date)
  DO UPDATE SET kot_counter = bill_counters.kot_counter + 1, updated_at = now()
  RETURNING kot_counter INTO new_counter;
  RETURN new_counter;
END;
$$;
