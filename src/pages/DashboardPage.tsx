import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  TrendingUp, 
  TrendingDown,
  ShoppingCart as CartIcon, 
  DollarSign,
  UtensilsCrossed,
  ClipboardList,
  Pause,
  ArrowRight,
  ChefHat,
  BarChart3,
  Wifi,
  Bell,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, heldBills } = usePOS();
  const { t, formatCurrency } = useLocale();
  const { summary } = useAnalytics('today');
  const { userRole } = useSupabaseAuth();
  const isMobile = useIsMobile();

  const activeTables = tables.filter(t => t.status === 'occupied').length;
  const pendingOrders = summary.pendingOrders;
  const goalAmount = 5000;
  const goalPercent = Math.min(100, Math.round((summary.todaySales / goalAmount) * 100));

  // SVG donut chart params
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercent / 100) * circumference;

  const quickActions = [
    ...(userRole?.role !== 'owner' ? [{ label: t('dashboard.newOrder'), icon: CartIcon, path: '/pos' }] : []),
    { label: t('dashboard.tables'), icon: UtensilsCrossed, path: '/tables' },
    { label: t('dashboard.kitchen'), icon: ChefHat, path: '/kitchen' },
    { label: t('dashboard.reports'), icon: BarChart3, path: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">MAXORA</h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Downtown Cafe</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Wifi className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">ONLINE</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/staff-notifications')}>
              <Bell className="w-5 h-5 text-muted-foreground" />
              {pendingOrders > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
                  {pendingOrders}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-5">
        {/* Overview / Recent Orders Toggle */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            Overview
          </button>
          <button 
            className="flex-1 py-2.5 rounded-full bg-card text-muted-foreground text-sm font-medium border border-border/60"
            onClick={() => navigate('/orders')}
          >
            Recent Orders
          </button>
        </div>

        {/* Revenue Donut Card */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex flex-col items-center">
            <svg width="200" height="200" viewBox="0 0 200 200" className="mb-4">
              {/* Background circle */}
              <circle
                cx="100" cy="100" r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                opacity="0.3"
              />
              {/* Progress circle */}
              <circle
                cx="100" cy="100" r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 100 100)"
                className="transition-all duration-1000 ease-out"
              />
              {/* Center text */}
              <text x="100" y="85" textAnchor="middle" className="fill-muted-foreground text-[11px] uppercase tracking-widest font-medium">
                TODAY'S REVENUE
              </text>
              <text x="100" y="115" textAnchor="middle" className="fill-foreground text-[28px] font-bold">
                {formatCurrency(summary.todaySales)}
              </text>
              <text x="100" y="138" textAnchor="middle" className="fill-muted-foreground text-[12px]">
                Goal: {formatCurrency(goalAmount)}
              </text>
            </svg>

            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{goalPercent}% of Daily Goal Reached</span>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">KEY INSIGHTS</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">Today's Sales</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">₹{summary.todaySales.toLocaleString('en-IN')}</span>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex justify-between mt-4 text-[10px] text-muted-foreground">
                <span>vs goal</span><span>{goalPercent}%</span>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">Transactions</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{summary.todayOrders}</span>
                <span className="text-sm text-muted-foreground">Orders</span>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Avg Order</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">₹{Math.round(summary.avgOrderValue ?? 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('dashboard.avgOrderValue'), value: formatCurrency(summary.avgOrderValue), icon: DollarSign, trend: '+8%', up: true },
            { label: t('dashboard.activeTables'), value: `${activeTables}/${tables.length}`, icon: UtensilsCrossed, trend: null, up: false },
            { label: t('dashboard.pendingOrders'), value: pendingOrders.toString(), icon: ClipboardList, trend: null, up: false },
            { label: t('dashboard.heldBills'), value: heldBills.length.toString(), icon: Pause, trend: null, up: false },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              {stat.trend && (
                <span className={cn('text-xs font-medium', stat.up ? 'text-green-400' : 'text-red-400')}>
                  {stat.trend}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="font-semibold text-sm mb-3">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="bg-card border border-border/60 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[11px] font-medium text-foreground text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-30 pb-safe">
          <div className="flex justify-around py-2">
            {[
              { icon: BarChart3, label: 'Dashboard', path: '/dashboard', active: true },
              ...(userRole?.role !== 'owner' ? [{ icon: DollarSign, label: 'Sales', path: '/pos', active: false }] : []),
              { icon: ClipboardList, label: 'Items', path: '/menu', active: false },
              { icon: Settings, label: 'Settings', path: '/settings', active: false },
            ].map((nav) => (
              <button
                key={nav.label}
                onClick={() => navigate(nav.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 transition-colors',
                  nav.active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <nav.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{nav.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
