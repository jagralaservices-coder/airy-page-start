
-- Fix: Recreate stores_safe view with SECURITY INVOKER
DROP VIEW IF EXISTS public.stores_safe;
CREATE VIEW public.stores_safe
WITH (security_invoker = true)
AS
SELECT id, customer_id, store_name, address, phone, store_code, 
       latitude, longitude, is_active, business_type, country, 
       currency_code, tax_type, tax_percentage,
       created_at, updated_at
FROM public.stores;
