import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Sun, 
  Moon, 
  Plus, 
  Search, 
  FileText, 
  ToggleLeft, 
  ToggleRight,
  Store, 
  Eye, 
  ClipboardList,
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Package,
  BarChart3,
  Settings,
  Users,
  LogOut,
  LogIn,
  User,
  BookOpen,
  ChevronDown,
  Check,
  RefreshCw,
  Building,
  Lock,
  Pencil,
  Database
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePOSSafe } from '@/contexts/POSContext';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/store';
import MAXORAIcon from '@/assets/maxora-icon.jpg';
import maxoraLogo from '@/assets/maxora-logo.png';
import { MaxoraLogo } from '@/components/ui/MaxoraLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { StaffPinLogin } from '@/components/pos/StaffPinLogin';
import { LogoutConfirmDialog } from '@/components/pos/LogoutConfirmDialog';
import { OwnerStoreSelectionDialog } from '@/components/pos/OwnerStoreSelectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';


interface ActiveStaff {
  id: string;
  name: string;
  staffCode: string;
  role: string;
}

export const AppHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, userRole, logout, hasRole, isAuthenticated } = useSupabaseAuth();
  const posContext = usePOSSafe();
  const { tier, tierLabel, businessType } = useSubscription();
  const heldBills = posContext?.heldBills ?? [];
  const orders = posContext?.orders ?? [];
  const clearCart = posContext?.clearCart ?? (() => {});
  const activeStore = posContext?.activeStore ?? null;
  const isStoreLogin = posContext?.isStoreLogin ?? false;
  const logoutStore = posContext?.logoutStore ?? (() => {});
  const { 
    selectedStoreName, 
    shouldShowStoreSelection, 
    selectStore, 
    dismissStoreSelection,
    isOwner: isOwnerFromHook 
  } = useOwnerStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);
  const [itemsEnabled, setItemsEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showStaffLogoutConfirm, setShowStaffLogoutConfirm] = useState(false);
  const [showStoreSelection, setShowStoreSelection] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [storeChangePassword, setStoreChangePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(() => {
    const stored = localStorage.getItem('pos_active_staff');
    return stored ? JSON.parse(stored) : null;
  });
  const [staffList, setStaffList] = useState<any[]>([]);

  const isOwner = userRole?.role === 'owner' || userRole?.role === 'admin' || userRole?.role === 'super_admin';

  // Auto-show store selection for owner on first login
  useEffect(() => {
    // Use setTimeout to avoid updating state during render cycle
    if (shouldShowStoreSelection && isAuthenticated && !isStoreLogin) {
      const timer = setTimeout(() => {
        setShowStoreSelection(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldShowStoreSelection, isAuthenticated, isStoreLogin]);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

  // Fetch staff list for current store
  useEffect(() => {
    if (isStoreLogin && activeStore?.id) {
      fetchStaffList();
    }
  }, [isStoreLogin, activeStore?.id]);

  const fetchStaffList = async () => {
    if (!activeStore?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          staff_code,
          role,
          profiles:user_id (full_name)
        `)
        .eq('store_id', activeStore.id)
        .in('role', ['store_manager', 'staff'])
        .eq('is_active', true);

      if (error) throw error;
      
      const formattedStaff = (data || []).map((item: any) => ({
        ...item,
        full_name: item.profiles?.full_name
      }));
      
      setStaffList(formattedStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleStaffLogin = (staff: ActiveStaff) => {
    setActiveStaff(staff);
    localStorage.setItem('pos_active_staff', JSON.stringify(staff));
  };

  const handleStaffLogout = () => {
    setShowStaffLogoutConfirm(false);
    setActiveStaff(null);
    localStorage.removeItem('pos_active_staff');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
    { path: '/pos', icon: Plus, label: 'POS / Billing', roles: ['store_manager'] },
    { path: '/menu', icon: BookOpen, label: 'Menu', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
    { path: '/bulk-upload', icon: FileText, label: 'Menu Upload', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
    { path: '/tables', icon: UtensilsCrossed, label: 'Tables', roles: ['super_admin', 'admin', 'owner', 'store_manager', 'staff'] },
    { path: '/orders', icon: ClipboardList, label: 'Orders', roles: ['super_admin', 'admin', 'owner', 'store_manager', 'staff'] },
    { path: '/kitchen', icon: ChefHat, label: 'Kitchen', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
    { path: '/inventory', icon: Package, label: 'Inventory', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['super_admin', 'admin', 'owner'] },
    { path: '/staff-portal', icon: Users, label: 'Staff Portal', roles: ['staff'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'admin', 'owner', 'store_manager'] },
  ];

  const accessibleMenuItems = menuItems.filter(item => 
    hasRole(item.roles as any[])
  );

  const handleNewOrder = () => {
    clearCart();
    navigate('/pos');
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    // If logged in via store login, also logout store
    if (isStoreLogin) {
      logoutStore();
    }
    logout();
    navigate('/');
  };

  const confirmStoreLogout = () => {
    setShowLogoutConfirm(false);
    logoutStore();
    navigate('/');
  };

  const handleStoreChangeRequest = () => {
    setStoreChangePassword('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    if (!storeChangePassword) {
      setPasswordError('Please enter your password');
      return;
    }
    
    try {
      // Verify password by re-authenticating
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: storeChangePassword,
      });

      if (error) {
        setPasswordError('Incorrect password');
        return;
      }

      setShowPasswordDialog(false);
      setStoreChangePassword('');
      setShowStoreSelection(true);
    } catch (error) {
      setPasswordError('Failed to verify password');
    }
  };

  const handleStoreSelected = (store: any) => {
    selectStore(store);
  };

  const handleStoreDialogClose = () => {
    setShowStoreSelection(false);
    dismissStoreSelection();
  };

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center px-3 gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
        {/* Menu Button removed - sidebar handles navigation */}

        {/* Logo + Plan Badge */}
        <div className="flex items-center gap-2 px-1 flex-shrink-0">
          <div className="hidden sm:flex flex-col justify-center leading-tight">
            <MaxoraLogo size="sm" className="items-start" />
            <span className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded-full w-fit mt-0.5',
              tier === 'platinum' && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
              tier === 'gold' && 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black',
              tier === 'basic' && 'bg-muted text-muted-foreground',
            )}>
              {tierLabel} Plan
            </span>
          </div>
          {/* Mobile plan badge */}
          <span className={cn(
            'sm:hidden text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
            tier === 'platinum' && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
            tier === 'gold' && 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black',
            tier === 'basic' && 'bg-muted text-muted-foreground',
          )}>
            {tierLabel}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-1 flex-shrink-0" />

        {/* New Order */}
        {userRole?.role !== 'admin' && userRole?.role !== 'super_admin' && userRole?.role !== 'owner' && (
          <Button
            onClick={handleNewOrder}
            size="sm"
            className="h-9 gap-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Order</span>
          </Button>
        )}

        {/* Search Bill - Now navigates to full page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/search-bill')}
          className="h-9 gap-1.5 flex-shrink-0"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline">Search Bill</span>
        </Button>

        {/* Search KOT */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/search-bill?type=kot')}
          className="h-9 gap-1.5 flex-shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden md:inline">Search KOT</span>
        </Button>

        {/* Active Store Display - When logged in via store login */}
        {isStoreLogin && activeStore && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg flex-shrink-0">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{activeStore.name}</span>
          </div>
        )}

        {/* Owner Store Selection - For owner/admin login */}
        {isOwner && isAuthenticated && !isStoreLogin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStoreChangeRequest}
            className="h-9 gap-1.5 flex-shrink-0"
          >
            <Building className="w-4 h-4" />
            <span className="hidden md:inline">{selectedStoreName || 'All Stores'}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        )}

        {/* Staff Switch Button - Only in store login mode */}
        {isStoreLogin && activeStore && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeStaff ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 flex-shrink-0"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{activeStaff?.name || 'Staff'}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
              {activeStaff ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="font-medium">{activeStaff.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {activeStaff.staffCode}</p>
                    <p className="text-xs text-primary capitalize">{activeStaff.role}</p>
                  </div>
                  <DropdownMenuItem 
                    onClick={() => setShowStaffLogin(true)}
                    className="cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Switch Staff
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowStaffLogoutConfirm(true)}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Staff Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm text-muted-foreground">No staff logged in</p>
                  </div>
                  <DropdownMenuItem 
                    onClick={() => setShowStaffLogin(true)}
                    className="cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Staff Login
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-1 flex-shrink-0" />

        {/* Generate Demo Data Button — super_admin only */}
        {userRole?.role === 'super_admin' && (
        <Button
          variant="outline"
          size="sm"
            onClick={async () => {
              try {
                toast({ title: 'Generating demo data...', description: 'This may take a moment. Please wait...' });
                try {
                  const { data, error } = await supabase.functions.invoke('generate-demo-data', {
                    body: { email: user?.email, name: user?.user_metadata?.full_name, storeId: activeStore?.id }
                  });
                  if (error) throw error;
                  if (!data?.success) throw new Error(data?.error || 'Unknown error');
                } catch (edgeError) {
                  console.log("Edge function failed, falling back to local generation...", edgeError);
                  // Fallback to client-side generation
                  const { generateClientDemoData } = await import('@/lib/demoData');
                  if (activeStore?.id) {
                    await generateClientDemoData(activeStore.id, user?.id || 'demo');
                  } else {
                    throw new Error("No active store to generate data for.");
                  }
                }
                toast({ title: 'Success', description: 'Demo data generated successfully! Please refresh the page.' });
                setTimeout(() => window.location.reload(), 2000);
              } catch (e: any) {
                console.error("Demo gen error:", e);
                toast({ title: 'Error', description: e.message || 'Failed to generate demo data', variant: 'destructive' });
              }
            }}
            className="h-9 gap-1.5 flex-shrink-0 border-primary text-primary hover:bg-primary/10"
            title="Generate Demo Data (90 Days) — Super Admin only"
          >
          <Database className="w-4 h-4" />
          <span className="hidden lg:inline">Generate Demo Data</span>
        </Button>
        )}

        {/* Edit UI / Customize */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/ui-customization')}
          className="h-9 w-9 flex-shrink-0"
          title="Customize Software"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 flex-shrink-0"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        {/* Login/Logout */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium hidden sm:block">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole?.role === 'store_manager' ? 'Store Manager' : userRole?.role}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : isStoreLogin && activeStore ? (
          // Store login mode (not authenticated via Supabase but logged in as store)
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium hidden sm:block">{activeStore.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{activeStore.name}</p>
                <p className="text-xs text-muted-foreground">Store Login</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="h-9 gap-1.5 flex-shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        )}
      </header>

      {/* Menu Drawer */}
      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="sm:max-w-[300px] p-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
                <img src={MAXORAIcon} alt="MAXORA" className="w-full h-full object-cover" />
              </div>
              <div>
                <img src={maxoraLogo} alt="MAXORA" className="h-6 object-contain" />
                <p className="text-xs text-muted-foreground font-normal mt-1">{user?.user_metadata?.full_name || user?.email?.split('@')[0]} • {userRole?.role === 'store_manager' ? 'Store Manager' : userRole?.role}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <nav className="p-2">
            {accessibleMenuItems.map(item => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setShowMenu(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-2 border-t border-border">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>



      {/* Staff PIN Login Modal */}
      <StaffPinLogin
        isOpen={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
        onStaffLogin={handleStaffLogin}
        storeId={activeStore?.id || ''}
        staffList={staffList}
      />

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={isStoreLogin && !isAuthenticated ? confirmStoreLogout : confirmLogout}
      />

      {/* Staff Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showStaffLogoutConfirm}
        onClose={() => setShowStaffLogoutConfirm(false)}
        onConfirm={handleStaffLogout}
        title="Staff Logout"
        description="Are you sure you want to logout this staff member?"
      />

      {/* Owner Store Selection Dialog */}
      <OwnerStoreSelectionDialog
        isOpen={showStoreSelection}
        onClose={handleStoreDialogClose}
        onSelectStore={handleStoreSelected}
      />

      {/* Password Verification Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Verify Password</DialogTitle>
                <DialogDescription>
                  Enter your password to change store
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="Enter your password"
              value={storeChangePassword}
              onChange={(e) => {
                setStoreChangePassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
            />
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit} className="flex-1">
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
