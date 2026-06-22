-- 1. Add super_admin to user_role ENUM
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Update is_admin function to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role IN ('admin', 'super_admin') AND is_active = true
  );
$$;

-- 3. Update master account to super_admin (jagralasalman786@gmail.com)
DO $$
DECLARE
    master_uid UUID;
BEGIN
    SELECT id INTO master_uid FROM public.profiles WHERE email = 'jagralasalman786@gmail.com' LIMIT 1;
    IF master_uid IS NOT NULL THEN
        UPDATE public.user_roles SET role = 'super_admin' WHERE user_id = master_uid AND role = 'admin';
    END IF;
END $$;

-- 4. Add approval_status to stores and user_roles
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS approved_by UUID;
CREATE INDEX IF NOT EXISTS idx_stores_approval_status ON public.stores(approval_status);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved_by UUID;
CREATE INDEX IF NOT EXISTS idx_user_roles_approval_status ON public.user_roles(approval_status);
