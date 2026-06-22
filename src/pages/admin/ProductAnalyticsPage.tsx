import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ProductAnalyticsPage() {
  const [topProducts, setTopProducts] = useState<Array<{ id: string; name: string; sold: number; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, total_price, created_at')
        .gte('created_at', since)
        .limit(20000);
      if (cancelled) return;
      const agg = new Map<string, { name: string; sold: number; revenue: number }>();
      ((data ?? []) as any[]).forEach((r) => {
        const key = r.product_id ?? r.product_name ?? '—';
        const cur = agg.get(key) ?? { name: r.product_name ?? '—', sold: 0, revenue: 0 };
        cur.sold += Number(r.quantity ?? 0);
        cur.revenue += Number(r.total_price ?? 0);
        agg.set(key, cur);
      });
      const top = Array.from(agg.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(top);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Product Analytics</h1>
      <Card>
        <CardHeader><CardTitle>Top Products (30 days)</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : topProducts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
              <Inbox className="w-10 h-10 mb-2" />
              <p className="text-sm">No product sales in the last 30 days</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.sold.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-green-600">₹{p.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
