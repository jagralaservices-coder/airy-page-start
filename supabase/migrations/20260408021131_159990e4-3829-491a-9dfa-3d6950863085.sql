
-- Add add-ons and limit overrides to customers table
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS enabled_addons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS staff_limit integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS outlet_limit integer NOT NULL DEFAULT 1;

-- Update subscription_tier default to 'basic' (already is, just ensuring consistency)
-- Update existing customers to have sensible defaults based on current tier
UPDATE public.customers SET 
  staff_limit = CASE 
    WHEN subscription_tier = 'enterprise' THEN 20
    WHEN subscription_tier = 'pro' THEN 10
    ELSE 2
  END,
  outlet_limit = CASE 
    WHEN subscription_tier = 'enterprise' THEN 2
    ELSE 1
  END
WHERE staff_limit = 2;
