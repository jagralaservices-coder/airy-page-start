import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, PackageOpen, TrendingDown, DollarSign, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function InventoryAnalyticsPage() {
  const [stats, setStats] = useState({ products: 0, lowStock: 0, value: 0 });
  const [alerts, setAlerts] = useState<Array<{ product: string; store: string; current: number; min: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [prods, low] = await Promise.all([
        supabase.from('products').select('id, cost_price, stock_quantity, name, store_id, min_stock_level', { count: 'exact' }).limit(5000),
        supabase.from('products').select('id, name, stock_quantity, min_stock_level, store_id').limit(5000),
      ]);
      if (cancelled) return;
      const all = (prods.data ?? []) as any[];
      const value = all.reduce((s, p) => s + Number(p.cost_price ?? 0) * Number(p.stock_quantity ?? 0), 0);
      const lowList = ((low.data ?? []) as any[])
        .filter((p) => p.min_stock_level != null && Number(p.stock_quantity ?? 0) <= Number(p.min_stock_level))
        .slice(0, 10);
      setStats({ products: prods.count ?? all.length, lowStock: lowList.length, value });
      setAlerts(
        lowList.map((p) => ({
          product: p.name ?? '—',
          store: p.store_id ?? '',
          current: Number(p.stock_quantity ?? 0),
          min: Number(p.min_stock_level ?? 0),
        }))
      );
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Global Inventory Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live cross-merchant inventory value and stock alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <PackageOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.products.toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wastage / Expiry</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-400">—</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">₹{stats.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
        <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <Inbox className="w-10 h-10 mb-2" />
              <p className="text-sm">No low-stock items right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">{a.product}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Store: {a.store.slice(0, 8)}…</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-700 dark:text-red-300">{a.current}</p>
                    <p className="text-xs text-red-500">Min: {a.min}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
