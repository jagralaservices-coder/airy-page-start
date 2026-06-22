import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { _featureAccessSnapshot } from '@/contexts/FeatureAccessContext';
import { resolveFeatureKey } from '@/lib/featureCatalog';
import {
  SubscriptionTier,
  BusinessType,
  AddonKey,
  FEATURES,
  BASIC_REPORT_PATHS,
  hasFeatureAccess,
  meetsMinTier,
  getTierLimits,
  getTierLabel,
} from '@/lib/subscriptionConfig';


export function useSubscription() {
  const { customer, userRole } = useSupabaseAuth();
  const [tier, setTier] = useState<SubscriptionTier>('basic');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [enabledAddons, setEnabledAddons] = useState<string[]>([]);
  const [staffLimit, setStaffLimit] = useState(2);
  const [outletLimit, setOutletLimit] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      const tierMap: Record<string, SubscriptionTier> = {
        basic: 'basic',
        pro: 'gold',
        gold: 'gold',
        enterprise: 'platinum',
        platinum: 'platinum',
      };

      // Super_admin / admin always platinum
      if (userRole?.role === 'super_admin' || userRole?.role === 'admin') {
        setTier('platinum');
        setStaffLimit(999);
        setOutletLimit(999);
        setLoading(false);
        return;
      }

      // Resolve merchant id from various sources
      let merchantId: string | null = customer?.id || (userRole as any)?.customer_id || (userRole as any)?.merchant_id || null;
      if (!merchantId) {
        try {
          const storeData = localStorage.getItem('pos_active_store_data');
          if (storeData) {
            const parsed = JSON.parse(storeData);
            merchantId = parsed?.customer_id || parsed?.merchant_id || null;
            if (parsed?.business_type) setBusinessType(parsed.business_type as BusinessType);
          }
        } catch {}
      }

      // Priority 1: merchant_subscription table (authoritative)
      if (merchantId) {
        try {
          const { data: sub } = await (supabase as any)
            .from('merchant_subscription')
            .select('plan_name, staff_limit, outlet_limit, extra_staff, extra_outlets, expiry_date, status')
            .eq('merchant_id', merchantId)
            .maybeSingle();

          if (sub) {
            const expired = sub.status !== 'active' || (sub.expiry_date && new Date(sub.expiry_date) < new Date());
            const effective: SubscriptionTier = expired ? 'basic' : (tierMap[sub.plan_name] || 'basic');
            setTier(effective);
            setStaffLimit((sub.staff_limit || 0) + (sub.extra_staff || 0));
            setOutletLimit((sub.outlet_limit || 1) + (sub.extra_outlets || 0));
            try { localStorage.setItem('maxora.plan.v1', JSON.stringify({ tier: effective, staffLimit: sub.staff_limit, outletLimit: sub.outlet_limit })); } catch {}

            // Business type from merchant/store
            const { data: m } = await supabase.from('merchants').select('business_type').eq('id', merchantId).maybeSingle();
            if (m?.business_type) setBusinessType(m.business_type as BusinessType);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[useSubscription] merchant_subscription fetch failed', e);
        }

        // Priority 2: fall back to merchants table
        const { data: m } = await supabase
          .from('merchants')
          .select('subscription_tier, subscription_plan, business_type')
          .eq('id', merchantId)
          .maybeSingle();
        if (m) {
          const planKey = (m as any).subscription_tier || (m as any).subscription_plan || 'basic';
          setTier(tierMap[planKey] || 'basic');
          setBusinessType(((m as any).business_type as BusinessType) || 'restaurant');
        }
      }

      // Priority 3: localStorage store data (store-login fallback)
      try {
        const storeData = localStorage.getItem('pos_active_store_data');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          if (parsed?.subscription_tier) {
            setTier(tierMap[parsed.subscription_tier] || 'basic');
          }
        }
      } catch {}

      setLoading(false);
    };

    fetchTier();
  }, [customer, userRole]);

  const limits = useMemo(() => {
    const baseLimits = getTierLimits(tier, businessType);
    return {
      maxStaff: Math.max(baseLimits.maxStaff, staffLimit),
      maxOutlets: Math.max(baseLimits.maxOutlets, outletLimit),
      maxReports: baseLimits.maxReports,
    };
  }, [tier, businessType, staffLimit, outletLimit]);

  const canAccess = useCallback((featureKey: string): boolean => {
    // Admins bypass all gates
    if (userRole?.role === 'admin' || userRole?.role === 'super_admin') return true;
    // Primary: FeatureAccessContext snapshot (plan + addons + custom plan merged)
    const snap = _featureAccessSnapshot();
    if (snap.isAdmin) return true;
    if (snap.allowed && snap.allowed.size > 0) {
      const resolved = resolveFeatureKey(featureKey);
      if (snap.allowed.has(resolved) || snap.allowed.has(featureKey)) return true;
      // fall through to legacy tier check as a safety net (won't grant more than tier allows)
    }
    return hasFeatureAccess(tier, businessType, featureKey, enabledAddons);
  }, [tier, businessType, enabledAddons, userRole]);

  const canAccessReport = useCallback((reportPath: string): boolean => {
    if (userRole?.role === 'admin' || userRole?.role === 'super_admin') return true;
    if (meetsMinTier(tier, 'gold')) return true;
    // For basic tier, check specific report feature keys
    const reportFeatureMap: Record<string, string> = {
      '/reports/order-summary': 'orderSummaryReport',
      '/reports/executive-sales': 'executiveSaleReport',
      '/reports/employee-summary': 'employeeSummaryReport',
      '/reports/group-summary': 'groupSummaryReport',
      '/reports/variation-summary': 'variationSummaryReport',
      '/reports/cover-size-summary': 'coverSizeSummaryReport',
      '/reports/tip-summary': 'tipSummaryReport',
      '/reports/counter-summary': 'counterSummaryReport',
    };
    const featureKey = reportFeatureMap[reportPath];
    if (featureKey) {
      return hasFeatureAccess(tier, businessType, featureKey, enabledAddons);
    }
    // Only allow explicitly listed basic report paths
    return BASIC_REPORT_PATHS.includes(reportPath);
  }, [tier, userRole, businessType, enabledAddons]);

  const requiresUpgrade = useCallback((featureKey: string): SubscriptionTier | null => {
    if (canAccess(featureKey)) return null;
    const feature = FEATURES[featureKey];
    if (!feature) return null;
    return businessType === 'restaurant' ? feature.restaurant : feature.retail;
  }, [canAccess, businessType]);

  return {
    tier,
    businessType,
    enabledAddons,
    loading,
    limits,
    canAccess,
    canAccessReport,
    requiresUpgrade,
    tierLabel: getTierLabel(tier),
    isGold: meetsMinTier(tier, 'gold'),
    isPlatinum: meetsMinTier(tier, 'platinum'),
    // backward compat
    isPro: meetsMinTier(tier, 'gold'),
    isEnterprise: meetsMinTier(tier, 'platinum'),
  };
}
