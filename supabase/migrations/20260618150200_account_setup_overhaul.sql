-- Add business_type to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'retail';

-- Add unique constraint to profiles phone to enforce 1 number = 1 account
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
