-- Add reference code to customers table for easy search
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE;

-- Create function to generate unique 8-digit reference code
CREATE OR REPLACE FUNCTION public.generate_customer_ref_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CUS' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.ref_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate ref_code on insert
DROP TRIGGER IF EXISTS set_customer_ref_code ON public.customers;
CREATE TRIGGER set_customer_ref_code
BEFORE INSERT ON public.customers
FOR EACH ROW
WHEN (NEW.ref_code IS NULL)
EXECUTE FUNCTION public.generate_customer_ref_code();

-- Update existing customers with ref_code
UPDATE public.customers 
SET ref_code = 'CUS' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0')
WHERE ref_code IS NULL;

-- Create store_settings table for feature toggles per store
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT 'true'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, setting_key)
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_settings
CREATE POLICY "Admins can manage all store settings"
ON public.store_settings FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Owners can manage their store settings"
ON public.store_settings FOR ALL
USING (store_id IN (
  SELECT s.id FROM stores s 
  WHERE s.customer_id = get_user_customer_id(auth.uid())
))
WITH CHECK (store_id IN (
  SELECT s.id FROM stores s 
  WHERE s.customer_id = get_user_customer_id(auth.uid())
));

-- Update trigger for store_settings
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();