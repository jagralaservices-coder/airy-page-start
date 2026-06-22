-- Update all existing 'admin' roles to 'super_admin' to reflect the true hierarchy
UPDATE public.user_roles
SET role = 'super_admin'
WHERE role = 'admin';
