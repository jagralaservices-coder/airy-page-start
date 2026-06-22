-- Add unit column to menu_item_variations table
ALTER TABLE public.menu_item_variations 
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';

COMMENT ON COLUMN public.menu_item_variations.unit IS 'Unit of measurement: g, ml, ltr, kg, pcs, etc.';