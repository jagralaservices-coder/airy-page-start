import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  FEATURE_CATALOG,
  getFeaturesForPlan,
  resolveFeatureKey,
  PlanName,
} from '@/lib/featureCatalog';

interface FeatureAccessState {
  loading: boolean;
  plan: PlanName;
  allowedFeatures: Set<string>;
  staffLimit: number;
  outletLimit: number;
  isAdmin: boolean;
  hasFeature: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const FeatureAccessContext = createContext<FeatureAccessState | undefined>(undefined);

// Module-level snapshot — accessible from hooks that can't easily consume context.
let snapshotAllowed: Set<string> = new Set();
let snapshotIsAdmin = false;
export function _featureAccessSnapshot() {
  return { allowed: snapshotAllowed, isAdmin: snapshotIsAdmin };
}

const CACHE_KEY = 'maxora.features.v1';

export const FeatureAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole, customer } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanName>('basic');
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());
  const [staffLimit, setStaffLimit] = useState(0);
  const [outletLimit, setOutletLimit] = useState(1);

  const isAdmin = userRole?.role === 'super_admin' || userRole?.role === 'admin';

  const merchantId = useMemo(() => {
    if (customer?.id) return customer.id;
    if ((userRole as any)?.customer_id) return (userRole as any).customer_id;
    if ((userRole as any)?.merchant_id) return (userRole as any).merchant_id;
    try {
      const sd = localStorage.getItem('pos_active_store_data');
      if (sd) {
        const p = JSON.parse(sd);
        return p?.customer_id || p?.merchant_id || null;
      }
    } catch {}
    return null;
  }, [customer, userRole]);

  const compute = useCallback(async () => {
    setLoading(true);

    // Admins → all features
    if (isAdmin) {
      const all = new Set(FEATURE_CATALOG.map(f => f.key));
      setAllowedFeatures(all);
      setPlan('platinum');
      setStaffLimit(999);
      setOutletLimit(999);
      snapshotAllowed = all;
      snapshotIsAdmin = true;
      setLoading(false);
      return;
    }
    snapshotIsAdmin = false;

    // Hydrate from cache while DB fetch runs
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.allowed)) {
          setAllowedFeatures(new Set(parsed.allowed));
          if (parsed.plan) setPlan(parsed.plan);
          if (parsed.staffLimit != null) setStaffLimit(parsed.staffLimit);
          if (parsed.outletLimit != null) setOutletLimit(parsed.outletLimit);
        }
      }
    } catch {}

    if (!merchantId || !user) {
      // No merchant: only show free/basic features as a safe baseline if signed in;
      // otherwise empty.
      const baseline = user ? getFeaturesForPlan('basic') : new Set<string>();
      setAllowedFeatures(baseline);
      snapshotAllowed = baseline;
      setLoading(false);
      return;
    }

    try {
      const [subRes, addonsRes, customRes] = await Promise.all([
        (supabase as any).from('merchant_subscription')
          .select('plan_name, staff_limit, outlet_limit, extra_staff, extra_outlets, expiry_date, status')
          .eq('merchant_id', merchantId).maybeSingle(),
        (supabase as any).from('merchant_addons')
          .select('feature_key, enabled, expiry_date')
          .eq('merchant_id', merchantId),
        (supabase as any).from('merchant_custom_plan')
          .select('features, is_active')
          .eq('merchant_id', merchantId).maybeSingle(),
      ]);

      const sub = subRes.data;
      const expired = !sub || sub.status !== 'active' || (sub.expiry_date && new Date(sub.expiry_date) < new Date());
      const effectivePlan: PlanName = expired ? 'basic' : (sub.plan_name as PlanName);
      setPlan(effectivePlan);
      setStaffLimit(((sub?.staff_limit) || 0) + ((sub?.extra_staff) || 0));
      setOutletLimit(((sub?.outlet_limit) || 1) + ((sub?.extra_outlets) || 0));

      const planFeatures = getFeaturesForPlan(effectivePlan);

      const now = Date.now();
      const addonKeys = (addonsRes.data || [])
        .filter((a: any) => a.enabled && new Date(a.expiry_date).getTime() >= now)
        .map((a: any) => a.feature_key);

      const customKeys = (customRes.data?.is_active ? customRes.data.features : []) || [];

      const merged = new Set<string>([...planFeatures, ...addonKeys, ...customKeys]);
      setAllowedFeatures(merged);
      snapshotAllowed = merged;

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          plan: effectivePlan,
          allowed: Array.from(merged),
          staffLimit: ((sub?.staff_limit) || 0) + ((sub?.extra_staff) || 0),
          outletLimit: ((sub?.outlet_limit) || 1) + ((sub?.extra_outlets) || 0),
        }));
      } catch {}
    } catch (e) {
      console.warn('[FeatureAccess] fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, merchantId, user]);

  useEffect(() => {
    compute();
  }, [compute]);

  // Realtime: when admin changes plan/addons/custom plan, this merchant's UI updates instantly.
  useEffect(() => {
    if (!merchantId || isAdmin) return;
    const ch = (supabase as any)
      .channel(`features-${merchantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_subscription', filter: `merchant_id=eq.${merchantId}` }, () => compute())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_addons', filter: `merchant_id=eq.${merchantId}` }, () => compute())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_custom_plan', filter: `merchant_id=eq.${merchantId}` }, () => compute())
      .subscribe();
    // Cross-tab sync: when another tab clears/updates the cache key
    const onStorage = (e: StorageEvent) => { if (e.key === 'maxora.features.v1') compute(); };
    window.addEventListener('storage', onStorage);
    return () => {
      try { (supabase as any).removeChannel(ch); } catch {}
      window.removeEventListener('storage', onStorage);
    };
  }, [merchantId, isAdmin, compute]);

  const hasFeature = useCallback((key: string) => {
    if (isAdmin) return true;
    const resolved = resolveFeatureKey(key);
    return allowedFeatures.has(resolved) || allowedFeatures.has(key);
  }, [allowedFeatures, isAdmin]);

  const value: FeatureAccessState = {
    loading,
    plan,
    allowedFeatures,
    staffLimit,
    outletLimit,
    isAdmin,
    hasFeature,
    refresh: compute,
  };

  return <FeatureAccessContext.Provider value={value}>{children}</FeatureAccessContext.Provider>;
};

export function useFeatureAccess() {
  const ctx = useContext(FeatureAccessContext);
  if (!ctx) {
    // Safe defaults when provider not mounted yet
    return {
      loading: true,
      plan: 'basic' as PlanName,
      allowedFeatures: new Set<string>(),
      staffLimit: 0,
      outletLimit: 1,
      isAdmin: false,
      hasFeature: (_k: string) => false,
      refresh: async () => {},
    } as FeatureAccessState;
  }
  return ctx;
}
