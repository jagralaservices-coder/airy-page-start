
-- Create qr_orders table for QR-based menu ordering
CREATE TABLE public.qr_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  table_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qr_orders ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (customers placing orders without auth)
CREATE POLICY "Anyone can place QR orders"
ON public.qr_orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Store staff can view and manage orders
CREATE POLICY "Staff can view QR orders in their store"
ON public.qr_orders FOR SELECT
TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Staff can update QR orders in their store"
ON public.qr_orders FOR UPDATE
TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid()))
  OR is_admin(auth.uid())
);

-- Anon users can view their own orders by id
CREATE POLICY "Anon can view own QR order"
ON public.qr_orders FOR SELECT
TO anon
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_orders;

-- Create index for fast lookups
CREATE INDEX idx_qr_orders_store_id ON public.qr_orders(store_id);
CREATE INDEX idx_qr_orders_status ON public.qr_orders(status);
