import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Lock, Check, Clock, Sparkles, Users, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useFeatureAccess } from '@/contexts/FeatureAccessContext';
import {
  FEATURE_CATALOG, CATEGORY_LABEL, getFeaturesForPlan, getCatalogByCategory,
  priceFor, type FeatureCategory,
} from '@/lib/featureCatalog';
import { toast } from 'sonner';

/**
 * Merchant-facing Addons catalog.
 * Merchants can ONLY view + request — admin must approve before activation.
 */
const AddonsMarketplacePage: React.FC = () => {
  const { user, customer, userRole } = useSupabaseAuth();
  const { plan, allowedFeatures } = useFeatureAccess();
  const merchantId = customer?.id || (userRole as any)?.customer_id || (userRole as any)?.merchant_id;
  const planFeatures = useMemo(() => getFeaturesForPlan(plan), [plan]);

  const [pendingByFeature, setPendingByFeature] = useState<Set<string>>(new Set());
  const [pendingStaff, setPendingStaff] = useState(false);
  const [pendingOutlet, setPendingOutlet] = useState(false);
  const [staffQty, setStaffQty] = useState(1);
  const [outletQty, setOutletQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const refreshPending = async () => {
    if (!merchantId) return;
    const { data } = await (supabase as any).from('subscription_requests')
      .select('request_type, requested_feature, status')
      .eq('merchant_id', merchantId).eq('status', 'pending');
    const set = new Set<string>();
    let s = false, o = false;
    (data || []).forEach((r: any) => {
      if (r.request_type === 'addon' && r.requested_feature) set.add(r.requested_feature);
      if (r.request_type === 'extra_staff') s = true;
      if (r.request_type === 'extra_outlet') o = true;
    });
    setPendingByFeature(set);
    setPendingStaff(s); setPendingOutlet(o);
  };

  useEffect(() => { refreshPending(); }, [merchantId]);

  const grouped = useMemo(() => getCatalogByCategory(), []);

  const submit = async (payload: any, onDone?: () => void) => {
    if (!user || !merchantId) return toast.error('Sign in required');
    setBusy(true);
    try {
      const { error } = await (supabase as any).from('subscription_requests').insert({
        merchant_id: merchantId, requested_by: user.id, status: 'pending', ...payload,
      });
      if (error) throw error;
      toast.success('Request sent — your admin will review it');
      onDone?.();
      refreshPending();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not submit request');
    } finally {
      setBusy(false);
    }
  };

  const requestAddon = (feature_key: string) =>
    submit({ request_type: 'addon', requested_feature: feature_key });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Addons Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan: <Badge variant="secondary" className="ml-1">{plan.toUpperCase()}</Badge> —
            features included in your plan are locked. Request any extra feature and your admin will activate it.
          </p>
        </div>

        {/* Extra capacity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Extra Capacity</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Extra Staff Seats</div>
                  <div className="text-xs text-muted-foreground">Above your plan limit</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={staffQty} onChange={(e) => setStaffQty(Math.max(1, +e.target.value || 1))} className="w-16" />
                {pendingStaff ? (
                  <Button size="sm" disabled variant="secondary"><Clock className="w-4 h-4 mr-1" /> Pending</Button>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => submit({ request_type: 'extra_staff', quantity: staffQty })}>Request</Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Extra Outlets</div>
                  <div className="text-xs text-muted-foreground">Above your plan limit</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={outletQty} onChange={(e) => setOutletQty(Math.max(1, +e.target.value || 1))} className="w-16" />
                {pendingOutlet ? (
                  <Button size="sm" disabled variant="secondary"><Clock className="w-4 h-4 mr-1" /> Pending</Button>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => submit({ request_type: 'extra_outlet', quantity: outletQty })}>Request</Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Feature catalog */}
        {(Object.keys(grouped) as FeatureCategory[]).map((cat) => (
          <Card key={cat} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{CATEGORY_LABEL[cat]}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[cat].map((f) => {
                const includedInPlan = planFeatures.has(f.key);
                const isActive = allowedFeatures.has(f.key);
                const isPending = pendingByFeature.has(f.key);
                return (
                  <div key={f.key} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{f.label}</div>
                      <div className="text-xs text-muted-foreground">₹{priceFor([f.key]).toLocaleString()} / year</div>
                    </div>
                    <div className="shrink-0">
                      {includedInPlan ? (
                        <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Included</Badge>
                      ) : isActive ? (
                        <Badge className="bg-green-600 hover:bg-green-700"><Check className="w-3 h-3 mr-1" /> Active</Badge>
                      ) : isPending ? (
                        <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => requestAddon(f.key)}>
                          Request
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <p className="text-center text-xs text-muted-foreground">
          All activations are manual. Your admin will process requests from the admin panel.
        </p>
      </div>
    </div>
  );
};

export default AddonsMarketplacePage;
