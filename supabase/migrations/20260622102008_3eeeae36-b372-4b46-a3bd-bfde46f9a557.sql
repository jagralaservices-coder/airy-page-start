REVOKE ALL ON FUNCTION public.can_manage_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_customer_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_customer_id(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_any_active_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_active_role(uuid) TO authenticated, service_role;