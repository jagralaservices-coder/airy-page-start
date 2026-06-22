import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/store';
import { Download, ArrowLeft, Layers, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CategorySummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  useEffect(() => {
    if (dateRange?.from) {
      setTimeRange('custom');
    } else if (timeRange === 'custom') {
      setTimeRange('today');
    }
  }, [dateRange]);
  const { categorySummary, summary } = useAnalytics(timeRange, dateRange);

  const handleExport = () => {
    const headers = ['Category', 'Items Sold', 'Quantity', 'Amount', 'Percentage'];
    const rows = categorySummary.map(c => [c.name, c.itemCount, c.totalQty, c.totalAmount, `${c.percentage}%`]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'category-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}`
      : timeRange === 'today' ? 'Today' : 'Today';
    
    printReport(
      {
        title: 'Category Summary Report',
        subtitle: `${dateRangeLabel} Breakdown`,
        dateRange: dateRangeLabel,
      },
      [
        {
          title: 'Summary',
          type: 'stats',
          data: [
            { label: 'Categories', value: categorySummary.length },
            { label: 'Items Sold', value: categorySummary.reduce((s, c) => s + c.totalQty, 0) },
            { label: 'Total Revenue', value: formatReportCurrency(summary.totalSales) },
            { label: 'Total Orders', value: summary.totalOrders },
          ],
        },
        {
          title: 'Category Details',
          type: 'table',
          data: {
            headers: ['Category', 'Items', 'Qty', 'Amount', 'Share'],
            rows: categorySummary.map(cat => [
              cat.name,
              cat.itemCount,
              cat.totalQty,
              formatReportCurrency(cat.totalAmount),
              `${cat.percentage}%`,
            ]),
          },
        },
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
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Category Summary</h1>
              <p className="text-sm text-muted-foreground">Sales breakdown by category</p>
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
            Print
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="pos-card p-2.5 sm:p-4 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Categories</p>
          <p className="text-base sm:text-2xl font-bold text-foreground truncate" title={String(categorySummary.length)}>{categorySummary.length}</p>
        </div>
        <div className="pos-card p-2.5 sm:p-4 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Items Sold</p>
          <p className="text-base sm:text-2xl font-bold text-foreground truncate" title={String(categorySummary.reduce((s, c) => s + c.totalQty, 0))}>{categorySummary.reduce((s, c) => s + c.totalQty, 0)}</p>
        </div>
        <div className="pos-card p-2.5 sm:p-4 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Revenue</p>
          <p className="text-base sm:text-2xl font-bold text-foreground truncate" title={formatCurrency(summary.totalSales)}>{formatCurrency(summary.totalSales)}</p>
        </div>
      </div>

      <div className="pos-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Items Sold</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorySummary.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              <>
                {categorySummary.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">{category.itemCount}</TableCell>
                    <TableCell className="text-right">{category.totalQty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(category.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${category.percentage}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{category.percentage}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{categorySummary.reduce((s, c) => s + c.itemCount, 0)}</TableCell>
                  <TableCell className="text-right">{categorySummary.reduce((s, c) => s + c.totalQty, 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.totalSales)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CategorySummaryPage;