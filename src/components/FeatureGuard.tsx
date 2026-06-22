import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface FeatureGuardProps {
  featureKey: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ featureKey, children, redirectTo = '/upgrade-plan' }) => {
  const { canAccess, loading, requiresUpgrade } = useSubscription();

  if (loading) return null;

  if (!canAccess(featureKey)) {
    const needed = requiresUpgrade(featureKey);
    return <Navigate to={redirectTo} replace state={{ feature: featureKey, requiredPlan: needed }} />;
  }

  return <>{children}</>;
};
