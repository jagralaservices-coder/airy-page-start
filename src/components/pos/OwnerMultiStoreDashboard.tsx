import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/contexts/LocaleContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, Loader2, Store, Trophy, BarChart3, TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

type DashPeriod = 'today' | 'week' | 'month';

interface StorePaymentSummary {
  store_id: string;
  store_name: string;
  totalCollected: number;
  transactionCount: number;
  successRate: number;
  refundedAmount: number;
  avgTransaction: number;
  pendingAmount: number;
  failedCount: number;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const OwnerMultiStoreDashboard: React.FC = () => {
  const { formatCurrency } = useLocale();
  const { userRole } = useSupabaseAuth();
  const [period, setPeriod] = useState<DashPeriod>('week');
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<StorePaymentSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandCount, setGrandCount] = useState(0);
  const [prevPeriodTotal, setPrevPeriodTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const customerId = userRole?.customer_id;
      if (!customerId) { setLoading(false); return; }

      const { data: stores } = await supabase
        .from('stores')
        .select('id, store_name')
        .eq('customer_id', customerId)
        .eq('is_active', true);

      if (!stores?.length) { setLoading(false); return; }

      const now = new Date();
      let startDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;
      
      if (period === 'today') {
        startDate = startOfDay(now);
        prevStartDate = startOfDay(subDays(now, 1));
        prevEndDate = startDate;
      } else if (period === 'week') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        prevStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        prevEndDate = startDate;
      } else {
        startDate = startOfMonth(now);
        prevStartDate = startOfMonth(subMonths(now, 1));
        prevEndDate = startDate;
      }

      const storeIds = stores.map(s => s.id);

      // Fetch current and previous period in parallel
      const [currentRes, prevRes] = await Promise.all([
        supabase.from('payments').select('store_id, amount, status')
          .in('store_id', storeIds)
          .gte('business_date', format(startDate, 'yyyy-MM-dd')),
        supabase.from('payments').select('store_id, amount, status')
          .in('store_id', storeIds)
          .gte('business_date', format(prevStartDate, 'yyyy-MM-dd'))
          .lt('business_date', format(prevEndDate, 'yyyy-MM-dd')),
      ]);

      const allPayments = currentRes.data || [];
      const prevPayments = prevRes.data || [];

      const prevTotal = prevPayments
        .filter(p => p.status === 'paid')
        .reduce((s, p) => s + Number(p.amount), 0);
      setPrevPeriodTotal(prevTotal);

      const summaries: StorePaymentSummary[] = stores.map(store => {
        const sp = allPayments.filter(p => p.store_id === store.id);
        const paid = sp.filter(p => p.status === 'paid');
        const refunded = sp.filter(p => p.status === 'refunded');
        const pending = sp.filter(p => p.status === 'pending');
        const failed = sp.filter(p => p.status === 'failed');
        const totalCollected = paid.reduce((s, p) => s + Number(p.amount), 0);
        return {
          store_id: store.id,
          store_name: store.store_name,
          totalCollected,
          transactionCount: paid.length,
          successRate: sp.length > 0 ? (paid.length / sp.length) * 100 : 0,
          refundedAmount: refunded.reduce((s, p) => s + Number(p.amount), 0),
          avgTransaction: paid.length > 0 ? totalCollected / paid.length : 0,
          pendingAmount: pending.reduce((s, p) => s + Number(p.amount), 0),
          failedCount: failed.length,
        };
      }).sort((a, b) => b.totalCollected - a.totalCollected);

      setStoreData(summaries);
      setGrandTotal(summaries.reduce((s, d) => s + d.totalCollected, 0));
      setGrandCount(summaries.reduce((s, d) => s + d.transactionCount, 0));
    } catch (err) {
      console.error('Multi-store fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period, userRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = storeData.map(s => ({
    name: s.store_name.length > 15 ? s.store_name.slice(0, 15) + '…' : s.store_name,
    collected: s.totalCollected,
    refunded: s.refundedAmount,
    pending: s.pendingAmount,
  }));

  const pieData = storeData.filter(s => s.totalCollected > 0).map(s => ({
    name: s.store_name,
    value: s.totalCollected,
  }));

  const topStore = storeData[0];
  const growthPct = prevPeriodTotal > 0 ? ((grandTotal - prevPeriodTotal) / prevPeriodTotal) * 100 : 0;
  const isGrowth = growthPct >= 0;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!storeData.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No stores found or no payment data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          Multi-Store Payment Overview
        </h2>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={v => setPeriod(v as DashPeriod)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Grand Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Across Stores</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(grandTotal)}</p>
          <div className="flex items-center gap-1 mt-1">
            {isGrowth ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            <span className={cn('text-xs font-medium', isGrowth ? 'text-green-500' : 'text-destructive')}>
              {growthPct > 0 ? '+' : ''}{growthPct.toFixed(1)}% vs prev
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-xl font-bold text-foreground">{grandCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{storeData.length} store(s)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg per Transaction</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(grandCount > 0 ? grandTotal / grandCount : 0)}
          </p>
        </div>
        {topStore && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Top Store</p>
                <p className="text-sm font-bold text-foreground">{topStore.store_name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(topStore.totalCollected)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className={cn('grid gap-4', chartData.length > 1 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
        {/* Bar Chart */}
        {chartData.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Store-wise Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value)]}
                />
                <Legend />
                <Bar dataKey="collected" fill="hsl(var(--primary))" name="Collected" radius={[4, 4, 0, 0]} />
                <Bar dataKey="refunded" fill="hsl(var(--destructive))" name="Refunded" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="hsl(var(--muted-foreground))" name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Chart */}
        {pieData.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Revenue Share</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storeData.map((store, idx) => (
          <div key={store.store_id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                <h4 className="font-semibold text-foreground">{store.store_name}</h4>
              </div>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                store.successRate >= 90 ? 'bg-green-500/10 text-green-600' :
                store.successRate >= 70 ? 'bg-yellow-500/10 text-yellow-600' :
                'bg-red-500/10 text-red-600'
              )}>
                {store.successRate.toFixed(0)}% success
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(store.totalCollected)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Txns</p>
                <p className="text-sm font-bold text-foreground">{store.transactionCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(store.avgTransaction)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(store.pendingAmount)}</p>
              </div>
            </div>
            {(store.refundedAmount > 0 || store.failedCount > 0) && (
              <div className="flex items-center gap-4 mt-2 text-xs">
                {store.refundedAmount > 0 && (
                  <span className="text-destructive">Refunds: {formatCurrency(store.refundedAmount)}</span>
                )}
                {store.failedCount > 0 && (
                  <span className="text-destructive">Failed: {store.failedCount}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
