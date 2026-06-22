-- Create orders table to track all sales with status
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine-in',
  table_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  container_charge NUMERIC NOT NULL DEFAULT 0,
  tip NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage orders in their stores"
ON public.orders FOR ALL
USING (store_id IN (
  SELECT id FROM stores WHERE customer_id = get_user_customer_id(auth.uid())
));

CREATE POLICY "Store managers can manage orders in their store"
ON public.orders FOR ALL
USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Allow order operations for active stores"
ON public.orders FOR ALL
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.is_active = true
));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_bill_number ON public.orders(bill_number);