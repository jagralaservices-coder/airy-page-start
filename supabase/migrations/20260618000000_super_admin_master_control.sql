-- Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NULL,
    plan_name TEXT NOT NULL DEFAULT 'Basic',
    subscription_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_end_date DATE NOT NULL,
    renewal_date DATE,
    remaining_days INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Expiring Soon, Expired, Trial
    auto_renewal BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Subscription History Table
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- Created, Renewed, Plan Changed, Suspended
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    previous_plan TEXT,
    new_plan TEXT,
    notes TEXT
);

-- Create Merchant Access Logs
CREATE TABLE IF NOT EXISTS public.merchant_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL, -- references auth.users
    merchant_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT,
    device TEXT,
    reason TEXT
);

-- Create Store Access Logs
CREATE TABLE IF NOT EXISTS public.store_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT,
    device TEXT,
    reason TEXT
);

-- Create Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- User who made the change (Super Admin or Merchant)
    action TEXT NOT NULL, -- UPDATE, INSERT, DELETE, IMPERSONATE
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    device TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies (Admins can do everything, Customers can read their own)
CREATE POLICY "Admins have full access to subscriptions" ON public.subscriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Customers can view their own subscriptions" ON public.subscriptions FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE owner_email = auth.jwt()->>'email')
);

-- Function to automatically calculate expiry and update statuses
CREATE OR REPLACE FUNCTION update_subscription_statuses()
RETURNS void AS $$
BEGIN
    -- Update remaining days
    UPDATE public.subscriptions
    SET remaining_days = GREATEST(0, (subscription_end_date - CURRENT_DATE)::integer);

    -- Update status based on remaining days
    UPDATE public.subscriptions
    SET status = CASE
        WHEN remaining_days = 0 THEN 'Expired'
        WHEN remaining_days <= 15 THEN 'Expiring Soon'
        ELSE status -- Keep existing (could be Trial or Active)
    END
    WHERE status != 'Suspended'; -- Don't change suspended accounts

    -- NOTE: Trial logic would be handled during subscription creation.
END;
$$ LANGUAGE plpgsql;

-- To make sure it runs daily, typically we would use pg_cron if enabled:
-- SELECT cron.schedule('0 0 * * *', $$SELECT update_subscription_statuses()$$);
-- Since we don't know if pg_cron is enabled in this instance, we will call this via an Edge Function or Application logic on first admin load.
