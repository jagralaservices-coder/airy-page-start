import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/store';
import { Download, ArrowLeft, TrendingUp, Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';
import { exportToCSV, exportToPrintableHTML, type ExportColumn } from '@/lib/reportExportUtils';

const SalesSummaryPage: React.FC = () => {
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
  const { summary, paymentSummary, orderTypeSummary, discountSummary, filteredOrders } = useAnalytics(timeRange, dateRange);

  const exportColumns: ExportColumn[] = [
    { key: 'billNumber', header: 'Bill No' },
    { key: 'date', header: 'Date' },
    { key: 'orderType', header: 'Order Type' },
    { key: 'paymentMethod', header: 'Payment' },
    { key: 'subtotal', header: 'Subtotal', format: (v) => formatReportCurrency(v) },
    { key: 'discount', header: 'Discount', format: (v) => formatReportCurrency(v) },
    { key: 'tax', header: 'Tax', format: (v) => formatReportCurrency(v) },
    { key: 'total', header: 'Total', format: (v) => formatReportCurrency(v) },
  ];

  const exportData = filteredOrders.map(o => ({
    billNumber: o.billNumber || o.id.slice(-6).toUpperCase(),
    date: new Date(o.createdAt).toLocaleString(),
    orderType: o.orderType,
    paymentMethod: o.paymentMethod || 'cash',
    subtotal: o.subtotal || 0,
    discount: o.discount || 0,
    tax: o.tax || 0,
    total: o.total,
  }));

  const handleExportCSV = () => {
    exportToCSV(exportData, exportColumns, `sales-summary-${timeRange}`);
  };

  const handleExportPDF = () => {
    const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}`
      : timeRange === 'today' ? 'Today' : 'Today';
    exportToPrintableHTML(exportData, exportColumns, 'Sales Summary Report', {
      dateRange: dateRangeLabel,
    });
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}`
      : timeRange === 'today' ? 'Today' : 'Today';
    
    printReport(
      {
        title: 'Sales Summary Report',
        subtitle: `${dateRangeLabel} Overview`,
        dateRange: dateRangeLabel,
      },
      [
        {
          title: 'Summary',
          type: 'stats',
          data: [
            { label: 'Total Sales', value: formatReportCurrency(summary.totalSales) },
            { label: 'Total Orders', value: summary.totalOrders },
            { label: 'Avg Order Value', value: formatReportCurrency(summary.avgOrderValue) },
            { label: 'Total Discount', value: formatReportCurrency(discountSummary.totalDiscount) },
          ],
        },
        {
          title: 'Payment Methods',
          type: 'list',
          data: paymentSummary.map(p => ({
            label: p.method,
            value: formatReportCurrency(p.amount),
            subtext: `${p.count} orders (${p.percentage.toFixed(1)}%)`,
          })),
        },
        {
          title: 'Order Types',
          type: 'list',
          data: orderTypeSummary.map(t => ({
            label: t.type,
            value: formatReportCurrency(t.amount),
            subtext: `${t.count} orders (${t.percentage.toFixed(1)}%)`,
          })),
        },
        {
          title: 'Recent Orders',
          type: 'table',
          data: {
            headers: ['Bill #', 'Time', 'Type', 'Payment', 'Amount'],
            rows: filteredOrders.slice(0, 20).map(o => [
              o.billNumber || o.id.slice(-6).toUpperCase(),
              new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              o.orderType,
              o.paymentMethod || 'Cash',
              formatReportCurrency(o.total),
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
            <div className="p-2 bg-warning/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sales Summary</h1>
              <p className="text-sm text-muted-foreground">Complete sales overview</p>
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
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="pos-card p-3 sm:p-5 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Sales</p>
          <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate" title={formatCurrency(summary.totalSales)}>{formatCurrency(summary.totalSales)}</p>
        </div>
        <div className="pos-card p-3 sm:p-5 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Orders</p>
          <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate" title={String(summary.totalOrders)}>{summary.totalOrders}</p>
        </div>
        <div className="pos-card p-3 sm:p-5 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Order Value</p>
          <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate" title={formatCurrency(summary.avgOrderValue)}>{formatCurrency(summary.avgOrderValue)}</p>
        </div>
        <div className="pos-card p-3 sm:p-5 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Discount</p>
          <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate" title={formatCurrency(discountSummary.totalDiscount)}>{formatCurrency(discountSummary.totalDiscount)}</p>
        </div>
      </div>

      {/* Payment & Order Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="pos-card p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Payment Methods</h3>
          <div className="space-y-4">
            {paymentSummary.map((payment) => (
              <div key={payment.method} className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-sm sm:text-base text-foreground truncate min-w-[60px]">{payment.method}</span>
                <div className="flex items-center gap-2 sm:gap-4 ml-auto min-w-0">
                  <div className="w-16 sm:w-32 h-2 bg-muted rounded-full overflow-hidden hidden min-[400px]:block shrink-0">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${payment.percentage}%` }}
                    />
                  </div>
                  <span className="font-semibold text-foreground text-sm sm:text-base text-right min-w-[70px] sm:w-24 truncate">{formatCurrency(payment.amount)}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground text-right min-w-[48px] sm:w-16 shrink-0">{payment.count} orders</span>
                </div>
              </div>
            ))}
            {paymentSummary.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </div>
        </div>

        <div className="pos-card p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Order Types</h3>
          <div className="space-y-4">
            {orderTypeSummary.map((type) => (
              <div key={type.type} className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-sm sm:text-base text-foreground truncate min-w-[60px]">{type.type}</span>
                <div className="flex items-center gap-2 sm:gap-4 ml-auto min-w-0">
                  <div className="w-16 sm:w-32 h-2 bg-muted rounded-full overflow-hidden hidden min-[400px]:block shrink-0">
                    <div 
                      className="h-full bg-success rounded-full"
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                  <span className="font-semibold text-foreground text-sm sm:text-base text-right min-w-[70px] sm:w-24 truncate">{formatCurrency(type.amount)}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground text-right min-w-[48px] sm:w-16 shrink-0">{type.count} orders</span>
                </div>
              </div>
            ))}
            {orderTypeSummary.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummaryPage;