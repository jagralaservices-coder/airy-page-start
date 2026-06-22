
-- 1. Add business/locale fields to stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'restaurant',
ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'India',
ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tax_type text NOT NULL DEFAULT 'GST',
ADD COLUMN IF NOT EXISTS tax_percentage numeric NOT NULL DEFAULT 0;

-- 2. Add retail/batch fields to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS hsn_code text,
ADD COLUMN IF NOT EXISTS gst_percentage numeric NOT NULL DEFAULT 0;

-- 3. Add barcode field to menu_items for retail
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS barcode text;

-- 4. Create online_orders table for Swiggy/Zomato
CREATE TABLE IF NOT EXISTS public.online_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'swiggy',
  platform_order_id text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL DEFAULT 0,
  delivery_charge numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  net_receivable numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for online_orders
CREATE POLICY "Admins can manage all online_orders"
ON public.online_orders FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage online_orders in their stores"
ON public.online_orders FOR ALL
USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));

CREATE POLICY "Staff can manage online_orders in their store"
ON public.online_orders FOR ALL
USING (store_id = get_user_store_id(auth.uid()))
WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Indexes for online_orders
CREATE INDEX IF NOT EXISTS idx_online_orders_store_id ON public.online_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_platform_order_id ON public.online_orders(platform_order_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON public.online_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON public.online_orders(status);

-- Trigger for updated_at
CREATE TRIGGER update_online_orders_updated_at
BEFORE UPDATE ON public.online_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Update stores_safe view to include new columns
DROP VIEW IF EXISTS public.stores_safe;
CREATE VIEW public.stores_safe AS
SELECT id, customer_id, store_name, address, phone, store_code, 
       latitude, longitude, is_active, business_type, country, 
       currency_code, tax_type, tax_percentage,
       created_at, updated_at
FROM public.stores;

-- 6. Add subscription_tier to customers for plan enforcement
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'basic';
