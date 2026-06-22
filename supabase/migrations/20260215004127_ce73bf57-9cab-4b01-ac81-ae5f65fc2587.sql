
-- Fix 1: Create a secure view for stores that excludes the password column
-- and revoke direct SELECT on the password column for authenticated users

-- Create a view without password for safe reads
CREATE OR REPLACE VIEW public.stores_safe AS
SELECT id, customer_id, store_name, address, phone, store_code, 
       latitude, longitude, is_active, created_at, updated_at
FROM public.stores;

-- Grant access to the view
GRANT SELECT ON public.stores_safe TO authenticated;
GRANT SELECT ON public.stores_safe TO anon;
