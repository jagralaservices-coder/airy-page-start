
-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.stores_safe;

CREATE VIEW public.stores_safe 
WITH (security_invoker = true)
AS
SELECT id, customer_id, store_name, address, phone, store_code, 
       latitude, longitude, is_active, created_at, updated_at
FROM public.stores;

GRANT SELECT ON public.stores_safe TO authenticated;
GRANT SELECT ON public.stores_safe TO anon;
