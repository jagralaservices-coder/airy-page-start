import { ReactNode } from 'react';
import { useSupabaseAuth, type UserRole } from '@/contexts/SupabaseAuthContext';

interface Props {
  children: ReactNode;
  roles?: UserRole[];
  /** Custom predicate evaluated against the role string */
  predicate?: (role: UserRole | null) => boolean;
  fallback?: ReactNode;
}

/**
 * PermissionGuard - inline conditional renderer (no redirect).
 * Use to hide/show UI fragments (buttons, menu items) based on role/permission.
 */
export default function PermissionGuard({ children, roles, predicate, fallback = null }: Props) {
  const { userRole, hasRole } = useSupabaseAuth();
  const role = (userRole?.role as UserRole | undefined) ?? null;

  const allowed =
    (roles && roles.length > 0 ? hasRole(roles) : true) &&
    (predicate ? predicate(role) : true);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
