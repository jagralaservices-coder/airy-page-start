import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth, type UserRole } from '@/contexts/SupabaseAuthContext';

interface Props {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * RequireRole - 403 guard.
 * Requires the user to hold at least one of the supplied roles.
 */
export default function RequireRole({ children, roles, fallback, redirectTo }: Props) {
  const { isAuthenticated, isLoading, hasRole } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (!hasRole(roles)) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-3xl font-bold">403</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
