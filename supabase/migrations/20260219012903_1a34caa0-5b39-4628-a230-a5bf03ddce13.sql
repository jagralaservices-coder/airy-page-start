
-- Case-insensitive index on menu_items.sku for barcode lookup
CREATE INDEX IF NOT EXISTS idx_menu_items_sku_lower ON public.menu_items (lower(sku));

-- Case-insensitive index on menu_item_variations.sku for barcode lookup
CREATE INDEX IF NOT EXISTS idx_menu_item_variations_sku_lower ON public.menu_item_variations (lower(sku));

-- Unique constraint: one SKU per store (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_sku_per_store ON public.menu_items (store_id, lower(sku)) WHERE sku IS NOT NULL AND sku != '';

-- Unique constraint: one variation SKU per menu item (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_variation_sku ON public.menu_item_variations (menu_item_id, lower(sku)) WHERE sku IS NOT NULL AND sku != '';
