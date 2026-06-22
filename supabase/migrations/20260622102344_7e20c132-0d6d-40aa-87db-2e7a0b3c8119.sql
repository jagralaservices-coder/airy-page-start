ALTER TABLE public.menu_items
  ALTER COLUMN linked_inventory_id TYPE text USING linked_inventory_id::text;

ALTER TABLE public.menu_item_ingredients
  ALTER COLUMN inventory_item_id TYPE text USING inventory_item_id::text;