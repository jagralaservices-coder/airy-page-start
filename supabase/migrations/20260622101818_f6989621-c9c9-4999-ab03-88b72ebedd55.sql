CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (
        ur.role IN ('super_admin', 'admin')
        OR (ur.role IN ('owner', 'merchant', 'manager') AND ur.merchant_id = (SELECT s.merchant_id FROM public.stores s WHERE s.id = _store_id))
        OR (ur.role IN ('store_manager', 'staff', 'cashier') AND ur.store_id = _store_id)
      )
  );
$$;

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_hindi text,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  is_available boolean NOT NULL DEFAULT true,
  preparation_time integer,
  stock numeric,
  image_url text,
  linked_inventory_id uuid,
  gramage_per_unit numeric NOT NULL DEFAULT 0,
  sku text,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_items_store_access" ON public.menu_items;
CREATE POLICY "menu_items_store_access"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id))
  WITH CHECK (public.can_manage_store(store_id));

CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  name text NOT NULL,
  name_hindi text,
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;
GRANT ALL ON public.store_categories TO service_role;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_categories_store_access" ON public.store_categories;
CREATE POLICY "store_categories_store_access"
  ON public.store_categories
  FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id))
  WITH CHECK (public.can_manage_store(store_id));

CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL,
  quantity_required numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_ingredients TO authenticated;
GRANT ALL ON public.menu_item_ingredients TO service_role;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_item_ingredients_store_access" ON public.menu_item_ingredients;
CREATE POLICY "menu_item_ingredients_store_access"
  ON public.menu_item_ingredients
  FOR ALL
  TO authenticated
  USING (public.can_manage_store((SELECT mi.store_id FROM public.menu_items mi WHERE mi.id = menu_item_id)))
  WITH CHECK (public.can_manage_store((SELECT mi.store_id FROM public.menu_items mi WHERE mi.id = menu_item_id)));

CREATE TABLE IF NOT EXISTS public.menu_item_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  stock numeric,
  sort_order integer NOT NULL DEFAULT 0,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_variations TO authenticated;
GRANT ALL ON public.menu_item_variations TO service_role;
ALTER TABLE public.menu_item_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_item_variations_store_access" ON public.menu_item_variations;
CREATE POLICY "menu_item_variations_store_access"
  ON public.menu_item_variations
  FOR ALL
  TO authenticated
  USING (public.can_manage_store((SELECT mi.store_id FROM public.menu_items mi WHERE mi.id = menu_item_id)))
  WITH CHECK (public.can_manage_store((SELECT mi.store_id FROM public.menu_items mi WHERE mi.id = menu_item_id)));

CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON public.menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_store_categories_store_id ON public.store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_item_id ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_variations_menu_item_id ON public.menu_item_variations(menu_item_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_categories_updated_at ON public.store_categories;
CREATE TRIGGER update_store_categories_updated_at
  BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_item_ingredients_updated_at ON public.menu_item_ingredients;
CREATE TRIGGER update_menu_item_ingredients_updated_at
  BEFORE UPDATE ON public.menu_item_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_item_variations_updated_at ON public.menu_item_variations;
CREATE TRIGGER update_menu_item_variations_updated_at
  BEFORE UPDATE ON public.menu_item_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();