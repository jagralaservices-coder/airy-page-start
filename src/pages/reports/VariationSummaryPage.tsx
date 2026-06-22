import React, { useState, useEffect } from 'react';
import { Download, ArrowLeft, Layers3, Printer } from 'lucide-react';
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

const VariationSummaryPage: React.FC = () => {
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

  // Aggregate variation data from orders
  const variationMap = new Map<string, { item: string; variation: string; qty: number; amount: number }>();
  
  filteredOrders.forEach(order => {
    order.items.forEach((item: any) => {
      const variationName = item.selectedVariation || item.variation || 'Default';
      const key = `${item.name}-${variationName}`;
      const existing = variationMap.get(key) || { item: item.name, variation: variationName, qty: 0, amount: 0 };
      variationMap.set(key, {
        item: item.name,
        variation: variationName,
        qty: existing.qty + item.quantity,
        amount: existing.amount + (item.price * item.quantity),
      });
    });
  });

  const variations = Array.from(variationMap.values()).sort((a, b) => b.amount - a.amount);
  const grandTotal = variations.reduce((sum, v) => sum + v.amount, 0);

  const handleExport = () => {
    const headers = [t('menu.itemName'), t('menu.variations'), t('common.quantity'), t('common.amount')];
    const rows = variations.map(v => [v.item, v.variation, v.qty, v.amount]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variation-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'today' ? t('common.today') : timeRange === 'week' ? t('common.thisWeek') : t('common.thisMonth');
    const totalQty = variations.reduce((s, v) => s + v.qty, 0);
    printReport(
      { title: t('reports.variationSummary'), subtitle: dateRangeLabel, dateRange: dateRangeLabel, generatedAt: new Date() },
      [
        { type: 'stats', data: [
          { label: t('common.total') + ' ' + t('common.amount'), value: formatReportCurrency(grandTotal) },
          { label: t('common.total') + ' ' + t('common.quantity'), value: totalQty },
          { label: t('menu.variations'), value: variations.length },
        ]},
        { title: t('common.details'), type: 'table', data: {
          headers: [t('menu.itemName'), t('menu.variations'), t('common.quantity'), t('common.amount')],
          rows: variations.map(v => [v.item, v.variation, v.qty, formatReportCurrency(v.amount)])
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
            <div className="p-2 bg-warning/10 rounded-lg">
              <Layers3 className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('reports.variationSummary')}</h1>
              <p className="text-sm text-muted-foreground">{t('reports.salesByVariation')}</p>
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

      <div className="pos-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('menu.itemName')}</TableHead>
              <TableHead>{t('menu.variations')}</TableHead>
              <TableHead className="text-right">{t('common.quantity')}</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {t('reports.noSalesData') || 'No variation data available'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {variations.map((variation, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{variation.item}</TableCell>
                    <TableCell>{variation.variation}</TableCell>
                    <TableCell className="text-right">{variation.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(variation.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{variations.reduce((s, v) => s + v.qty, 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VariationSummaryPage;
