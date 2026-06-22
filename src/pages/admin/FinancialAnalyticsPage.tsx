import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function FinancialAnalyticsPage() {
  const [paymentData, setPaymentData] = useState<Array<{ name: string; value: number }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ date: string; revenue: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [pays, ords] = await Promise.all([
        supabase.from('payments').select('method, amount').gte('created_at', since).limit(10000),
        supabase.from('orders').select('total, created_at').gte('created_at', since).limit(10000),
      ]);
      if (cancelled) return;

      const methods = new Map<string, number>();
      (pays.data ?? []).forEach((p: any) => {
        const name = (p.method ?? 'other').toString();
        methods.set(name, (methods.get(name) ?? 0) + Number(p.amount ?? 0));
      });
      setPaymentData(Array.from(methods.entries()).map(([name, value]) => ({ name, value })));

      const byDay = new Map<string, number>();
      (ords.data ?? []).forEach((o: any) => {
        const d = (o.created_at ?? '').slice(0, 10);
        if (!d) return;
        byDay.set(d, (byDay.get(d) ?? 0) + Number(o.total ?? 0));
      });
      setRevenueSeries(
        Array.from(byDay.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, revenue]) => ({ date: date.slice(5), revenue }))
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const EmptyChart = ({ label }: { label: string }) => (
    <div className="h-full flex flex-col items-center justify-center text-gray-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Financial Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live revenue, cash flow, and payment methods.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
          <CardHeader><CardTitle>Payment Methods (30d)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {paymentData.length === 0 ? <EmptyChart label="No payment data yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
          <CardHeader><CardTitle>Cash Flow Trend (30d)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {revenueSeries.length === 0 ? <EmptyChart label="No revenue data yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
