import React, { useState, useEffect } from 'react';
import { Download, ArrowLeft, Heart, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TipSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  useEffect(() => {
    if (dateRange?.from) {
      setTimeRange('custom');
    } else if (timeRange === 'custom') {
      setTimeRange('today');
    }
  }, [dateRange]);
  const { filteredOrders } = useAnalytics(timeRange, dateRange);

  // Aggregate tips from real orders (tip field exists in DB but not in local Order type)
  const ordersWithTips = filteredOrders.filter(o => (o as any).tip && (o as any).tip > 0);
  const totalTips = ordersWithTips.reduce((sum, o) => sum + ((o as any).tip || 0), 0);
  const totalOrdersWithTips = ordersWithTips.length;
  const avgTipPerOrder = totalOrdersWithTips > 0 ? Math.round(totalTips / totalOrdersWithTips) : 0;

  // Group tips by payment method
  const tipsByMethod: { method: string; orderCount: number; totalTips: number; avgTip: number }[] = [];
  const methodMap = new Map<string, { count: number; tips: number }>();
  
  ordersWithTips.forEach(o => {
    const method = o.paymentMethod || 'cash';
    const existing = methodMap.get(method) || { count: 0, tips: 0 };
    methodMap.set(method, { count: existing.count + 1, tips: existing.tips + ((o as any).tip || 0) });
  });

  methodMap.forEach((data, method) => {
    tipsByMethod.push({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      orderCount: data.count,
      totalTips: data.tips,
      avgTip: data.count > 0 ? Math.round(data.tips / data.count) : 0,
    });
  });

  tipsByMethod.sort((a, b) => b.totalTips - a.totalTips);

  const handleExport = () => {
    const headers = [t('reports.paymentMethods'), t('nav.orders'), t('reports.tips'), 'Avg Tip'];
    const rows = tipsByMethod.map(t => [t.method, t.orderCount, t.totalTips, t.avgTip]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tip-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'today' ? t('common.today') : timeRange === 'week' ? t('common.thisWeek') : t('common.thisMonth');
    printReport(
      { title: t('reports.tipSummary') || 'Tip Summary', subtitle: dateRangeLabel, dateRange: dateRangeLabel, generatedAt: new Date() },
      [
        { type: 'stats', data: [
          { label: t('reports.tips') || 'Total Tips', value: formatReportCurrency(totalTips) },
          { label: t('reports.totalOrders'), value: totalOrdersWithTips },
          { label: 'Avg Tip/Order', value: formatReportCurrency(avgTipPerOrder) },
        ]},
        { title: t('common.details'), type: 'table', data: {
          headers: [t('reports.paymentMethods'), t('nav.orders'), t('reports.tips'), 'Avg Tip'],
          rows: tipsByMethod.map(t => [t.method, t.orderCount, formatReportCurrency(t.totalTips), formatReportCurrency(t.avgTip)])
        }}
      ]
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Heart className="h-6 w-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('reports.tipSummary') || 'Tip Summary'}</h1>
              <p className="text-sm text-muted-foreground">Tips collected by payment method</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => { setTimeRange('today'); setDateRange(undefined); }} className="h-9">Today</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {t('common.print')}
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {t('common.export')} CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{t('reports.tips') || 'Total Tips'}</p>
          <p className="text-xl sm:text-2xl font-bold text-success mt-1 truncate" title={formatCurrency(totalTips)}>{formatCurrency(totalTips)}</p>
        </div>
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">Orders with Tips</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate" title={String(totalOrdersWithTips)}>{totalOrdersWithTips}</p>
        </div>
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">Avg Tip per Order</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate" title={formatCurrency(avgTipPerOrder)}>{formatCurrency(avgTipPerOrder)}</p>
        </div>
      </div>

      <div className="pos-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.paymentMethods')}</TableHead>
              <TableHead className="text-right">{t('nav.orders')}</TableHead>
              <TableHead className="text-right">{t('reports.tips') || 'Total Tips'}</TableHead>
              <TableHead className="text-right">Avg Tip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tipsByMethod.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {t('reports.noSalesData') || 'No tip data available'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {tipsByMethod.map((tip) => (
                  <TableRow key={tip.method}>
                    <TableCell className="font-medium">{tip.method}</TableCell>
                    <TableCell className="text-right">{tip.orderCount}</TableCell>
                    <TableCell className="text-right text-success font-semibold">{formatCurrency(tip.totalTips)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tip.avgTip)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{totalOrdersWithTips}</TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(totalTips)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(avgTipPerOrder)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TipSummaryPage;
