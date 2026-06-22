import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import {
  Power,
  PowerOff,
  Store,
  Eye,
  LogOut,
  LogIn,
  HelpCircle,
  X,
  Menu,
  Settings,
  FileText,
  BarChart3,
  RefreshCw,
  User,
  Receipt,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

interface BillingHeaderProps {
  onMenuToggle?: () => void;
}

export const BillingHeader: React.FC<BillingHeaderProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { orders, heldBills, isOnline, activeStore } = usePOS();
  const { t } = useLocale();
  const { canAccess } = useSubscription();
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [itemsEnabled, setItemsEnabled] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const recentOrders = orders.slice(-5);
  const alerts = orders.filter(o => o.status === 'pending' && !o.kotPrinted);

  const billerName = localStorage.getItem('pos_biller_name') || 'Admin';
  const version = '1.0.0';
  const refId = 'QP-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const handleLogout = () => {
    toast.success(t('auth.logout'));
    setIsLoggedIn(false);
    navigate('/');
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    toast.success(t('auth.login'));
  };

  return (
    <div className="bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section - Main Controls */}
        <div className="flex items-center gap-2">
          {/* Menu Button */}
          <button
            onClick={() => setShowMainMenu(!showMainMenu)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>


          {/* Store Display - Single store only */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
              activeStore 
                ? "bg-primary/20 text-primary" 
                : "bg-secondary"
            )}
          >
            <Store className="w-4 h-4" />
            {activeStore ? activeStore.name : 'No Store'}
          </div>

          {/* Online/Offline Status */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
              onlineStatus ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            )}
          >
            {onlineStatus ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {onlineStatus ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Center Section - Spacer */}
        <div className="flex-1" />

        {/* Right Section - User Actions */}
        <div className="flex items-center gap-2">
          {/* Support */}
          <button
            onClick={() => navigate('/support')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Login/Logout */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.logout')}
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {t('auth.login')}
            </button>
          )}
        </div>
      </div>

      {/* Main Menu Dropdown */}
      {showMainMenu && (
        <div className="absolute left-4 top-14 z-50 bg-card border border-border rounded-xl shadow-xl p-2 min-w-64 animate-scale-in">
          <div className="p-3 border-b border-border mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{billerName}</p>
                <p className="text-xs text-muted-foreground">Ref: {refId}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => { navigate('/pos'); setShowMainMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <Receipt className="w-5 h-5 text-primary" />
              <span className="font-medium">{t('pos.billing')}</span>
            </button>
            <button
              onClick={() => { navigate('/orders'); setShowMainMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span>{t('nav.operations')}</span>
            </button>
            {canAccess('basicReports') && (
              <button
                onClick={() => { navigate('/'); setShowMainMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                <span>{t('nav.reports')}</span>
              </button>
            )}
            <button
              onClick={() => { navigate('/settings'); setShowMainMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span>{t('nav.settings')}</span>
            </button>
            <button
              onClick={() => {
                toast.success('Checking for updates...');
                setTimeout(() => toast.info('You are on the latest version'), 2000);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <span>{t('common.update')}</span>
            </button>
            <div className="border-t border-border my-2" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('auth.logout')}</span>
            </button>
          </nav>

          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
              <span>Version {version}</span>
              <span>Ref: {refId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-4 top-14 z-50 bg-card border border-border rounded-xl shadow-xl p-4 w-80 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-secondary rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No new notifications</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.map((order) => (
                <div key={order.id} className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm font-medium text-foreground">New Order #{order.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{order.items.length} items - Pending KOT</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {(showMainMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => { setShowMainMenu(false); setShowNotifications(false); }}
        />
      )}
    </div>
  );
};
