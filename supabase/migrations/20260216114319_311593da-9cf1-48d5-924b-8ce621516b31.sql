
-- POS Customers (billing contacts for each store)
CREATE TABLE public.pos_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all pos_customers" ON public.pos_customers FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage pos_customers in their stores" ON public.pos_customers FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage pos_customers in their store" ON public.pos_customers FOR ALL 
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Advance Requests
CREATE TABLE public.advance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all advance_requests" ON public.advance_requests FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage advance_requests in their stores" ON public.advance_requests FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage advance_requests in their store" ON public.advance_requests FOR ALL 
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Leave Requests
CREATE TABLE public.leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all leave_requests" ON public.leave_requests FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage leave_requests in their stores" ON public.leave_requests FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage leave_requests in their store" ON public.leave_requests FOR ALL 
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Staff Notifications
CREATE TABLE public.staff_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id text,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all staff_notifications" ON public.staff_notifications FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage staff_notifications in their stores" ON public.staff_notifications FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can manage staff_notifications in their store" ON public.staff_notifications FOR ALL 
  USING (store_id = get_user_store_id(auth.uid()))
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Staff Schedules
CREATE TABLE public.staff_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  date date NOT NULL,
  shift text NOT NULL DEFAULT 'morning',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all staff_schedules" ON public.staff_schedules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Owners can manage staff_schedules in their stores" ON public.staff_schedules FOR ALL 
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.customer_id = get_user_customer_id(auth.uid())));
CREATE POLICY "Staff can view staff_schedules in their store" ON public.staff_schedules FOR SELECT 
  USING (store_id = get_user_store_id(auth.uid()));

-- Add update triggers
CREATE TRIGGER update_pos_customers_updated_at BEFORE UPDATE ON public.pos_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advance_requests_updated_at BEFORE UPDATE ON public.advance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON public.staff_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
