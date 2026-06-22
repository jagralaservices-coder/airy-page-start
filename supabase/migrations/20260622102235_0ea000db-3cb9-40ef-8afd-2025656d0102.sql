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
    JOIN public.stores s ON s.id = _store_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (
        ur.role IN ('super_admin', 'admin')
        OR s.owner_id = auth.uid()
        OR (ur.role IN ('owner', 'merchant', 'manager') AND ur.merchant_id IS NOT NULL AND ur.merchant_id = s.merchant_id)
        OR (ur.role IN ('owner', 'merchant', 'manager') AND ur.customer_id IS NOT NULL AND ur.customer_id = s.customer_id)
        OR (ur.role IN ('store_manager', 'staff', 'cashier') AND ur.store_id = _store_id)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid) TO authenticated, service_role;