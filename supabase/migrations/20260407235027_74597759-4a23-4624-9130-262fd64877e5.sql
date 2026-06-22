
-- Table to store AI-generated purchase recommendations
CREATE TABLE public.purchase_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  inventory_item_id TEXT,
  product_name TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  avg_daily_sales NUMERIC NOT NULL DEFAULT 0,
  predicted_demand_7d NUMERIC NOT NULL DEFAULT 0,
  suggested_quantity NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'low_stock',
  category TEXT DEFAULT 'normal',
  days_until_stockout NUMERIC,
  trend TEXT DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'pending',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_period_start DATE,
  analysis_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all recommendations"
  ON public.purchase_recommendations FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage recommendations in their stores"
  ON public.purchase_recommendations FOR ALL
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));

CREATE POLICY "Staff can view recommendations in their store"
  ON public.purchase_recommendations FOR SELECT
  USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Staff can insert recommendations in their store"
  ON public.purchase_recommendations FOR INSERT
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

CREATE TRIGGER update_purchase_recommendations_updated_at
  BEFORE UPDATE ON public.purchase_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_purchase_recommendations_store_id ON public.purchase_recommendations(store_id);
CREATE INDEX idx_purchase_recommendations_generated_at ON public.purchase_recommendations(generated_at DESC);
