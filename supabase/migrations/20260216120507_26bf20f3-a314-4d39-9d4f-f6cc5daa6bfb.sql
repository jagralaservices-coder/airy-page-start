-- Add unique constraint on store_id + setting_key for upsert support
ALTER TABLE public.store_settings 
ADD CONSTRAINT store_settings_store_id_setting_key_unique 
UNIQUE (store_id, setting_key);

-- Allow staff to read settings for their store (needed for store-login sessions)
CREATE POLICY "Staff can view settings in their store"
ON public.store_settings
FOR SELECT
USING (store_id = get_user_store_id(auth.uid()));

-- Allow staff to manage settings in their store
CREATE POLICY "Staff can manage settings in their store"
ON public.store_settings
FOR ALL
USING (store_id = get_user_store_id(auth.uid()))
WITH CHECK (store_id = get_user_store_id(auth.uid()));