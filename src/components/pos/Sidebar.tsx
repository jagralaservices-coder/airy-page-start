import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Wallet,
  UtensilsCrossed,
  Truck,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wifi,
  WifiOff,
  Store,
  MapPin,
  Phone,
  BarChart3,
  Users,
  Layers,
  FileText,
  DollarSign,
  PieChart,
  ListOrdered,
  Grid3X3,
  Coins,
  Globe,
  QrCode,
  Lock,
  CreditCard,
  Shield,
  ScrollText,
  Bell,
  MessageSquare,
  Brain,
  TrendingUp,
  Gauge,
  Code,
  Calculator,
  LineChart,
  Wrench,
  SlidersHorizontal
} from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURES, BASIC_REPORT_PATHS } from '@/lib/subscriptionConfig';
import { GoldBadge, PlatinumBadge } from '@/components/pos/UpgradeGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useUICustomization } from '@/hooks/useUICustomization';
import { MaxoraLogo } from '@/components/ui/MaxoraLogo';
import maxoraIcon from '@/assets/maxora-icon.jpg';

const CustomMenuIcon = ({ className }: { className?: string }) => (
  <img src={maxoraIcon} alt="Menu" className={cn("w-full h-full object-cover rounded-md", className)} />
);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  labelKey: string;
  requiredRoles?: ('admin' | 'owner' | 'store_manager' | 'staff')[];
  featureKey?: keyof typeof FEATURES;
  subItems?: { path: string; icon: React.ElementType; labelKey: string }[];
  hideLabel?: boolean;
}

const reportsSubItems = [
  { path: '/reports', icon: BarChart3, labelKey: 'reports.sales' },
  { path: '/reports/sales-summary', icon: DollarSign, labelKey: 'reports.totalSales' },
  { path: '/reports/executive-sales', icon: PieChart, labelKey: 'reports.sales' },
  { path: '/reports/order-summary', icon: ListOrdered, labelKey: 'orders.orderHistory' },
  { path: '/reports/item-summary', icon: Package, labelKey: 'menu.allItems' },
  { path: '/reports/category-summary', icon: Grid3X3, labelKey: 'menu.category' },
  { path: '/reports/group-summary', icon: Layers, labelKey: 'menu.variations' },
  { path: '/reports/employee-summary', icon: Users, labelKey: 'nav.staff' },
  { path: '/reports/counter-summary', icon: Receipt, labelKey: 'nav.pos' },
  { path: '/reports/cover-size-summary', icon: FileText, labelKey: 'common.details' },
  { path: '/reports/variation-summary', icon: Layers, labelKey: 'menu.variations' },
  { path: '/reports/tip-summary', icon: Coins, labelKey: 'pos.tip' },
];

const navItems: NavItem[] = [
  { path: '/operations', icon: Wrench, labelKey: 'nav.operations' },
  { path: '/reports', icon: BarChart3, labelKey: 'nav.reports', featureKey: 'basicReports', subItems: reportsSubItems },
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/pos', icon: ShoppingCart, labelKey: 'pos.billing', featureKey: 'billing' },
  { path: '/tables', icon: UtensilsCrossed, labelKey: 'nav.tables', featureKey: 'tableManagement' },
  { path: '/orders', icon: Receipt, labelKey: 'nav.orders' },
  { path: '/pickup', icon: Package, labelKey: 'pos.takeaway', featureKey: 'takeaway' },
  { path: '/menu', icon: CustomMenuIcon, labelKey: 'nav.menu', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'menuManagement', hideLabel: true },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'basicInventory' },
  { path: '/expenses', icon: Wallet, labelKey: 'nav.expenses', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'expenseTracking' },
  { path: '/delivery', icon: Truck, labelKey: 'nav.delivery', featureKey: 'deliveryTracking' },
  { path: '/online-orders', icon: Globe, labelKey: 'Online Orders', featureKey: 'swiggyZomato' },
  { path: '/qr-orders', icon: QrCode, labelKey: 'Menu Orders', featureKey: 'qrMenuOrdering' },
  { path: '/staff', icon: Users, labelKey: 'nav.staff', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'staffManagement' },
  { path: '/stores', icon: Store, labelKey: 'nav.stores', requiredRoles: ['admin', 'owner'], featureKey: 'multiOutlet' },
  { path: '/chat', icon: MessageSquare, labelKey: 'common.teamChat', featureKey: 'teamChat' },
  { path: '/credit-ledger', icon: ScrollText, labelKey: 'Credit Ledger', featureKey: 'creditLedger' },
  { path: '/executive-dashboard', icon: Gauge, labelKey: 'Executive Dashboard', requiredRoles: ['admin', 'owner'], featureKey: 'executiveDashboard' },
  { path: '/ai-control-center', icon: Brain, labelKey: 'AI Control Center', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'aiControlCenter' },
  { path: '/dynamic-pricing', icon: TrendingUp, labelKey: 'Dynamic Pricing', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'dynamicPricing' },
  { path: '/api-management', icon: Code, labelKey: 'API Management', requiredRoles: ['admin', 'owner'], featureKey: 'apiIntegrations' },
  { path: '/tax-engine', icon: Calculator, labelKey: 'Tax Engine', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'taxEngine' },
  { path: '/revenue-forecast', icon: LineChart, labelKey: 'Revenue Forecast', requiredRoles: ['admin', 'owner'], featureKey: 'revenueForecast' },
  { path: '/compliance', icon: Shield, labelKey: 'Compliance', requiredRoles: ['admin', 'owner', 'store_manager'], featureKey: 'compliance' },
];

const bottomItems: NavItem[] = [
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/support', icon: HelpCircle, labelKey: 'nav.support' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, heldBills, activeStore, isStoreLogin } = usePOS();
  const { userRole } = useSupabaseAuth();
  const { t } = useLocale();
  const { canAccess, canAccessReport, requiresUpgrade, tier } = useSubscription();
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const { toggles: featureToggles } = useFeatureToggles();
  const { getSortedSidebarItems, isSidebarItemVisible } = useUICustomization();

  useEffect(() => {
    if (location.pathname.startsWith('/reports')) {
      setReportsExpanded(true);
    }
    if (location.pathname === '/settings' || location.pathname.startsWith('/payment') || location.pathname === '/settlements' || location.pathname === '/customer-notifications') {
      setSettingsExpanded(true);
    }
  }, [location.pathname]);

  const sidebarConfig = getSortedSidebarItems();

  const filterByRole = (items: NavItem[]) => {
    return items.filter(item => {
      // Check UI customization visibility
      const sidebarId = item.path.replace('/', '') || 'operations';
      if (!isSidebarItemVisible(sidebarId)) return false;
      
      if (item.path === '/tables' && !featureToggles.tableEnabled) return false;
      if (item.path === '/delivery' && !featureToggles.deliveryEnabled) return false;
      if (item.path === '/pickup' && !featureToggles.takeawayEnabled) return false;
      if (item.featureKey && !canAccess(item.featureKey)) return false;
      if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
      if (isStoreLogin) return true;
      if (!userRole) return false;
      return (item.requiredRoles as string[]).includes(userRole.role as string);
    });
  };

  // Sort nav items based on sidebar config
  const sortByConfig = (items: NavItem[]) => {
    return [...items].sort((a, b) => {
      const aId = a.path.replace('/', '') || 'operations';
      const bId = b.path.replace('/', '') || 'operations';
      const aConfig = sidebarConfig.find(s => s.id === aId);
      const bConfig = sidebarConfig.find(s => s.id === bId);
      return (aConfig?.position ?? 999) - (bConfig?.position ?? 999);
    });
  };

  // Get custom label from sidebar config
  const getCustomLabel = (item: NavItem) => {
    const sidebarId = item.path.replace('/', '') || 'operations';
    const customItem = sidebarConfig.find(s => s.id === sidebarId);
    if (customItem && customItem.label !== item.labelKey) {
      return customItem.label;
    }
    return t(item.labelKey);
  };

  const handleLockedClick = (featureName: string, requiredTier: string) => {
    toast.error(`${featureName} requires ${requiredTier.toUpperCase()} plan. Please upgrade.`);
  };

  const visibleNavItems = sortByConfig(filterByRole(navItems));
  const visibleBottomItems = filterByRole(bottomItems);

  const renderTierBadge = (item: NavItem) => {
    if (collapsed || !item.featureKey) return null;
    const needed = requiresUpgrade(item.featureKey);
    if (!needed) return null;
    if (needed === 'gold') return <GoldBadge />;
    if (needed === 'platinum') return <PlatinumBadge />;
    return null;
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300 flex flex-col',
      collapsed ? 'w-[72px]' : 'w-64'
    )}>
      {/* Logo */}
      <div 
        className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
        onClick={() => navigate('/')}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-lg">🧾</span>
            </div>
            <div className="flex-1 mt-1">
              <MaxoraLogo size="sm" showSubtitle={false} className="items-start" />
              <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider uppercase font-semibold">Universal POS</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <span className="text-lg">🧾</span>
          </div>
        )}
      </div>

      {/* Online Status */}
      <div className={cn('flex items-center gap-2 px-4 py-2.5 border-b border-sidebar-border', collapsed && 'justify-center')}>
        {isOnline ? (
          <>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {!collapsed && <span className="text-xs text-success font-medium">{t('common.online')}</span>}
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-warning" />
            {!collapsed && <span className="text-xs text-warning font-medium">{t('common.offlineMode')}</span>}
          </>
        )}
      </div>

      {/* Store Info */}
      {activeStore && (
        <div className={cn('px-3 py-2.5 border-b border-sidebar-border', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-xs font-semibold text-foreground truncate block">{activeStore.name}</span>
                {activeStore.address && (
                  <span className="text-[10px] text-muted-foreground truncate block">{activeStore.address}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide">
        <ul className="space-y-0.5 px-2.5">
          {visibleNavItems.map((item) => {
            const isReportsSection = item.path === '/reports';
            const isActive = location.pathname === item.path || 
              (isReportsSection && location.pathname.startsWith('/reports'));
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isLocked = item.featureKey ? !canAccess(item.featureKey) : false;

            if (hasSubItems) {
              const isExpanded = reportsExpanded;
              const toggleExpand = () => {
                if (collapsed) navigate(item.path);
                else setReportsExpanded(!reportsExpanded);
              };
              return (
                <li key={item.path}>
                  <button
                    onClick={toggleExpand}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm',
                      isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                      collapsed && 'justify-center'
                    )}
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="font-medium flex-1 text-left text-sm">{getCustomLabel(item)}</span>
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                      </>
                    )}
                  </button>
                  
                  {!collapsed && isExpanded && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-border pl-3">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        const reportLocked = isReportsSection && !canAccessReport(subItem.path);
                        // Hide restricted report sub-items completely
                        if (reportLocked) return null;
                        // Hide settings sub-items based on feature access
                        if (!isReportsSection) {
                          const settingsFeatureMap: Record<string, string> = {
                            '/payment-history': 'paymentHistory',
                            '/payment-analytics': 'paymentAnalytics',
                            '/payment-reconciliation': 'paymentReconciliation',
                            '/payment-alerts': 'paymentAlerts',
                            '/payment-disputes': 'paymentDisputes',
                            '/settlements': 'paymentSettlements',
                            '/customer-notifications': 'customerNotifications',
                          };
                          const featureKey = settingsFeatureMap[subItem.path];
                          if (featureKey && !canAccess(featureKey)) return null;
                        }
                        return (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={cn(
                                'flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200',
                                isSubActive ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                              )}
                            >
                              <subItem.icon className="w-4 h-4 flex-shrink-0" />
                              <span>{isReportsSection ? t(subItem.labelKey) : subItem.labelKey}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Hide features not available in current plan
            if (isLocked) {
              return null;
            }

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm',
                    location.pathname === item.path ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                    collapsed && 'justify-center'
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!collapsed && !item.hideLabel && <span className="font-medium">{getCustomLabel(item)}</span>}
                  {!collapsed && item.path === '/pos' && heldBills.length > 0 && (
                    <span className="ml-auto bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {heldBills.length}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Items */}
      <div className="border-t border-sidebar-border py-3">
        <ul className="space-y-0.5 px-2.5">
          {visibleBottomItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.subItems && item.subItems.some(s => location.pathname === s.path)) ||
              (item.path === '/settings' && (location.pathname === '/settlements' || location.pathname === '/customer-notifications'));
            const hasSubItems = item.subItems && item.subItems.length > 0;

            if (hasSubItems) {
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      if (collapsed) navigate(item.path);
                      else setSettingsExpanded(!settingsExpanded);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm',
                      isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                      collapsed && 'justify-center'
                    )}
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="font-medium flex-1 text-left text-sm">{t(item.labelKey)}</span>
                        <ChevronDown className={cn('w-4 h-4 transition-transform', settingsExpanded && 'rotate-180')} />
                      </>
                    )}
                  </button>
                  {!collapsed && settingsExpanded && (
                     <ul className="mt-1 ml-4 space-y-1 border-l-2 border-border pl-3">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        // Filter settings sub-items by feature access
                        const settingsFeatureMap: Record<string, string> = {
                          '/payment-history': 'paymentHistory',
                          '/payment-analytics': 'paymentAnalytics',
                          '/payment-reconciliation': 'paymentReconciliation',
                          '/payment-alerts': 'paymentAlerts',
                          '/payment-disputes': 'paymentDisputes',
                          '/settlements': 'paymentSettlements',
                          '/customer-notifications': 'customerNotifications',
                        };
                        const featureKey = settingsFeatureMap[subItem.path];
                        if (featureKey && !canAccess(featureKey)) return null;
                        return (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={cn(
                                'flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200',
                                isSubActive ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                              )}
                            >
                              <subItem.icon className="w-4 h-4 flex-shrink-0" />
                              <span>{subItem.labelKey}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                    collapsed && 'justify-center'
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{t(item.labelKey)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};
