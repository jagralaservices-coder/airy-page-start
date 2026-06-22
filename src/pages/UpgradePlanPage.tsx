import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Crown, Sparkles, ArrowLeft, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';

const PLAN_DETAILS = {
  basic: {
    label: 'Basic', price: '₹7,999 / year', color: 'text-slate-600', icon: Lock,
    features: ['Billing POS', 'GST Invoice', 'Multiple Payment Methods', 'Basic Inventory', 'Customer Management', 'Credit Ledger', 'Basic Reports'],
  },
  gold: {
    label: 'Gold', price: '₹14,999 / year', color: 'text-amber-600', icon: Crown,
    features: ['Everything in Basic', 'Dine-In / Takeaway / Delivery', 'QR Orders & KOT', 'Staff (10)', 'Face Attendance', 'Team Chat', 'Table Management', 'Advanced Reports'],
  },
  platinum: {
    label: 'Platinum', price: '₹24,999 / year', color: 'text-purple-600', icon: Sparkles,
    features: ['Everything in Gold', 'Recipe Management', 'Purchase Orders', 'Delivery Tracking', 'AI Inventory & Insights', 'Revenue Forecast', 'Dynamic Pricing', 'Workforce Analytics', 'Multi Outlet (2 outlets / 25 staff)'],
  },
} as const;

const UpgradePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tier, tierLabel } = useSubscription();
  const { user, customer, userRole } = useSupabaseAuth();
  const merchantId = customer?.id || (userRole as any)?.customer_id || (userRole as any)?.merchant_id;

  const featureKey = (location.state as any)?.feature as string | undefined;
  const requiredPlan = (location.state as any)?.requiredPlan as 'gold' | 'platinum' | undefined;

  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      const { data } = await (supabase as any).from('subscription_requests')
        .select('request_type, requested_plan, requested_feature, status')
        .eq('merchant_id', merchantId).eq('status', 'pending');
      const map: Record<string, boolean> = {};
      (data || []).forEach((r: any) => {
        if (r.request_type === 'plan_upgrade' && r.requested_plan) map[`plan:${r.requested_plan}`] = true;
        if (r.request_type === 'extra_staff') map['extra_staff'] = true;
        if (r.request_type === 'extra_outlet') map['extra_outlet'] = true;
      });
      setPending(map);
    })();
  }, [merchantId]);

  const submitRequest = async (payload: any, key: string) => {
    if (!user || !merchantId) return toast.error('Sign in required');
    setBusy(true);
    try {
      const { error } = await (supabase as any).from('subscription_requests').insert({
        merchant_id: merchantId,
        requested_by: user.id,
        status: 'pending',
        ...payload,
      });
      if (error) throw error;
      setPending((p) => ({ ...p, [key]: true }));
      toast.success('Request sent to admin for approval');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not submit request');
    } finally {
      setBusy(false);
    }
  };

  const requestPlan = (plan: 'gold' | 'platinum') =>
    submitRequest(
      { request_type: 'plan_upgrade', requested_plan: plan, message: featureKey ? `For feature: ${featureKey}` : null },
      `plan:${plan}`,
    );

  const requestExtra = (kind: 'extra_staff' | 'extra_outlet', qty = 1) =>
    submitRequest({ request_type: kind, quantity: qty }, kind);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upgrade your plan</h1>
          <p className="text-muted-foreground">
            You're on the <span className="font-semibold">{tierLabel}</span> plan. Submit a request — your admin will activate it for you.
            {featureKey && <> Requested for <code className="px-1 py-0.5 bg-muted rounded text-xs">{featureKey}</code>.</>}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {(['basic', 'gold', 'platinum'] as const).map((p) => {
            const detail = PLAN_DETAILS[p];
            const Icon = detail.icon;
            const isCurrent = tier === p;
            const isRecommended = requiredPlan === p || (!requiredPlan && p === 'gold');
            const isPending = pending[`plan:${p}`];
            return (
              <Card key={p} className={`p-6 relative ${isRecommended ? 'ring-2 ring-primary' : ''}`}>
                {isRecommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>
                )}
                <Icon className={`w-8 h-8 mb-3 ${detail.color}`} />
                <h3 className="text-xl font-bold">{detail.label}</h3>
                <div className="text-2xl font-bold mt-1 mb-4">{detail.price}</div>
                <ul className="space-y-2 text-sm mb-6">
                  {detail.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">Current Plan</Button>
                ) : p === 'basic' ? (
                  <Button disabled className="w-full" variant="outline">Contact Support</Button>
                ) : isPending ? (
                  <Button disabled className="w-full" variant="secondary">
                    <Clock className="w-4 h-4 mr-2" /> Request Pending
                  </Button>
                ) : (
                  <Button className="w-full" disabled={busy} onClick={() => requestPlan(p)}>
                    Request {detail.label}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Need extra capacity?</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Extra Staff Seat</div>
                <div className="text-xs text-muted-foreground">+1 staff above your plan limit</div>
              </div>
              {pending['extra_staff'] ? (
                <Button size="sm" disabled variant="secondary"><Clock className="w-4 h-4 mr-1" /> Pending</Button>
              ) : (
                <Button size="sm" disabled={busy} onClick={() => requestExtra('extra_staff')}>Request</Button>
              )}
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Extra Outlet</div>
                <div className="text-xs text-muted-foreground">+1 outlet above your plan limit</div>
              </div>
              {pending['extra_outlet'] ? (
                <Button size="sm" disabled variant="secondary"><Clock className="w-4 h-4 mr-1" /> Pending</Button>
              ) : (
                <Button size="sm" disabled={busy} onClick={() => requestExtra('extra_outlet')}>Request</Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          All activations are processed manually by your administrator. You'll be notified when approved.
        </p>
      </div>
    </div>
  );
};

export default UpgradePlanPage;
