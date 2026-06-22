
-- Add indexes on barcode and sku columns for fast lookup
CREATE INDEX IF NOT EXISTS idx_menu_items_barcode ON public.menu_items (barcode);
CREATE INDEX IF NOT EXISTS idx_menu_items_sku_lower ON public.menu_items (lower(sku));
CREATE INDEX IF NOT EXISTS idx_menu_item_variations_sku_lower ON public.menu_item_variations (lower(sku));
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON public.inventory_items (barcode);
