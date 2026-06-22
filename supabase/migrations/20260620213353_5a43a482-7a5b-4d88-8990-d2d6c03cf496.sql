CREATE OR REPLACE FUNCTION public.delete_store_cascade(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE store_id = p_store_id;
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_store_cascade(uuid) TO service_role;