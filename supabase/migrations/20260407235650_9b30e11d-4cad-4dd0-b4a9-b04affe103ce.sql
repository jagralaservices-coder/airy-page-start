
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that checks which stores need analysis today and triggers it
CREATE OR REPLACE FUNCTION public.run_scheduled_inventory_analysis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
  current_dow TEXT;
  func_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get current day of week as text (0=Sunday, 6=Saturday)
  current_dow := EXTRACT(DOW FROM now())::TEXT;

  -- Get Supabase URL and anon key from vault or hardcode for internal use
  func_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Loop through stores that have auto analysis enabled for today
  FOR rec IN
    SELECT ss.store_id
    FROM public.store_settings ss
    WHERE ss.setting_key = 'smart_inventory_auto'
      AND (ss.setting_value->>'enabled')::boolean = true
      AND ss.setting_value->>'day' = current_dow
  LOOP
    BEGIN
      -- Call the edge function via pg_net
      PERFORM net.http_post(
        url := func_url || '/functions/v1/smart-inventory-analysis',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object('store_id', rec.store_id::text)
      );

      RAISE LOG 'Smart inventory analysis triggered for store: %', rec.store_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error triggering inventory analysis for store %: %', rec.store_id, SQLERRM;
    END;
  END LOOP;
END;
$$;
