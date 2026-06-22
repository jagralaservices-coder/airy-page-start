import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Receipt,
  SlidersHorizontal,
  BarChart3,
  Radio,
  Settings,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MessageCircle,
  GripVertical,
  Pencil,
  Check,
  Sparkles,
} from 'lucide-react';
import { useSupabaseAuth, UserRole } from '@/contexts/SupabaseAuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { usePOSSafe } from '@/contexts/POSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LogoutConfirmDialog } from '@/components/pos/LogoutConfirmDialog';
import { useUICustomization } from '@/hooks/useUICustomization';
import { MaxoraLogo } from '@/components/ui/MaxoraLogo';
import MAXORAIcon from '@/assets/maxora-icon.jpg';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  allowedRoles: UserRole[];
  hideForStoreLogin?: boolean;
  featureKey?: string;
  hasDropdown?: boolean;
  dropdownItems?: { label: string; path: string; featureKey?: string }[];
}

const reportItems: { label: string; path: string; featureKey?: string }[] = [
  { label: '⭐ Advanced Reports', path: '/advanced-reports', featureKey: 'advancedAnalytics' },
  { label: 'Category Summary', path: '/reports/category' },
  { label: 'Item Summary', path: '/reports/item' },
  { label: 'Sales Summary', path: '/reports/sales' },
  { label: 'Order Summary', path: '/reports/order', featureKey: 'orderSummaryReport' },
  { label: 'Executive Sales Summary', path: '/reports/executive', featureKey: 'executiveSaleReport' },
  { label: 'Employee Summary', path: '/reports/employee', featureKey: 'employeeSummaryReport' },
  { label: 'Group Summary', path: '/reports/group', featureKey: 'groupSummaryReport' },
  { label: 'Variation Summary', path: '/reports/variation', featureKey: 'variationSummaryReport' },
  { label: 'Cover Size Summary', path: '/reports/cover-size', featureKey: 'coverSizeSummaryReport' },
  { label: 'Tip Summary', path: '/reports/tip', featureKey: 'tipSummaryReport' },
  { label: 'Counter Summary', path: '/reports/counter', featureKey: 'counterSummaryReport' },
  { label: 'Expense Tracker', path: '/expenses', featureKey: 'expenseTracking' },
  { label: 'Due Payment', path: '/credit-ledger', featureKey: 'creditLedger' },
  { label: 'Cash Flow', path: '/cash-flow', featureKey: 'cashFlow' },
  { label: 'Withdrawal', path: '/withdrawal', featureKey: 'withdrawal' },
  { label: 'Cash Top-Up', path: '/cash-topup', featureKey: 'cashTopUp' },
];

export const AppSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, hasRole, logout } = useSupabaseAuth();
  const { isImpersonating } = useImpersonation();
  const posContext = usePOSSafe();
  const { canAccess } = useSubscription();
  const { getAppSidebarOrder, reorderAppSidebar } = useUICustomization();
  const isStoreLogin = posContext?.isStoreLogin ?? false;
  const logoutStore = posContext?.logoutStore ?? (() => {});
  const [reportsOpen, setReportsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const navItems: NavItem[] = [
    { 
      path: '/dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard',
      allowedRoles: ['admin', 'owner', 'store_manager']
    },
    { 
      path: '/pos', 
      icon: Receipt, 
      label: 'Billing',
      allowedRoles: ['store_manager']
    },
    { 
      path: '/operations', 
      icon: SlidersHorizontal, 
      label: 'Operations',
      allowedRoles: ['admin', 'owner', 'store_manager']
    },
    { 
      path: '/reports', 
      icon: BarChart3, 
      label: 'Reports',
      allowedRoles: ['admin', 'owner', 'store_manager']
    },
    { 
      path: '/chat', 
      icon: MessageCircle, 
      label: 'Team Chat',
      allowedRoles: ['admin', 'owner', 'store_manager', 'staff'],
      featureKey: 'teamChat'
    },
    { 
      path: '/settings', 
      icon: Settings, 
      label: 'Settings',
      allowedRoles: ['admin', 'owner', 'store_manager']
    },
  ];

  // Filter items based on role OR store login
  const accessibleItems = navItems.filter(item => {
    // Hide features restricted by subscription plan
    if (item.featureKey && !canAccess(item.featureKey)) return false;
    // If store login, show all items except those explicitly hidden for store login
    if (isStoreLogin) {
      return !item.hideForStoreLogin;
    }
    // If impersonating a merchant, bypass strict admin role checks for merchant menus
    if (isImpersonating) {
      return true;
    }
    // Otherwise check user role
    return hasRole(item.allowedRoles);
  });

  // Sort by saved order
  const savedOrder = getAppSidebarOrder();
  const sortedAccessibleItems = useMemo(() => {
    if (savedOrder.length === 0) return accessibleItems;
    return [...accessibleItems].sort((a, b) => {
      const aIdx = savedOrder.findIndex(o => o.id === a.path.replace('/', ''));
      const bIdx = savedOrder.findIndex(o => o.id === b.path.replace('/', ''));
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [accessibleItems, savedOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (!isEditMode || dragIndex === null) return;
    e.preventDefault();
    const allIds = sortedAccessibleItems.map(i => i.path.replace('/', ''));
    reorderAppSidebar(dragIndex, index, allIds);
    setDragIndex(null);
    setDragOverIndex(null);
    toast.success('Sidebar order saved');
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleCheckUpdates = () => {
    toast.info('Checking for updates...', { duration: 2000 });
    setTimeout(() => {
      toast.success('You are on the latest version!');
    }, 2000);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    if (isStoreLogin) {
      logoutStore();
      navigate('/');
      toast.success('Store logged out successfully');
    } else {
      await logout();
      navigate('/');
      toast.success('Logged out successfully');
    }
  };

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-200 flex flex-col',
          collapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-sidebar-border bg-muted/50 overflow-hidden">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm ring-1 ring-primary/20 flex-shrink-0">
                <img src={MAXORAIcon} alt="MAXORA" className="w-full h-full object-cover" />
              </div>
              <MaxoraLogo size="sm" showSubtitle={false} className="items-start" />
            </div>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!collapsed && (
              <button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) toast.success('Sidebar order saved');
                }}
                className={cn(
                  'p-1 rounded transition-colors',
                  isEditMode ? 'bg-primary text-primary-foreground' : 'hover:bg-sidebar-accent'
                )}
                title={isEditMode ? 'Done editing' : 'Reorder sidebar'}
              >
                {isEditMode ? <Check className="w-4 h-4" /> : <Pencil className="w-3.5 h-3.5" />}
              </button>
            )}
            <button 
              onClick={onToggle}
              className="p-1 hover:bg-sidebar-accent rounded"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isEditMode && !collapsed && (
          <div className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-medium text-center">
            Drag items to reorder
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto no-scrollbar">
          <ul className="space-y-0.5 px-2">
            {sortedAccessibleItems.map((item, index) => {
              const isActive = location.pathname === item.path || 
                location.pathname.startsWith(item.path + '/');
              
              if (item.hasDropdown && !collapsed) {
                return (
                  <li
                    key={item.path}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      isEditMode && 'cursor-grab active:cursor-grabbing',
                      dragOverIndex === index && 'border-t-2 border-primary'
                    )}
                  >
                    <button
                      onClick={() => setReportsOpen(!reportsOpen)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                        isActive || reportsOpen
                          ? 'bg-sidebar-accent text-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                      {reportsOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {reportsOpen && item.dropdownItems && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-sidebar-border space-y-0.5">
                        {item.dropdownItems.filter(subItem => !subItem.featureKey || canAccess(subItem.featureKey)).map((subItem) => {
                          if (!subItem.path) {
                            return (
                              <li key={subItem.label} className="px-3 py-1">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{subItem.label.replace(/─/g, '').trim()}</span>
                              </li>
                            );
                          }
                          return (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                className={cn(
                                  'block px-3 py-2 text-sm rounded-lg transition-colors',
                                  location.pathname === subItem.path
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                                )}
                              >
                                {subItem.label}
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
                <li
                  key={item.path}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    isEditMode && 'cursor-grab active:cursor-grabbing',
                    dragOverIndex === index && 'border-t-2 border-primary'
                  )}
                >
                  <div className="flex items-center">
                    {isEditMode && !collapsed && (
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
                    )}
                    <Link
                      to={isEditMode ? '#' : item.path}
                      onClick={(e) => { if (isEditMode) e.preventDefault(); }}
                      className={cn(
                        'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                        isActive
                          ? 'bg-sidebar-accent text-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.label}</span>
                      )}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Check Updates & Logout */}
          <div className="mt-4 px-2 space-y-0.5">
            <button
              onClick={handleCheckUpdates}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed && 'justify-center px-2'
              )}
            >
              <RefreshCw className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Check Updates</span>}
            </button>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed && 'justify-center px-2'
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Logout</span>}
            </button>
          </div>
        </nav>

        {/* Footer Info */}
        {!collapsed && (
          <div className="border-t border-sidebar-border">
            <div className="px-4 py-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Ref ID : A410961R</span>
                <span>Version : 119.0.2</span>
              </div>
            </div>
            <div className="px-4 py-2 bg-muted/50 text-center">
              <span className="text-xs text-muted-foreground">
                Biller : {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'biller'}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};
