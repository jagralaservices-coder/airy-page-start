import React, { useState, useEffect } from 'react';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  ShoppingCart, 
  Receipt, 
  Users,
  Clock,
  ChefHat,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
  Layers,
  UtensilsCrossed,
  Truck,
  FileText,
  Percent,
  Pause,
  Check,
  X,
  Store,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Calendar,
  QrCode
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useOwnerStore } from '@/hooks/useOwnerStore';

// Sub-components for cleaner code
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  trend?: { value: string; up: boolean };
}> = ({ label, value, icon: Icon, gradient, trend }) => (
  <div className={cn('rounded-2xl p-4 text-white relative overflow-hidden', gradient)}>
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-6 -mt-6" />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs text-white/70 font-medium">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.up ? (
              <ArrowUpRight className="w-3 h-3 text-white/80" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-white/80" />
            )}
            <span className="text-[10px] text-white/70">{trend.value}</span>
          </div>
        )}
      </div>
      <div className="p-2 rounded-xl bg-white/20">
        <Icon className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const OrderStatusPill: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className={cn('p-2.5 rounded-xl', color)}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground text-center leading-tight">{label}</p>
  </div>
);

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const { summary, categorySummary, topSellingItems, paymentSummary, orderTypeSummary } = useAnalytics(timeRange);
  const { orders, heldBills, tables } = usePOS();
  const { isOwner, selectedStoreName } = useOwnerStore();
  const { t, formatCurrency } = useLocale();



  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

  const gradientStats = [
    {
      label: t('dashboard.todaysSales'),
      value: formatCurrency(summary.todaySales),
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      trend: { value: 'vs yesterday', up: true }
    },
    {
      label: t('dashboard.totalOrders'),
      value: summary.todayOrders.toString(),
      icon: ShoppingCart,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
      trend: { value: `${summary.todayOrders} orders`, up: true }
    },
    {
      label: t('dashboard.avgOrderValue'),
      value: formatCurrency(summary.avgOrderValue),
      icon: Receipt,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
    {
      label: t('dashboard.activeTables'),
      value: `${summary.activeTables}/${summary.totalTables}`,
      icon: Users,
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-700',
    }
  ];

  const orderStatusStats = [
    { label: t('orders.pending'), value: summary.pendingOrders, color: 'text-warning bg-warning/10', icon: Clock },
    { label: t('orders.preparing'), value: summary.preparingOrders, color: 'text-info bg-info/10', icon: ChefHat },
    { label: t('orders.ready'), value: summary.readyOrders, color: 'text-success bg-success/10', icon: Check },
    { label: t('orders.completed'), value: summary.completedOrders, color: 'text-muted-foreground bg-muted/30', icon: Check },
    { label: t('orders.cancelled'), value: summary.cancelledOrders, color: 'text-destructive bg-destructive/10', icon: X },
  ];

  const billingStats = [
    { label: t('dashboard.kotCount'), value: summary.kotCount, icon: FileText },
    { label: t('dashboard.billCount'), value: summary.billCount, icon: Receipt },
    { label: t('dashboard.heldBills'), value: summary.heldBillsCount, icon: Pause },
  ];

  const quickActions = [
    { label: t('dashboard.newOrder'), path: '/pos', icon: ShoppingCart, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: t('dashboard.tables'), path: '/tables', icon: Users, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    { label: t('dashboard.kitchen'), path: '/orders', icon: ChefHat, gradient: 'bg-gradient-to-br from-amber-500 to-orange-500' },
    { label: t('dashboard.reports'), path: '/reports', icon: TrendingUp, gradient: 'bg-gradient-to-br from-violet-500 to-purple-500' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Owner Store Banner */}
      {isOwner && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
          <Store className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Showing: <span className="text-primary font-semibold">{selectedStoreName}</span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.overview')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList className="h-9 bg-card border border-border">
              <TabsTrigger value="today" className="text-xs h-7 px-3">{t('common.today')}</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-7 px-3">{t('common.thisWeek')}</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-7 px-3">{t('common.thisMonth')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Gradient Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {gradientStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Order Status + Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Status */}
        <div className="pos-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t('common.status')}</h2>
            <Link to="/orders" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {orderStatusStats.map((stat) => (
              <OrderStatusPill key={stat.label} {...stat} />
            ))}
          </div>
        </div>

        {/* Billing Stats */}
        <div className="pos-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('dashboard.billingSummary')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {billingStats.map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-secondary/30 rounded-xl border border-border/50">
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods + Razorpay */}
      <div className="grid grid-cols-1 gap-4">
        <div className="pos-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('reports.paymentMethods')}</h2>
          <div className="space-y-2.5">
            {paymentSummary.map((payment) => (
              <div key={payment.method} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                    {payment.method === 'Cash' && <Banknote className="w-4 h-4 text-success" />}
                    {payment.method === 'Card' && <CreditCard className="w-4 h-4 text-primary" />}
                    {(payment.method === 'UPI' || payment.method === 'Upi') && <Smartphone className="w-4 h-4 text-warning" />}
                    {payment.method === 'QR Order' && <QrCode className="w-4 h-4 text-orange-500" />}
                    {payment.method === 'Split' && <Users className="w-4 h-4 text-info" />}
                    {payment.method === 'Part' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                    {payment.method === 'Part Payment' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                    {payment.method === 'Due' && <Clock className="w-4 h-4 text-destructive" />}
                    {payment.method === 'Credit' && <Clock className="w-4 h-4 text-indigo-500" />}
                    {payment.method === 'Credit Outstanding' && <Clock className="w-4 h-4 text-destructive" />}
                    {payment.method === 'Credit Collected' && <Check className="w-4 h-4 text-emerald-500" />}
                    {payment.method === 'Cancelled Order' && <X className="w-4 h-4 text-destructive" />}
                    {payment.method === 'Discount' && <Percent className="w-4 h-4 text-rose-500" />}
                    {payment.method === 'GST' && <FileText className="w-4 h-4 text-amber-500" />}
                  </div>
                  <span className="text-sm text-foreground">{payment.method}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${payment.percentage}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground w-20 text-right">{formatCurrency(payment.amount)}</span>
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{payment.count} ords</span>
                  </div>
                </div>
              </div>
            ))}
            {paymentSummary.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('reports.noSalesData')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Order Types */}
      <div className="pos-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('pos.orderType')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {orderTypeSummary.map((type) => {
            const iconMap: Record<string, React.ElementType> = {
              'Dine in': UtensilsCrossed,
              'Takeaway': Package,
              'Delivery': Truck,
              'Online': Smartphone,
            };
            const TypeIcon = iconMap[type.type] || Package;
            return (
              <div key={type.type} className="p-3 bg-secondary/30 rounded-xl border border-border/50 text-center">
                <TypeIcon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{type.count}</p>
                <p className="text-[10px] text-muted-foreground">{type.type}</p>
                <p className="text-xs font-semibold text-primary mt-0.5">{formatCurrency(type.amount)}</p>
              </div>
            );
          })}
          {orderTypeSummary.length === 0 && (
            <p className="text-center text-muted-foreground py-4 col-span-4 text-sm">{t('orders.noOrders')}</p>
          )}
        </div>
      </div>

      {/* Category + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="pos-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {t('menu.category')}
            </h2>
            <Link to="/reports/category" className="text-xs text-primary hover:underline">{t('common.view')} {t('common.all')}</Link>
          </div>
          <div className="space-y-2">
            {categorySummary.slice(0, 5).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <p className="font-medium text-sm text-foreground">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.totalQty} {t('common.items')} {t('common.sold')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-primary">{formatCurrency(cat.totalAmount)}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.percentage}%</p>
                </div>
              </div>
            ))}
            {categorySummary.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('common.noData')}</p>
            )}
          </div>
        </div>

        <div className="pos-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-success" />
              {t('reports.topItems')}
            </h2>
            <Link to="/reports/item" className="text-xs text-primary hover:underline">{t('common.view')} {t('common.all')}</Link>
          </div>
          <div className="space-y-2">
            {topSellingItems.slice(0, 5).map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-foreground">{item.qty} {t('common.sold')}</p>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(item.amount)}</p>
                </div>
              </div>
            ))}
            {topSellingItems.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('common.noData')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="pos-card-interactive p-4 flex flex-col items-center gap-2.5"
            >
              <div className={cn('p-3 rounded-xl text-white', action.gradient)}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="pos-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              {t('dashboard.pendingOrders')}
            </h2>
            <span className="bg-warning/10 text-warning px-2.5 py-0.5 rounded-full text-xs font-medium">
              {pendingOrders.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pendingOrders.slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {order.kotNumber || `#${order.id.slice(-6).toUpperCase()}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {order.tableNumber ? `${t('pos.tableNumber')} ${order.tableNumber}` : order.orderType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-primary">{formatCurrency(order.total)}</p>
                  <p className={cn('text-[10px] px-2 py-0.5 rounded-full inline-block',
                    order.status === 'preparing' ? 'bg-info/20 text-info' : 'bg-warning/20 text-warning'
                  )}>
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
