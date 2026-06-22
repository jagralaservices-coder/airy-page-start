import React, { useState, useEffect } from 'react';
import { Download, ArrowLeft, Users2, Printer } from 'lucide-react';
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

const CoverSizeSummaryPage: React.FC = () => {
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
  const { coverSizeSummary } = useAnalytics(timeRange, dateRange);

  const totalOrders = coverSizeSummary.reduce((sum, c) => sum + c.orders, 0);
  const grandTotal = coverSizeSummary.reduce((sum, c) => sum + c.amount, 0);

  const handleExport = () => {
    const headers = [t('reports.coverSize'), t('nav.orders'), t('reports.avgOrderValue'), t('reports.totalSales')];
    const rows = coverSizeSummary.map(c => [`${c.coverSize} Person(s)`, c.orders, c.avgPerCover, c.amount]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover-size-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'today' ? t('common.today') : timeRange === 'week' ? t('common.thisWeek') : t('common.thisMonth');
    printReport(
      { title: t('reports.coverSizeSummary'), subtitle: dateRangeLabel, dateRange: dateRangeLabel, generatedAt: new Date() },
      [
        { type: 'stats', data: [
          { label: t('reports.totalSales'), value: formatReportCurrency(grandTotal) },
          { label: t('reports.totalOrders'), value: totalOrders },
          { label: t('reports.avgOrderValue'), value: formatReportCurrency(totalOrders > 0 ? grandTotal / totalOrders : 0) },
        ]},
        { title: t('common.details'), type: 'table', data: {
          headers: [t('reports.coverSize'), t('nav.orders'), 'Avg/Cover', t('reports.totalSales')],
          rows: coverSizeSummary.map(c => [`${c.coverSize} Person(s)`, c.orders, formatReportCurrency(c.avgPerCover), formatReportCurrency(c.amount)])
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
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('reports.coverSizeSummary')}</h1>
              <p className="text-sm text-muted-foreground">{t('reports.salesByPartySize')}</p>
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
              <TableHead>{t('reports.coverSize')}</TableHead>
              <TableHead className="text-right">{t('nav.orders')}</TableHead>
              <TableHead className="text-right">Avg/Cover</TableHead>
              <TableHead className="text-right">{t('reports.totalSales')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverSizeSummary.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {t('reports.noSalesData') || 'No dine-in data available'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {coverSizeSummary.map((cover) => (
                  <TableRow key={cover.coverSize}>
                    <TableCell className="font-medium">{cover.coverSize} Person(s)</TableCell>
                    <TableCell className="text-right">{cover.orders}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cover.avgPerCover)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cover.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{totalOrders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalOrders > 0 ? grandTotal / totalOrders : 0)}</TableCell>
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

export default CoverSizeSummaryPage;
