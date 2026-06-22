
-- 1. Create the handle_new_user trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create a delete-store function for cascade cleanup
CREATE OR REPLACE FUNCTION public.delete_store_cascade(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_ids uuid[];
BEGIN
  -- Collect staff user_ids linked to this store
  SELECT ARRAY_AGG(user_id) INTO v_user_ids
  FROM user_roles
  WHERE store_id = p_store_id AND role IN ('staff', 'store_manager');

  -- Delete user_roles for this store
  DELETE FROM user_roles WHERE store_id = p_store_id;

  -- Delete store-related data
  DELETE FROM orders WHERE store_id = p_store_id;
  DELETE FROM menu_items WHERE store_id = p_store_id;
  DELETE FROM inventory_items WHERE store_id = p_store_id;
  DELETE FROM expenses WHERE store_id = p_store_id;
  DELETE FROM store_settings WHERE store_id = p_store_id;
  DELETE FROM store_categories WHERE store_id = p_store_id;
  DELETE FROM staff_attendance WHERE store_id = p_store_id;
  DELETE FROM staff_notifications WHERE store_id = p_store_id;
  DELETE FROM staff_schedules WHERE store_id = p_store_id;
  DELETE FROM bill_counters WHERE store_id = p_store_id;
  DELETE FROM held_bills WHERE store_id = p_store_id;
  DELETE FROM pos_customers WHERE store_id = p_store_id;
  DELETE FROM payments WHERE store_id = p_store_id;
  DELETE FROM payment_disputes WHERE store_id = p_store_id;
  DELETE FROM payment_settlements WHERE store_id = p_store_id;
  DELETE FROM online_orders WHERE store_id = p_store_id;
  DELETE FROM advance_requests WHERE store_id = p_store_id;
  DELETE FROM leave_requests WHERE store_id = p_store_id;

  -- Delete the store itself
  DELETE FROM stores WHERE id = p_store_id;
END;
$$;
