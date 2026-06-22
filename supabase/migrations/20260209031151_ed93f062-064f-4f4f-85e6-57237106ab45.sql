
-- Add salary column to user_roles for staff salary tracking
ALTER TABLE public.user_roles ADD COLUMN salary numeric DEFAULT 0;
