import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Globe,
  FileText,
  Users,
  TrendingUp,
  Wallet,
  DollarSign,
  Plus,
  Package,
  Bell,
  Table,
  RefreshCw,
  HelpCircle,
  Eye,
  CreditCard,
  UserCircle,
  Truck,
  MessageSquare,
  Mail,
  Languages,
  Coins,
  UserCog,
  Calendar,
  CheckSquare,
  ToggleRight,
  Store,
  UtensilsCrossed,
  ClipboardList,
  Clock,
  PauseCircle,
  Building,
  Printer,
  Settings,
  ArrowLeft,
  RotateCcw,
  Database,
  Trash2,
  FileArchive,
  ScrollText,
  Cpu,
  QrCode,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Shield,
  Lock,
  SlidersHorizontal,
  GripVertical,
  Pencil,
  Check
} from 'lucide-react';
import { FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailySalesReport } from './DailySalesReport';
import { StockAlertsDialog } from './StockAlertsDialog';
import { StoreStaffSettings } from './StoreStaffSettings';
import PrintSettings from './PrintSettings';
import { KOTSettings } from './KOTSettings';
import { SalesResetSettings } from './SalesResetSettings';
import { PaymentSoundSettings } from './PaymentSoundSettings';
import { RestaurantConfigSettings } from './RestaurantConfigSettings';
import { ResetBillDialog } from './ResetBillDialog';
import { ResetSyncCodeDialog } from './ResetSyncCodeDialog';
import { DatabaseMigrationDialog } from './DatabaseMigrationDialog';
import { RemoveAllOrdersDialog } from './RemoveAllOrdersDialog';
import { RemoveBackupFilesDialog } from './RemoveBackupFilesDialog';
import { LogsViewer } from './LogsViewer';
import { CheckMachineDialog } from './CheckMachineDialog';
import { GenerateCodeDialog } from './GenerateCodeDialog';
import { ClosingHoursWarningDialog } from './ClosingHoursWarningDialog';
import { OwnerStoreSelectionDialog } from './OwnerStoreSelectionDialog';
import { StoreLocationSettings } from './StoreLocationSettings';
import { WithdrawalDialog } from './WithdrawalDialog';
import { CashTopUpDialog } from './CashTopUpDialog';
import { BillConfigSettings } from './BillConfigSettings';
import { useClosingTimeWarning } from '@/hooks/useClosingTimeWarning';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURES } from '@/lib/subscriptionConfig';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUICustomization } from '@/hooks/useUICustomization';

interface OperationItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action?: () => void;
  path?: string;
  featureKey?: keyof typeof FEATURES;
}

type SettingsView = 'stores' | 'printer' | 'sales-reset' | 'blank' | 'restaurant-config' | 'logs' | null;

export const OperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useSupabaseAuth();
  const { t } = useLocale();
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [showResetBillDialog, setShowResetBillDialog] = useState(false);
  const [showResetSyncCodeDialog, setShowResetSyncCodeDialog] = useState(false);
  const [showDatabaseMigrationDialog, setShowDatabaseMigrationDialog] = useState(false);
  const [showRemoveAllOrdersDialog, setShowRemoveAllOrdersDialog] = useState(false);
  const [showRemoveBackupFilesDialog, setShowRemoveBackupFilesDialog] = useState(false);
  const [showCheckMachineDialog, setShowCheckMachineDialog] = useState(false);
  const [showGenerateCodeDialog, setShowGenerateCodeDialog] = useState(false);
  const [showStoreSelectionDialog, setShowStoreSelectionDialog] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showCashTopUpDialog, setShowCashTopUpDialog] = useState(false);
  const [activeSettingsView, setActiveSettingsView] = useState<SettingsView>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Closing time warning hook
  const { showWarning, closingTime, extendClosingTime, dismissWarning } = useClosingTimeWarning();
  
  // Check if store login mode
  const isStoreLogin = localStorage.getItem('pos_is_store_login') === 'true';
  const isOwner = userRole?.role === 'owner' || userRole?.role === 'admin' || userRole?.role === 'super_admin';
  const { canAccess, requiresUpgrade } = useSubscription();
  const { getOperationsOrder, reorderOperations } = useUICustomization();

  // Show store selection dialog for owners on first visit
  useEffect(() => {
    if (isOwner && !isStoreLogin) {
      const hasSelectedStore = localStorage.getItem('owner_store_selection_shown');
      if (!hasSelectedStore) {
        setShowStoreSelectionDialog(true);
        localStorage.setItem('owner_store_selection_shown', 'true');
      }
      // Load previously selected store
      const savedStoreName = localStorage.getItem('owner_selected_store_name');
      if (savedStoreName) {
        setSelectedStoreName(savedStoreName);
      }
    }
    
    // Get active store ID for location settings
    const storeData = localStorage.getItem('pos_active_store_data');
    const storeLogin = localStorage.getItem('store_login');
    if (storeData) {
      try {
        const parsed = JSON.parse(storeData);
        setActiveStoreId(parsed.id);
      } catch (e) {}
    } else if (storeLogin) {
      try {
        const parsed = JSON.parse(storeLogin);
        setActiveStoreId(parsed.store_id);
      } catch (e) {}
    }
  }, [isOwner, isStoreLogin]);

  const operations: OperationItem[] = [
    // Dashboard - Always first
    { id: 'dashboard', icon: LayoutDashboard, label: t('operations.dashboard'), path: '/dashboard' },
    // Quick Actions Row
    { id: 'menu', icon: UtensilsCrossed, label: t('operations.menu'), path: '/menu' },
    { id: 'reports', icon: BarChart3, label: t('nav.reports'), path: '/reports' },
    { id: 'orders', icon: ClipboardList, label: t('operations.orders'), path: '/orders' },
    { id: 'recent', icon: Clock, label: t('operations.recent'), path: '/search-bill' },
    { id: 'hold', icon: PauseCircle, label: t('operations.hold'), path: '/pos' },
    { id: 'alerts', icon: Bell, label: t('operations.alerts'), action: () => setShowStockAlerts(true) },
    // Show Stores only for owner login (not store login)
    ...(isOwner && !isStoreLogin ? [{ id: 'stores', icon: Store, label: t('operations.stores'), path: '/stores' }] : []),
    // Main Operations
    { id: 'online-orders', icon: Globe, label: t('operations.onlineOrders'), path: '/online-orders', featureKey: 'swiggyZomato' as keyof typeof FEATURES },
    
    { id: 'customers', icon: Users, label: t('operations.customers'), path: '/customers' },
    { id: 'inventory', icon: Package, label: t('operations.inventory'), path: '/inventory', featureKey: 'basicInventory' as keyof typeof FEATURES },
    ...(canAccess('tableManagement') ? [{ id: 'table', icon: Table, label: t('operations.table'), path: '/tables' }] : []),
    { id: 'manual-sync', icon: RefreshCw, label: t('operations.manualSync'), action: () => toast.success(t('operations.dataSynced')) },
    ...(canAccess('staffManagement') ? [
      { id: 'staff-settings', icon: UserCog, label: t('operations.staffSettings'), path: '/staff-settings' },
    ] : []),
    { id: 'help', icon: HelpCircle, label: t('operations.help'), path: '/support' },
    
    { id: 'lang-profiles', icon: Languages, label: t('operations.language'), path: '/owner-settings?view=locale' },
    { id: 'billing-profile', icon: UserCircle, label: t('operations.billingProfile'), path: '/owner-settings' },
    { id: 'currency', icon: Coins, label: t('operations.currency'), path: '/owner-settings?view=locale' },
    { id: 'feedback', icon: MessageSquare, label: t('operations.feedback'), path: '/owner-settings?view=feedback' },
    ...(canAccess('deliveryBoys') ? [{ id: 'delivery-boys', icon: Truck, label: t('operations.deliveryBoys'), path: '/owner-settings?view=deliveryBoys' }] : []),
    // Settings items - moved from Settings page
    { id: 'store-location', icon: MapPin, label: t('operations.storeLocation'), action: () => setShowLocationSettings(true) },
    { id: 'printer-bill', icon: Printer, label: t('operations.printerBill'), path: '/settings?view=print' },
    { id: 'sales-reset', icon: Settings, label: t('operations.salesReset'), path: '/settings?view=salesReset' },

    ...(canAccess('teamChat') ? [{ id: 'team-chat', icon: MessageSquare, label: t('common.teamChat'), path: '/chat' }] : []),
    { id: 'ui-customization', icon: SlidersHorizontal, label: 'Customize Software', path: '/ui-customization' },
    { id: 'blank-settings', icon: Settings, label: t('operations.settings'), path: '/settings' },
  ];
  // Sort operations by saved order
  const savedOpsOrder = getOperationsOrder();
  const sortedOperations = useMemo(() => {
    if (savedOpsOrder.length === 0) return operations;
    return [...operations].sort((a, b) => {
      const aIdx = savedOpsOrder.findIndex(o => o.id === a.id);
      const bIdx = savedOpsOrder.findIndex(o => o.id === b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [operations, savedOpsOrder]);

  const handleOpDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleOpDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleOpDrop = (e: React.DragEvent, index: number) => {
    if (!isEditMode || dragIndex === null) return;
    e.preventDefault();
    const visibleOps = sortedOperations.filter(item => !(item.featureKey && !canAccess(item.featureKey)));
    const allIds = visibleOps.map(i => i.id);
    reorderOperations(dragIndex, index, allIds);
    setDragIndex(null);
    setDragOverIndex(null);
    toast.success('Operations order saved');
  };

  const handleOpDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleClick = (item: OperationItem) => {
    if (isEditMode) return;
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  // Get store and staff IDs for display
  const storeData = localStorage.getItem('pos_store_login_data');
  const parsedStoreData = storeData ? JSON.parse(storeData) : null;
  const storeId = parsedStoreData?.store_id || (() => {
    try {
      const activeStore = localStorage.getItem('pos_active_store');
      if (activeStore) {
        const parsed = JSON.parse(activeStore);
        if (parsed) return parsed;
      }
    } catch {}
    return localStorage.getItem('pos_store_id') || '';
  })();
  const storeCode = parsedStoreData?.store_code || localStorage.getItem('pos_store_code') || '';
  const billerName = localStorage.getItem('pos_current_biller') || '';
  const staffCode = localStorage.getItem('pos_staff_code') || '';

  // Settings view titles
  const settingsTitles: Record<string, string> = {
    'stores': t('operations.storesStaff'),
    'printer': t('operations.printerBill'),
    'bill-config': t('operations.billConfig'),
    'kot': t('operations.kotSettings'),
    'sales-reset': t('operations.salesReset'),
    'blank': t('operations.settings'),
    'restaurant-config': t('operations.restaurantConfig'),
    'logs': t('operations.logs')
  };

  // Render settings content based on active view
  const renderSettingsContent = () => {
    switch (activeSettingsView) {
      case 'stores':
        return <StoreStaffSettings />;
      case 'printer':
        return (
          <div className="space-y-6">
            <PrintSettings onBack={() => setActiveSettingsView(null)} />
            <div className="border-t border-border pt-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Bill Configuration</h4>
              <BillConfigSettings />
            </div>
            {canAccess('kot') && (
              <div className="border-t border-border pt-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">KOT Settings</h4>
                <KOTSettings />
              </div>
            )}
            {canAccess('kot') && (
              <div className="border-t border-border pt-6">
                <button
                  onClick={() => navigate('/kot-listing')}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-secondary hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">View KOT Listing</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        );
      case 'sales-reset':
        return (
          <div className="space-y-8">
            <SalesResetSettings />
            <div className="border-t border-border pt-6">
              <PaymentSoundSettings />
            </div>
          </div>
        );
      case 'restaurant-config':
        return <RestaurantConfigSettings onBack={() => setActiveSettingsView('blank')} />;
      case 'logs':
        return <LogsViewer onBack={() => setActiveSettingsView('blank')} />;
      case 'blank':
        const settingsItems = [
          { id: 'restaurant-config', icon: Building, label: t('operations.restaurantConfig') },
          { id: 'reset-bill', icon: RotateCcw, label: t('operations.resetBillNo') },
          { id: 'reset-sync', icon: RefreshCw, label: t('operations.resetSyncCode') },
          { id: 'db-migration', icon: Database, label: t('operations.dbMigration') },
          { id: 'remove-orders', icon: Trash2, label: t('operations.removeOrders') },
          { id: 'remove-backup', icon: FileArchive, label: t('operations.removeBackup') },
          { id: 'logs', icon: ScrollText, label: t('operations.logs') },
          { id: 'check-machine', icon: Cpu, label: t('operations.checkMachine') },
          { id: 'generate-code', icon: QrCode, label: t('operations.generateCode') },
        ];
        return (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'restaurant-config') {
                    setActiveSettingsView('restaurant-config');
                  } else if (item.id === 'reset-bill') {
                    setShowResetBillDialog(true);
                  } else if (item.id === 'reset-sync') {
                    setShowResetSyncCodeDialog(true);
                  } else if (item.id === 'db-migration') {
                    setShowDatabaseMigrationDialog(true);
                  } else if (item.id === 'remove-orders') {
                    setShowRemoveAllOrdersDialog(true);
                  } else if (item.id === 'remove-backup') {
                    setShowRemoveBackupFilesDialog(true);
                  } else if (item.id === 'logs') {
                    setActiveSettingsView('logs');
                  } else if (item.id === 'check-machine') {
                    setShowCheckMachineDialog(true);
                  } else if (item.id === 'generate-code') {
                    setShowGenerateCodeDialog(true);
                  } else {
                    toast.info(`${item.label} coming soon`);
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 active:scale-95 transition-all duration-200 min-h-[100px] group"
              >
                <item.icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs text-center text-foreground font-medium leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full p-4 md:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {activeSettingsView && (
              <button
                onClick={() => setActiveSettingsView(null)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {activeSettingsView ? settingsTitles[activeSettingsView] : t('operations.title')}
              </h1>
              {!activeSettingsView && <p className="text-xs text-muted-foreground">{t('common.version')}: 2.0.0</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!activeSettingsView && (
              <button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) toast.success('Layout saved');
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isEditMode 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary hover:bg-accent text-foreground'
                )}
              >
                {isEditMode ? <Check className="w-4 h-4" /> : <Pencil className="w-3.5 h-3.5" />}
                {isEditMode ? 'Done' : 'Edit Layout'}
              </button>
            )}
            <a 
              href="mailto:support@MAXORA.in" 
              className="flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">support@MAXORA.in</span>
            </a>
          </div>
        </div>

        {/* Settings View */}
        {activeSettingsView ? (
          <div className="rounded-xl border border-border p-4 bg-card">
            {renderSettingsContent()}
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 rounded-xl border border-border bg-card">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                {billerName && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.biller')}</p>
                    <p className="font-semibold text-foreground">{billerName}</p>
                  </div>
                )}
                {/* Reports Section - visible based on plan */}
                {canAccess('basicReports') && (
                <button
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group col-span-1"
                >
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{t('nav.reports')}</p>
                    <p className="font-semibold text-primary text-sm">{t('common.viewReports')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </button>
                )}
              </div>
              
              {/* Owner Store Selection */}
              {isOwner && !isStoreLogin && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('common.viewing')}: <span className="font-medium text-foreground">{selectedStoreName || t('common.allStores')}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowStoreSelectionDialog(true)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {t('common.changeStore')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isEditMode && (
              <div className="mb-3 px-3 py-2 bg-primary/10 rounded-lg text-primary text-xs font-medium text-center">
                🔀 Drag cards to reorder • Click "Done" when finished
              </div>
            )}

            {/* Operations Grid - Mobile Optimized */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3">
              {(() => {
                const visibleOps = sortedOperations.filter(item => !(item.featureKey && !canAccess(item.featureKey)));
                return visibleOps.map((item, index) => (
                  <button
                    key={item.id}
                    draggable={isEditMode}
                    onDragStart={(e) => handleOpDragStart(e, index)}
                    onDragOver={(e) => handleOpDragOver(e, index)}
                    onDrop={(e) => handleOpDrop(e, index)}
                    onDragEnd={handleOpDragEnd}
                    onClick={() => handleClick(item)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 active:scale-95 transition-all duration-200 min-h-[80px] md:min-h-[100px] group touch-manipulation relative",
                      isEditMode && "cursor-grab active:cursor-grabbing ring-1 ring-primary/30",
                      dragOverIndex === index && "ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    {isEditMode && (
                      <GripVertical className="w-3 h-3 text-muted-foreground absolute top-1 right-1" />
                    )}
                    <item.icon className="w-6 h-6 md:w-8 md:h-8 text-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] md:text-xs text-center text-foreground font-medium leading-tight line-clamp-2">{item.label}</span>
                  </button>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs md:text-sm text-muted-foreground text-center">
                Set the configuration for your restaurant
              </p>
            </div>
          </>
        )}
      </div>

      {/* Sales Report Modal */}
      <DailySalesReport isOpen={showSalesReport} onClose={() => setShowSalesReport(false)} />
      
      {/* Stock Alerts Dialog */}
      <StockAlertsDialog isOpen={showStockAlerts} onClose={() => setShowStockAlerts(false)} />
      
      {/* Reset Bill Dialog */}
      <ResetBillDialog isOpen={showResetBillDialog} onClose={() => setShowResetBillDialog(false)} />
      
      {/* Reset Sync Code Dialog */}
      <ResetSyncCodeDialog isOpen={showResetSyncCodeDialog} onClose={() => setShowResetSyncCodeDialog(false)} />
      
      {/* Database Migration Dialog */}
      <DatabaseMigrationDialog isOpen={showDatabaseMigrationDialog} onClose={() => setShowDatabaseMigrationDialog(false)} />
      
      {/* Remove All Orders Dialog */}
      <RemoveAllOrdersDialog isOpen={showRemoveAllOrdersDialog} onClose={() => setShowRemoveAllOrdersDialog(false)} />
      
      {/* Remove Backup Files Dialog */}
      <RemoveBackupFilesDialog isOpen={showRemoveBackupFilesDialog} onClose={() => setShowRemoveBackupFilesDialog(false)} />
      
      {/* Check Machine Dialog */}
      <CheckMachineDialog isOpen={showCheckMachineDialog} onClose={() => setShowCheckMachineDialog(false)} />
      
      {/* Generate Code Dialog */}
      <GenerateCodeDialog isOpen={showGenerateCodeDialog} onClose={() => setShowGenerateCodeDialog(false)} />
      
      {/* Closing Hours Warning Dialog */}
      <ClosingHoursWarningDialog
        isOpen={showWarning}
        onClose={dismissWarning}
        closingTime={closingTime}
        onExtend={extendClosingTime}
      />
      
      {/* Owner Store Selection Dialog */}
      <OwnerStoreSelectionDialog
        isOpen={showStoreSelectionDialog}
        onClose={() => setShowStoreSelectionDialog(false)}
        onSelectStore={(store) => setSelectedStoreName(store?.store_name || null)}
      />
      
      {/* Store Location Settings Dialog */}
      <Dialog open={showLocationSettings} onOpenChange={setShowLocationSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Store Location Settings</DialogTitle>
          </DialogHeader>
          {activeStoreId ? (
            <StoreLocationSettings storeId={activeStoreId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No store selected. Please login to a store first.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog isOpen={showWithdrawalDialog} onClose={() => setShowWithdrawalDialog(false)} />
      
      {/* Cash Top-Up Dialog */}
      <CashTopUpDialog isOpen={showCashTopUpDialog} onClose={() => setShowCashTopUpDialog(false)} />
    </div>
  );
};