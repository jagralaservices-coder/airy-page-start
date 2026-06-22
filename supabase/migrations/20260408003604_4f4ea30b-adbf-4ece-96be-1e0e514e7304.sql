-- Credit Ledger table
CREATE TABLE public.credit_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  bill_number TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all credit_ledger" ON public.credit_ledger FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage credit_ledger in their stores" ON public.credit_ledger FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage credit_ledger in their store" ON public.credit_ledger FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Credit Payments table
CREATE TABLE public.credit_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID NOT NULL REFERENCES public.credit_ledger(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all credit_payments" ON public.credit_payments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage credit_payments in their stores" ON public.credit_payments FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage credit_payments in their store" ON public.credit_payments FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Delivery Assignments table
CREATE TABLE public.delivery_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_boy_name TEXT NOT NULL,
  delivery_boy_phone TEXT,
  status TEXT NOT NULL DEFAULT 'preparing',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all delivery_assignments" ON public.delivery_assignments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage delivery_assignments in their stores" ON public.delivery_assignments FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage delivery_assignments in their store" ON public.delivery_assignments FOR ALL
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_credit_ledger_updated_at BEFORE UPDATE ON public.credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_assignments_updated_at BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();