
-- Create payments table with provider-agnostic design
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  internal_order_id TEXT NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_mode TEXT, -- upi, card, netbanking, wallet etc
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, expired, refunded
  webhook_verified BOOLEAN NOT NULL DEFAULT false,
  business_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  provider_data JSONB, -- raw provider response
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Indexes for fast lookups
CREATE INDEX idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX idx_payments_store_id ON public.payments(store_id);
CREATE INDEX idx_payments_business_date ON public.payments(business_date);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_internal_order_id ON public.payments(internal_order_id);

-- RLS Policies
CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage payments in their stores"
  ON public.payments FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));

CREATE POLICY "Staff can view payments in their store"
  ON public.payments FOR SELECT
  USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Staff can create payments in their store"
  ON public.payments FOR INSERT
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
