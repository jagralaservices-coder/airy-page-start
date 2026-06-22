import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { 
  Menu,
  Plus,
  Search,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Settings,
  Wrench,
  X,
  Store,
  Users,
  MessageCircle,
  Package,
  FileText,
  Truck,
  Calculator,
  Sun,
  Moon,
  QrCode,
  Building
} from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePOS, usePOSSafe } from '@/contexts/POSContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { OwnerStoreSelectionDialog } from '@/components/pos/OwnerStoreSelectionDialog';

import MAXORAIcon from '@/assets/maxora-icon.jpg';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';

export const MobileHeader: React.FC = () => {
  const { user, userRole, logout, hasRole, isAuthenticated } = useSupabaseAuth();
  const posContext = usePOSSafe();
  const { orders, clearCart } = usePOS();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const { canAccess } = useSubscription();
  const navigate = useNavigate();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if logged in via store login
  const isStoreLogin = posContext?.isStoreLogin || false;
  const activeStore = posContext?.activeStore;

  const [showStoreSelection, setShowStoreSelection] = useState(false);
  const { 
    selectedStoreName, 
    shouldShowStoreSelection, 
    selectStore, 
    dismissStoreSelection,
    isOwner
  } = useOwnerStore();

  // Auto-show store selection for owner on first login (mobile-specific)
  useEffect(() => {
    if (shouldShowStoreSelection && isAuthenticated && !isStoreLogin) {
      const timer = setTimeout(() => {
        setShowStoreSelection(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldShowStoreSelection, isAuthenticated, isStoreLogin]);

  // Check for staff login session
  const staffSession = typeof window !== 'undefined' ? localStorage.getItem('pos_staff_session') : null;
  const isStaffLoggedIn = !!staffSession;
  const staffData = staffSession ? JSON.parse(staffSession) : null;

  // Determine the current login type
  const getLoginType = () => {
    if (isStaffLoggedIn) return 'staff';
    if (isStoreLogin && activeStore) return 'store';
    if (isAuthenticated && userRole) return userRole.role;
    return null;
  };

  const loginType = getLoginType();

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: '' },
    { path: '/pos', icon: Plus, labelKey: 'pos.billing', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: '' },
    { path: '/tables', icon: UtensilsCrossed, labelKey: 'nav.tables', roles: ['super_admin', 'admin', 'owner', 'store_manager', 'staff'], featureKey: 'tableManagement' },
    { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders', roles: ['super_admin', 'admin', 'owner', 'store_manager', 'staff'], featureKey: '' },
    { path: '/kitchen', icon: ChefHat, labelKey: 'nav.kitchen', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'dineIn' },
    { path: '/inventory', icon: Package, labelKey: 'nav.inventory', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'basicInventory' },
    { path: '/menu', icon: FileText, labelKey: 'nav.menu', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: '' },
    { path: '/reports', icon: Calculator, labelKey: 'nav.reports', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'basicReports' },
    { path: '/qr-orders', icon: QrCode, labelKey: 'Menu Orders', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'qrMenuOrdering' },
    { path: '/delivery', icon: Truck, labelKey: 'nav.delivery', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'deliveryTracking' },
    { path: '/operations', icon: Wrench, labelKey: 'nav.operations', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: '' },
    { path: '/chat', icon: MessageCircle, labelKey: 'common.teamChat', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: 'teamChat' },
    { path: '/settings', icon: Settings, labelKey: 'nav.settings', roles: ['super_admin', 'admin', 'owner', 'store_manager'], featureKey: '' },
  ];

  // Staff-specific menu items
  const staffMenuItems = [
    { path: '/staff-dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { path: '/leave-request', icon: ClipboardList, labelKey: 'common.leaveRequest' },
    { path: '/advance-request', icon: ClipboardList, labelKey: 'common.advanceRequest' },
    { path: '/staff-notifications', icon: Bell, labelKey: 'common.notifications' },
    { path: '/chat', icon: Users, labelKey: 'common.teamChat' },
  ];

  // Determine which menu items to show
  const getAccessibleMenuItems = () => {
    if (isStaffLoggedIn) return staffMenuItems;
    const filtered = isStoreLogin ? menuItems : menuItems.filter(item => hasRole(item.roles as any[]));
    return filtered.filter(item => !item.featureKey || canAccess(item.featureKey));
  };

  const accessibleMenuItems = getAccessibleMenuItems();

  const handleNewOrder = () => {
    clearCart();
    navigate('/pos');
    setShowMenu(false);
  };

  const handleLogout = () => {
    if (isStaffLoggedIn) {
      // Staff logout - clear staff session
      localStorage.removeItem('pos_staff_session');
      navigate('/');
    } else if (isStoreLogin && posContext?.logoutStore) {
      posContext.logoutStore();
      navigate('/');
    } else {
      logout();
      navigate('/');
    }
    setShowMenu(false);
  };

  // Handle profile/user icon click based on login type
  const handleProfileClick = () => {
    if (isStaffLoggedIn) {
      navigate('/staff-dashboard');
    } else if (isStoreLogin) {
      navigate('/settings');
    } else if (isAuthenticated && userRole) {
      switch (userRole.role) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'owner':
          navigate('/owner-settings');
          break;
        case 'store_manager':
          navigate('/settings');
          break;
        default:
          navigate('/settings');
      }
    } else {
      navigate('/');
    }
  };

  // Get display info for header
  const getDisplayInfo = () => {
    if (isStaffLoggedIn && staffData) {
      return {
        name: staffData.name || t('nav.staff'),
        subtitle: t('auth.staffLogin'),
        icon: <User className="w-4 h-4 text-primary" />
      };
    }
    if (isStoreLogin && activeStore) {
      return {
        name: activeStore.name,
        subtitle: t('common.storeLoginMode'),
        icon: <Store className="w-4 h-4 text-primary" />
      };
    }
    if (isAuthenticated && user) {
      return {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        subtitle: userRole?.role || 'User',
        icon: <User className="w-4 h-4 text-primary" />
      };
    }
    return null;
  };

  const displayInfo = getDisplayInfo();

  return (
    <>
      <header className="min-h-14 bg-card/95 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-3 flex-shrink-0 sticky top-0 z-40 pt-safe">
        {/* Left - Menu & Logo */}
        <div className="flex items-center gap-2">
          <Drawer open={showMenu} onOpenChange={setShowMenu}>
            <DrawerTrigger asChild>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
                    <img src={MAXORAIcon} alt="MAXORA" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <DrawerTitle className="text-left">
                      {displayInfo?.name || 'MAXORA'}
                    </DrawerTitle>
                    <p className="text-sm text-muted-foreground">
                      {displayInfo?.subtitle || t('common.notLoggedIn')}
                    </p>
                  </div>
                </div>
              </DrawerHeader>
              
              <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                {/* Store Selection for Owner */}
                {isOwner && isAuthenticated && !isStoreLogin && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Store</p>
                        <p className="text-sm font-semibold text-foreground">{selectedStoreName}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setShowMenu(false);
                        setShowStoreSelection(true);
                      }}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:bg-primary/95 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* New Order Button - Only for non-staff */}
                {!isStaffLoggedIn && (
                  <button
                    onClick={handleNewOrder}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary text-primary-foreground font-semibold"
                  >
                    <Plus className="w-6 h-6" />
                    {t('common.newOrder')}
                  </button>
                )}

                {/* Menu Items */}
                {accessibleMenuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <item.icon className="w-6 h-6 text-muted-foreground" />
                    <span className="font-medium">{t(item.labelKey)}</span>
                  </button>
                ))}

                {/* Theme Toggle in Menu */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-colors"
                >
                  {theme === 'light' ? (
                    <Moon className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <Sun className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="font-medium">{theme === 'light' ? t('common.darkMode') : t('common.lightMode')}</span>
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors mt-4"
                >
                  <LogOut className="w-6 h-6" />
                  <span className="font-medium">{t('nav.logout')}</span>
                </button>
              </div>
            </DrawerContent>
          </Drawer>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <img src={MAXORAIcon} alt="MAXORA" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground">MAXORA</span>
              <div className="flex items-center gap-1">
                <div className={cn('w-1.5 h-1.5 rounded-full', navigator.onLine ? 'bg-success animate-pulse' : 'bg-destructive')} />
                <span className="text-[10px] text-muted-foreground">{navigator.onLine ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle Button in Header */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSearch(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>


          {!isStaffLoggedIn && (
            <button
              onClick={() => navigate('/orders')}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {pendingOrders > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingOrders}
                </span>
              )}
            </button>
          )}

          {isStaffLoggedIn && (
            <button
              onClick={() => navigate('/staff-notifications')}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors relative"
            >
              <Bell className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              {displayInfo?.icon || <User className="w-4 h-4 text-primary" />}
            </div>
          </button>
        </div>
      </header>

      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary"
              >
                <X className="w-6 h-6" />
              </button>
              <Input
                type="text"
                placeholder={t('common.searchMenu')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-12 text-lg"
                autoFocus
              />
            </div>

            {searchQuery && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Search for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Store Selection Dialog */}
      <OwnerStoreSelectionDialog
        isOpen={showStoreSelection}
        onClose={() => {
          setShowStoreSelection(false);
          dismissStoreSelection();
        }}
        onSelectStore={(store) => {
          selectStore(store);
        }}
      />
    </>
  );
};
