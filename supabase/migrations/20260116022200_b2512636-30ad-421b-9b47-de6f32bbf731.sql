-- Create table for menu item variations (e.g., Water: 500ml ₹10, 1L ₹20)
CREATE TABLE public.menu_item_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "500ml", "1L", "Small", "Large"
  sku TEXT, -- Stock Keeping Unit code
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER, -- Optional stock tracking per variation
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add SKU column to menu_items table
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS sku TEXT;

-- Enable Row Level Security
ALTER TABLE public.menu_item_variations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for variations (inherit from parent menu_item)
CREATE POLICY "Admins can manage all variations" 
ON public.menu_item_variations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Staff can manage variations in their store" 
ON public.menu_item_variations 
FOR ALL 
USING (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE store_id = get_user_store_id(auth.uid())
  )
)
WITH CHECK (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE store_id = get_user_store_id(auth.uid())
  )
);

CREATE POLICY "Owners can manage variations in their stores" 
ON public.menu_item_variations 
FOR ALL 
USING (
  menu_item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN stores s ON mi.store_id = s.id
    WHERE s.customer_id = get_user_customer_id(auth.uid())
  )
)
WITH CHECK (
  menu_item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN stores s ON mi.store_id = s.id
    WHERE s.customer_id = get_user_customer_id(auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_menu_item_variations_menu_item_id ON public.menu_item_variations(menu_item_id);
CREATE INDEX idx_menu_items_sku ON public.menu_items(sku) WHERE sku IS NOT NULL;