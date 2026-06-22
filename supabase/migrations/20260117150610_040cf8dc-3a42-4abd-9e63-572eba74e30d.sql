-- Drop the problematic policy that queries auth.users directly
DROP POLICY IF EXISTS "Users can view own customer record" ON public.customers;

-- Create a new policy that doesn't require access to auth.users
-- Admins can view all customers
-- Others can only view their own customer via the get_user_customer_id function
CREATE POLICY "Users can view own customer record" 
ON public.customers 
FOR SELECT 
USING (
  is_admin(auth.uid())
  OR id = get_user_customer_id(auth.uid())
);