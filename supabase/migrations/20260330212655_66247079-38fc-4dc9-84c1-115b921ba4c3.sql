
CREATE OR REPLACE FUNCTION public.delete_store_cascade(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete payments
  DELETE FROM public.payments WHERE store_id = p_store_id;
  -- Delete payment_disputes
  DELETE FROM public.payment_disputes WHERE store_id = p_store_id;
  -- Delete payment_settlements
  DELETE FROM public.payment_settlements WHERE store_id = p_store_id;
  -- Delete orders
  DELETE FROM public.orders WHERE store_id = p_store_id;
  -- Delete online_orders
  DELETE FROM public.online_orders WHERE store_id = p_store_id;
  -- Delete held_bills
  DELETE FROM public.held_bills WHERE store_id = p_store_id;
  -- Delete bill_counters
  DELETE FROM public.bill_counters WHERE store_id = p_store_id;
  -- Delete expenses
  DELETE FROM public.expenses WHERE store_id = p_store_id;
  -- Delete staff_attendance
  DELETE FROM public.staff_attendance WHERE store_id = p_store_id;
  -- Delete staff_schedules
  DELETE FROM public.staff_schedules WHERE store_id = p_store_id;
  -- Delete staff_notifications
  DELETE FROM public.staff_notifications WHERE store_id = p_store_id;
  -- Delete advance_requests
  DELETE FROM public.advance_requests WHERE store_id = p_store_id;
  -- Delete leave_requests
  DELETE FROM public.leave_requests WHERE store_id = p_store_id;
  -- Delete pos_customers
  DELETE FROM public.pos_customers WHERE store_id = p_store_id;
  -- Delete store_settings
  DELETE FROM public.store_settings WHERE store_id = p_store_id;
  -- Delete store_categories
  DELETE FROM public.store_categories WHERE store_id = p_store_id;
  -- Delete menu_item_variations (via menu_items)
  DELETE FROM public.menu_item_variations WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);
  -- Delete menu_item_ingredients (via menu_items)
  DELETE FROM public.menu_item_ingredients WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);
  -- Delete menu_items
  DELETE FROM public.menu_items WHERE store_id = p_store_id;
  -- Delete inventory_items
  DELETE FROM public.inventory_items WHERE store_id = p_store_id;
  -- Delete user_roles
  DELETE FROM public.user_roles WHERE store_id = p_store_id;
  -- Delete the store
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$$;
