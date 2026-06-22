
-- Create payment_disputes table for dispute management
CREATE TABLE public.payment_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  raised_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all disputes"
ON public.payment_disputes FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage disputes in their stores"
ON public.payment_disputes FOR ALL
USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));

CREATE POLICY "Staff can view and create disputes in their store"
ON public.payment_disputes FOR SELECT
USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Staff can create disputes in their store"
ON public.payment_disputes FOR INSERT
WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payment_disputes_updated_at
BEFORE UPDATE ON public.payment_disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_settlements table for payout tracking
CREATE TABLE public.payment_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  settlement_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  fee NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_count INTEGER NOT NULL DEFAULT 0,
  settlement_date DATE,
  utr TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all settlements"
ON public.payment_settlements FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage settlements in their stores"
ON public.payment_settlements FOR ALL
USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));

CREATE POLICY "Staff can view settlements in their store"
ON public.payment_settlements FOR SELECT
USING (store_id = get_user_store_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payment_settlements_updated_at
BEFORE UPDATE ON public.payment_settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
