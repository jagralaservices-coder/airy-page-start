import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useLocale } from '@/contexts/LocaleContext';
import { BarChart3, TrendingUp, Download, ArrowLeft, Store, Printer, XCircle, AlertTriangle, Loader2, DollarSign, Wallet, CreditCard, Star, ListOrdered, ShoppingCart, Users, Layers, Percent, Coffee, Hash, FileText, IndianRupee, ArrowDownUp, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { useSubscription } from '@/hooks/useSubscription';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { isOwner, selectedStoreName } = useOwnerStore();
  const { paymentSummary, filteredOrders, isLoading } = useAnalytics(timeRange, dateRange);
  const { canAccess } = useSubscription();

  // Switch to custom when dateRange changes
  useEffect(() => {
    if (dateRange?.from) {
      setTimeRange('custom');
    } else if (timeRange === 'custom') {
      setTimeRange('today');
    }
  }, [dateRange]);

  const reportLinks = [
    { label: '⭐ Advanced Reports', path: '/advanced-reports', icon: Star, featureKey: 'advancedAnalytics' },
    { label: 'Category Summary', path: '/reports/category', icon: Layers },
    { label: 'Item Summary', path: '/reports/item', icon: ShoppingCart },
    { label: 'Sales Summary', path: '/reports/sales', icon: TrendingUp },
    { label: 'Order Summary', path: '/reports/order', icon: ListOrdered, featureKey: 'orderSummaryReport' },
    { label: 'Executive Sales', path: '/reports/executive', icon: BarChart3, featureKey: 'executiveSaleReport' },
    { label: 'Employee Summary', path: '/reports/employee', icon: Users, featureKey: 'employeeSummaryReport' },
    { label: 'Group Summary', path: '/reports/group', icon: Layers, featureKey: 'groupSummaryReport' },
    { label: 'Variation Summary', path: '/reports/variation', icon: ArrowDownUp, featureKey: 'variationSummaryReport' },
    { label: 'Cover Size Summary', path: '/reports/cover-size', icon: Hash, featureKey: 'coverSizeSummaryReport' },
    { label: 'Tip Summary', path: '/reports/tip', icon: Coffee, featureKey: 'tipSummaryReport' },
    { label: 'Counter Summary', path: '/reports/counter', icon: Hash, featureKey: 'counterSummaryReport' },
    { label: 'Expense Tracker', path: '/expenses', icon: Wallet, featureKey: 'expenseTracking' },
    { label: 'Due Payment', path: '/credit-ledger', icon: CreditCard, featureKey: 'creditLedger' },
    { label: 'Cash Flow', path: '/cash-flow', icon: IndianRupee, featureKey: 'cashFlow' },
    { label: 'Withdrawal', path: '/withdrawal', icon: PiggyBank, featureKey: 'withdrawal' },
    { label: 'Cash Top-Up', path: '/cash-topup', icon: DollarSign, featureKey: 'cashTopUp' },
  ].filter(item => !item.featureKey || canAccess(item.featureKey));

  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');
  const completedOrders = filteredOrders.filter(o => o.status !== 'cancelled');
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = completedOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
  const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

  const standardMethods = [
    { key: 'Cash', label: t('pos.cash') || 'Cash', emoji: '💵', color: 'bg-success' },
    { key: 'Card', label: t('pos.card') || 'Card', emoji: '💳', color: 'bg-primary' },
    { key: 'UPI', label: 'UPI', emoji: '📱', color: 'bg-warning' },
    { key: 'Credit', label: 'Credit', emoji: '⏳', color: 'bg-indigo-500' },
    { key: 'Credit Outstanding', label: 'Credit Outstanding', emoji: '⚠️', color: 'bg-destructive' },
    { key: 'Credit Collected', label: 'Credit Collected', emoji: '🤝', color: 'bg-emerald-500' },
    { key: 'Discount', label: 'Discount', emoji: '🏷️', color: 'bg-rose-500' },
    { key: 'GST', label: 'GST', emoji: '🧾', color: 'bg-amber-500' },
  ];

  const getPaymentVal = (methodKey: string) => {
    return paymentSummary.find(p => p.method.toLowerCase() === methodKey.toLowerCase())?.amount || 0;
  };

  const getPaymentCount = (methodKey: string) => {
    return paymentSummary.find(p => p.method.toLowerCase() === methodKey.toLowerCase())?.count || 0;
  };

  const breakdownItems = [
    ...standardMethods.map(m => ({
      label: m.label,
      value: getPaymentVal(m.key),
      count: getPaymentCount(m.key),
      emoji: m.emoji,
      color: m.color,
    })),
    ...paymentSummary
      .filter(p => !standardMethods.some(sm => sm.key.toLowerCase() === p.method.toLowerCase()))
      .map(p => ({
        label: p.method,
        value: p.amount,
        count: p.count,
        emoji: '💳',
        color: 'bg-info',
      }))
  ];

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  completedOrders.forEach(order => {
    if (!Array.isArray(order.items)) return;
    order.items.forEach((item: any) => {
      const key = item.id || item.name;
      if (!itemCounts[key]) itemCounts[key] = { name: item.name || 'Unknown', count: 0, revenue: 0 };
      itemCounts[key].count += (item.quantity || 1);
      itemCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const handleExport = () => {
    const csvContent = [
      ['Order ID', 'Date', 'Type', 'Payment', 'Total'].join(','),
      ...completedOrders.map(o => [o.id, new Date(o.createdAt).toLocaleDateString(), o.orderType, o.paymentMethod, o.total].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sales-report-${timeRange}.csv`; a.click();
  };

  const handlePrint = () => {
    const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}`
      : timeRange === 'today' ? t('common.today') : t('common.today'); // fallback
    printReport(
      { title: t('reports.sales'), subtitle: `${dateRangeLabel} Summary`, storeName: selectedStoreName, dateRange: dateRangeLabel },
      [
        { title: 'Summary', type: 'stats', data: [{ label: t('reports.totalSales'), value: formatReportCurrency(totalSales) }, { label: t('reports.totalOrders'), value: totalOrders }, { label: t('reports.avgOrderValue'), value: formatReportCurrency(avgOrderValue) }, { label: t('common.items') + ' ' + t('common.sold'), value: Object.values(itemCounts).reduce((sum, i) => sum + i.count, 0) }] },
        { title: t('reports.paymentMethods'), type: 'list', data: breakdownItems.map(item => ({ label: item.label, value: formatReportCurrency(item.value), subtext: `${item.count} orders` })) },
        { title: t('reports.topItems'), type: 'list', data: topItems.map(item => ({ label: item.name, value: formatReportCurrency(item.revenue), subtext: `${item.count} ${t('common.sold')}` })) },
      ]
    );
  };

  const timeRanges = [
    { id: 'today', label: t('common.today') },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('nav.reports')}</h1>
              <p className="text-xs text-muted-foreground">{t('reports.salesPerformance')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Store banner */}
        {isOwner && (
          <div className="mx-4 mb-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{selectedStoreName}</span>
          </div>
        )}

        {/* Time Range Chips & Date Picker */}
        <div className="flex gap-2 px-4 pb-3 items-center flex-wrap">
          {timeRanges.map(range => (
            <button key={range.id} onClick={() => { setTimeRange(range.id); setDateRange(undefined); }}
              className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all h-[36px]', timeRange === range.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground')}>
              {range.label}
            </button>
          ))}
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Report Grid Cards */}
        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
          {reportLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 active:scale-95 transition-all duration-200 min-h-[80px] md:min-h-[100px] group touch-manipulation"
              >
                <Icon className="w-6 h-6 md:w-8 md:h-8 text-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] md:text-xs text-center text-foreground font-medium leading-tight line-clamp-2">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 sm:mb-1 truncate">{t('reports.totalSales')}</p>
            <p className="text-sm sm:text-xl font-bold text-primary truncate" title={formatCurrency(totalSales)}>{formatCurrency(totalSales)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 sm:mb-1 truncate">{t('reports.totalOrders')}</p>
            <p className="text-sm sm:text-xl font-bold text-foreground truncate" title={String(totalOrders)}>{totalOrders}</p>
          </div>
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 sm:mb-1 truncate">AOV</p>
            <p className="text-sm sm:text-xl font-bold text-foreground truncate" title={formatCurrency(avgOrderValue)}>{formatCurrency(avgOrderValue)}</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            {t('reports.paymentMethods')}
          </h3>
          <div className="space-y-3">
            {breakdownItems.map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-foreground">{item.emoji} {item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{item.count} ords</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${totalSales > 0 ? (item.value / totalSales) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t('reports.topItems')}
          </h3>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('reports.noSalesData')}</p>
            ) : (
              topItems.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.count} {t('common.sold')}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cancelled Orders */}
        {cancelledOrders.length > 0 && (
          <div className="bg-card border border-destructive/20 rounded-2xl p-4">
            <h3 className="font-bold text-destructive text-sm flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4" />
              {t('reports.cancelledOrders')} ({cancelledOrders.length})
              <span className="ml-auto text-xs font-normal text-muted-foreground">{formatCurrency(cancelledTotal)}</span>
            </h3>
            <div className="space-y-2">
              {cancelledOrders.map((order) => (
                <div key={order.id} className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">#{order.billNumber || order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="font-bold text-destructive text-sm">{formatCurrency(order.total)}</span>
                  </div>
                  {order.cancelReason && (
                    <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                      <p className="text-[11px] text-destructive">{order.cancelReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
