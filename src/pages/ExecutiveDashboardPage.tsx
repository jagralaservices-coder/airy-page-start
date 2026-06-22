import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Inbox, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const ExecutiveDashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState({ revenue: 0, orders: 0, customers: 0, avgOrder: 0 });
  const [trend, setTrend] = useState<Array<{ month: string; value: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const [orders, customers] = await Promise.all([
        supabase.from('orders').select('total, created_at').gte('created_at', since).limit(20000),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);
      if (cancelled) return;
      const all = (orders.data ?? []) as any[];
      const revenue = all.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const byMonth = new Map<string, number>();
      all.forEach((o) => {
        const m = (o.created_at ?? '').slice(0, 7);
        if (!m) return;
        byMonth.set(m, (byMonth.get(m) ?? 0) + Number(o.total ?? 0));
      });
      setTrend(
        Array.from(byMonth.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([m, value]) => ({ month: m.slice(5), value }))
      );
      setKpis({
        revenue,
        orders: all.length,
        customers: customers.count ?? 0,
        avgOrder: all.length ? revenue / all.length : 0,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Executive Dashboard
              <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="w-3.5 h-3.5" /></Button>
            </h1>
            <p className="text-xs text-muted-foreground">MAXORA • Strategic</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Revenue (180d)</p>
            <p className="text-3xl font-bold mt-1">₹{kpis.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Orders</p>
            <p className="text-2xl font-bold mt-1">{kpis.orders.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Customers</p>
            <p className="text-2xl font-bold mt-1">{kpis.customers.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Order Value</p>
            <p className="text-2xl font-bold mt-1">₹{kpis.avgOrder.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Revenue by Month</p>
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="h-44">
            {trend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Inbox className="w-8 h-8 mb-1" />
                <p className="text-xs">No revenue data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">AI Strategic Insights</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">AI insights will appear once enough operational data is available.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboardPage;
