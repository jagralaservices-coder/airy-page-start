-- 1. Drop foreign keys without cascade delete and recreate them with ON DELETE CASCADE

-- For payments:
ALTER TABLE ONLY public.payments
  DROP CONSTRAINT IF EXISTS payments_store_id_fkey,
  ADD CONSTRAINT payments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- For payment_disputes:
ALTER TABLE ONLY public.payment_disputes
  DROP CONSTRAINT IF EXISTS payment_disputes_store_id_fkey,
  ADD CONSTRAINT payment_disputes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS payment_disputes_payment_id_fkey,
  ADD CONSTRAINT payment_disputes_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

-- For payment_settlements:
ALTER TABLE ONLY public.payment_settlements
  DROP CONSTRAINT IF EXISTS payment_settlements_store_id_fkey,
  ADD CONSTRAINT payment_settlements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- For expenses:
ALTER TABLE ONLY public.expenses
  DROP CONSTRAINT IF EXISTS expenses_store_id_fkey,
  ADD CONSTRAINT expenses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- For inventory_items:
ALTER TABLE ONLY public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_store_id_fkey,
  ADD CONSTRAINT inventory_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- For held_bills:
ALTER TABLE ONLY public.held_bills
  DROP CONSTRAINT IF EXISTS held_bills_store_id_fkey,
  ADD CONSTRAINT held_bills_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


-- 2. Recreate get_owner_connected_records_count RPC function
CREATE OR REPLACE FUNCTION public.get_owner_connected_records_count(p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stores_count integer;
  v_staff_count integer;
  v_products_count integer;
  v_orders_count integer;
  v_customers_count integer;
  v_expenses_count integer;
  v_credits_count integer;
  v_total integer;
BEGIN
  -- Stores
  SELECT COUNT(*)::integer INTO v_stores_count FROM public.stores WHERE customer_id = p_customer_id;
  
  -- Staff/Roles
  SELECT COUNT(*)::integer INTO v_staff_count FROM public.user_roles WHERE customer_id = p_customer_id;
  
  -- Products
  SELECT COUNT(*)::integer INTO v_products_count FROM public.menu_items WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id);
  
  -- Orders (regular + online + QR)
  SELECT (
    (SELECT COUNT(*) FROM public.orders WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id)) +
    (SELECT COUNT(*) FROM public.online_orders WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id)) +
    (SELECT COUNT(*) FROM public.qr_orders WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id))
  )::integer INTO v_orders_count;
  
  -- Customers
  SELECT COUNT(*)::integer INTO v_customers_count FROM public.pos_customers WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id);
  
  -- Expenses
  SELECT COUNT(*)::integer INTO v_expenses_count FROM public.expenses WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id);
  
  -- Credits
  SELECT COUNT(*)::integer INTO v_credits_count FROM public.credit_ledger WHERE store_id IN (SELECT id FROM public.stores WHERE customer_id = p_customer_id);
  
  -- Total sum of all these
  v_total := v_stores_count + v_staff_count + v_products_count + v_orders_count + v_customers_count + v_expenses_count + v_credits_count;
  
  RETURN json_build_object(
    'stores', v_stores_count,
    'staff', v_staff_count,
    'products', v_products_count,
    'orders', v_orders_count,
    'customers', v_customers_count,
    'expenses', v_expenses_count,
    'credits', v_credits_count,
    'total', v_total
  );
END;
$$;


-- 3. Recreate public.delete_store_cascade to include newer tables
CREATE OR REPLACE FUNCTION public.delete_store_cascade(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete chat media, messages, participants (conversations deleted, message cascade will handle)
  DELETE FROM public.chat_conversations WHERE store_id = p_store_id;

  -- Delete whatsapp config
  DELETE FROM public.store_whatsapp_config WHERE store_id = p_store_id;

  -- Delete delivery assignments
  DELETE FROM public.delivery_assignments WHERE store_id = p_store_id;

  -- Delete credit payments & ledger
  DELETE FROM public.credit_payments WHERE store_id = p_store_id;
  DELETE FROM public.credit_ledger WHERE store_id = p_store_id;

  -- Delete QR orders
  DELETE FROM public.qr_orders WHERE store_id = p_store_id;

  -- Delete purchase recommendations
  DELETE FROM public.purchase_recommendations WHERE store_id = p_store_id;

  -- Delete payments, disputes, settlements
  DELETE FROM public.payment_disputes WHERE store_id = p_store_id;
  DELETE FROM public.payment_settlements WHERE store_id = p_store_id;
  DELETE FROM public.payments WHERE store_id = p_store_id;

  -- Delete orders and online_orders
  DELETE FROM public.online_orders WHERE store_id = p_store_id;
  DELETE FROM public.orders WHERE store_id = p_store_id;

  -- Delete held bills & bill counters
  DELETE FROM public.held_bills WHERE store_id = p_store_id;
  DELETE FROM public.bill_counters WHERE store_id = p_store_id;

  -- Delete expenses
  DELETE FROM public.expenses WHERE store_id = p_store_id;

  -- Delete staff-related records
  DELETE FROM public.staff_attendance WHERE store_id = p_store_id;
  DELETE FROM public.staff_schedules WHERE store_id = p_store_id;
  DELETE FROM public.staff_notifications WHERE store_id = p_store_id;
  DELETE FROM public.advance_requests WHERE store_id = p_store_id;
  DELETE FROM public.leave_requests WHERE store_id = p_store_id;

  -- Delete pos customers
  DELETE FROM public.pos_customers WHERE store_id = p_store_id;

  -- Delete store settings & categories
  DELETE FROM public.store_settings WHERE store_id = p_store_id;
  DELETE FROM public.store_categories WHERE store_id = p_store_id;

  -- Delete menu items variations, ingredients, and menu items
  DELETE FROM public.menu_item_variations WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);
  DELETE FROM public.menu_item_ingredients WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);
  DELETE FROM public.menu_items WHERE store_id = p_store_id;

  -- Delete inventory items
  DELETE FROM public.inventory_items WHERE store_id = p_store_id;

  -- Delete user roles for this store
  DELETE FROM public.user_roles WHERE store_id = p_store_id;

  -- Delete the store itself
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$$;


-- 4. Protection triggers for jagralasalman786@gmail.com

-- Trigger function for customers protection
CREATE OR REPLACE FUNCTION public.protect_primary_admin_customers()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.owner_email = 'jagralasalman786@gmail.com') THEN
    RAISE EXCEPTION 'The primary admin customer account (jagralasalman786@gmail.com) cannot be deleted.';
  ELSIF (TG_OP = 'UPDATE' AND OLD.owner_email = 'jagralasalman786@gmail.com') THEN
    IF (NEW.is_active = false OR NEW.approval_status = 'suspended' OR NEW.approval_status = 'rejected') THEN
      RAISE EXCEPTION 'The primary admin account cannot be disabled, suspended, or rejected.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_protect_customers_admin
BEFORE UPDATE OR DELETE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_admin_customers();


-- Trigger function for user_roles protection
CREATE OR REPLACE FUNCTION public.protect_primary_admin_roles()
RETURNS TRIGGER AS $$
DECLARE
  v_email text;
BEGIN
  -- Resolve email of the user
  SELECT email INTO v_email FROM auth.users WHERE id = OLD.user_id;
  IF v_email = 'jagralasalman786@gmail.com' THEN
    IF (TG_OP = 'DELETE') THEN
      RAISE EXCEPTION 'Roles for the primary admin account cannot be deleted.';
    ELSIF (TG_OP = 'UPDATE') THEN
      IF (NEW.is_active = false OR NEW.role != 'admin') THEN
        RAISE EXCEPTION 'The primary admin roles cannot be disabled or downgraded.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_protect_user_roles_admin
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_admin_roles();


-- Trigger function for profiles protection
CREATE OR REPLACE FUNCTION public.protect_primary_admin_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.email = 'jagralasalman786@gmail.com') THEN
    RAISE EXCEPTION 'The primary admin profile (jagralasalman786@gmail.com) cannot be deleted.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_protect_profiles_admin
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_admin_profiles();


-- Trigger function for auth.users protection
CREATE OR REPLACE FUNCTION public.protect_primary_admin_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.email = 'jagralasalman786@gmail.com') THEN
    RAISE EXCEPTION 'The primary admin auth user (jagralasalman786@gmail.com) cannot be deleted.';
  ELSIF (TG_OP = 'UPDATE' AND OLD.email = 'jagralasalman786@gmail.com' AND (NEW.banned_until IS NOT NULL OR NEW.email_confirmed_at IS NULL)) THEN
    NEW.banned_until := NULL;
    NEW.email := 'jagralasalman786@gmail.com';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_protect_auth_admin
BEFORE UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_admin_auth();
