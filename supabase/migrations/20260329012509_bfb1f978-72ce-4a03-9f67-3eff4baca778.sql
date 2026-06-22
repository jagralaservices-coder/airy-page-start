-- Allow owners to view profiles of users in their customer group
CREATE POLICY "Owners can view staff profiles"
ON public.profiles
FOR SELECT
USING (
  is_owner(auth.uid()) AND id IN (
    SELECT ur.user_id FROM public.user_roles ur
    WHERE ur.customer_id = get_user_customer_id(auth.uid())
    AND ur.is_active = true
  )
);

-- Allow store managers to view profiles of staff in their store
CREATE POLICY "Store managers can view staff profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT ur.user_id FROM public.user_roles ur
    WHERE ur.store_id = get_user_store_id(auth.uid())
    AND ur.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles mgr
    WHERE mgr.user_id = auth.uid()
    AND mgr.role = 'store_manager'
    AND mgr.is_active = true
  )
);