import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * RequireAuth - 401 guard.
 * Renders children only when an authenticated session exists.
 * Reads from SupabaseAuthContext (legacy source of truth) to avoid
 * dual-init issues during incremental Redux migration.
 */
export default function RequireAuth({ children, redirectTo = '/auth' }: Props) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
