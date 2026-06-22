-- Add pending approval fields to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Create index for faster pending approvals query
CREATE INDEX IF NOT EXISTS idx_customers_approval_status ON public.customers(approval_status);

-- Update RLS policy for customers to allow pending signups to insert their own record
DROP POLICY IF EXISTS "Allow pending owner signup" ON public.customers;
CREATE POLICY "Allow pending owner signup" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

-- Allow users to view their own pending approval
DROP POLICY IF EXISTS "Users can view own customer record" ON public.customers;
CREATE POLICY "Users can view own customer record" 
ON public.customers 
FOR SELECT 
USING (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_admin(auth.uid())
  OR id = get_user_customer_id(auth.uid())
);