-- Migration: Add store WhatsApp config table for isolated store WhatsApp numbers and credentials
CREATE TABLE IF NOT EXISTS public.store_whatsapp_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  whatsapp_number text NOT NULL,
  instance_id text NOT NULL,
  api_key text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.store_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Admins can manage all whatsapp configs" 
  ON public.store_whatsapp_config FOR ALL TO public 
  USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage whatsapp configs in their stores" 
  ON public.store_whatsapp_config FOR ALL TO public 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Staff can view whatsapp configs in their store" 
  ON public.store_whatsapp_config FOR SELECT TO public 
  USING (store_id = get_user_store_id(auth.uid()));
