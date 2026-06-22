REVOKE ALL ON FUNCTION public.delete_store_cascade(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_store_cascade(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_store_cascade(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store_cascade(uuid) TO service_role;