import { useState, useEffect, useCallback } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export interface ButtonConfig {
  id: string;
  label: string;
  icon: string;
  position: number;
  visible: boolean;
  group: 'cart_actions' | 'payment_actions' | 'order_actions';
}

export interface ShortcutConfig {
  [actionId: string]: string;
}

export interface LayoutConfig {
  menuPosition: 'left' | 'right';
  orderPanelPosition: 'left' | 'right';
  menuGridCols: number;
  categoryPosition: 'left' | 'top';
  showImages: boolean;
}

export interface SidebarItemConfig {
  id: string;
  path: string;
  label: string;
  icon: string;
  visible: boolean;
  position: number;
}

export interface OperationItemConfig {
  id: string;
  position: number;
  visible: boolean;
}

export interface UICustomizationConfig {
  layout: LayoutConfig;
  buttons: ButtonConfig[];
  shortcuts: ShortcutConfig;
  sidebarItems: SidebarItemConfig[];
  operationsOrder: OperationItemConfig[];
  appSidebarOrder: SidebarItemConfig[];
  version: number;
}

export const DEFAULT_BUTTONS: ButtonConfig[] = [
  { id: 'hold', label: 'Hold', icon: 'Pause', position: 1, visible: true, group: 'cart_actions' },
  { id: 'print', label: 'Print Bill', icon: 'Printer', position: 2, visible: true, group: 'cart_actions' },
  { id: 'kot', label: 'KOT', icon: 'FileText', position: 3, visible: true, group: 'cart_actions' },
  { id: 'kotPrint', label: 'KOT + Print', icon: 'Receipt', position: 4, visible: true, group: 'cart_actions' },
  { id: 'split', label: 'Split', icon: 'Scissors', position: 5, visible: true, group: 'cart_actions' },
  { id: 'discount', label: 'Discount', icon: 'Percent', position: 6, visible: true, group: 'cart_actions' },
  { id: 'customer', label: 'Customer', icon: 'User', position: 7, visible: true, group: 'cart_actions' },
  { id: 'qrMenu', label: 'QR Menu', icon: 'QrCode', position: 8, visible: true, group: 'cart_actions' },
  { id: 'qrOrders', label: 'QR Orders', icon: 'QrCode', position: 9, visible: true, group: 'cart_actions' },
  { id: 'heldBills', label: 'Held Bills', icon: 'Play', position: 10, visible: true, group: 'cart_actions' },
  { id: 'cash', label: 'Cash', icon: 'Banknote', position: 1, visible: true, group: 'payment_actions' },
  { id: 'card', label: 'Card', icon: 'CreditCard', position: 2, visible: true, group: 'payment_actions' },
  { id: 'upi', label: 'UPI', icon: 'Smartphone', position: 3, visible: true, group: 'payment_actions' },
  { id: 'due', label: 'Due', icon: 'Clock', position: 4, visible: true, group: 'payment_actions' },
  { id: 'part', label: 'Part Pay', icon: 'SplitSquareHorizontal', position: 5, visible: true, group: 'payment_actions' },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet', position: 6, visible: true, group: 'payment_actions' },
];

export const DEFAULT_SIDEBAR_ITEMS: SidebarItemConfig[] = [
  { id: 'operations', path: '/operations', label: 'Operations', icon: 'Wrench', visible: true, position: 1 },
  { id: 'reports', path: '/reports', label: 'Reports', icon: 'BarChart3', visible: true, position: 2 },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', visible: true, position: 3 },
  { id: 'pos', path: '/pos', label: 'Billing', icon: 'ShoppingCart', visible: true, position: 4 },
  { id: 'tables', path: '/tables', label: 'Tables', icon: 'UtensilsCrossed', visible: true, position: 5 },
  { id: 'orders', path: '/orders', label: 'Orders', icon: 'Receipt', visible: true, position: 6 },
  { id: 'pickup', path: '/pickup', label: 'Takeaway', icon: 'Package', visible: true, position: 7 },
  { id: 'menu', path: '/menu', label: 'Menu', icon: 'Package', visible: true, position: 8 },
  { id: 'inventory', path: '/inventory', label: 'Inventory', icon: 'Package', visible: true, position: 9 },
  { id: 'expenses', path: '/expenses', label: 'Expenses', icon: 'Wallet', visible: true, position: 10 },
  { id: 'delivery', path: '/delivery', label: 'Delivery', icon: 'Truck', visible: true, position: 11 },
  { id: 'online-orders', path: '/online-orders', label: 'Online Orders', icon: 'Globe', visible: true, position: 12 },
  { id: 'qr-orders', path: '/qr-orders', label: 'Menu Orders', icon: 'QrCode', visible: true, position: 13 },
  { id: 'staff', path: '/staff', label: 'Staff', icon: 'Users', visible: true, position: 14 },
  { id: 'stores', path: '/stores', label: 'Stores', icon: 'Store', visible: true, position: 15 },
  { id: 'chat', path: '/chat', label: 'Team Chat', icon: 'MessageSquare', visible: true, position: 16 },
  { id: 'credit-ledger', path: '/credit-ledger', label: 'Credit Ledger', icon: 'ScrollText', visible: true, position: 17 },
  { id: 'executive-dashboard', path: '/executive-dashboard', label: 'Executive Dashboard', icon: 'Gauge', visible: true, position: 18 },
  { id: 'ai-control-center', path: '/ai-control-center', label: 'AI Control Center', icon: 'Brain', visible: true, position: 19 },
  { id: 'dynamic-pricing', path: '/dynamic-pricing', label: 'Dynamic Pricing', icon: 'TrendingUp', visible: true, position: 20 },
  { id: 'api-management', path: '/api-management', label: 'API Management', icon: 'Code', visible: true, position: 21 },
  { id: 'tax-engine', path: '/tax-engine', label: 'Tax Engine', icon: 'Calculator', visible: true, position: 22 },
  { id: 'revenue-forecast', path: '/revenue-forecast', label: 'Revenue Forecast', icon: 'LineChart', visible: true, position: 23 },
  { id: 'compliance', path: '/compliance', label: 'Compliance', icon: 'Shield', visible: true, position: 24 },
];

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  hold: 'Ctrl+Z',
  print: 'F2',
  kot: 'F3',
  kotPrint: 'F6',
  newOrder: 'F5',
  search: 'F4',
  tables: 'F7',
  dineIn: 'F11',
  takeaway: 'F12',
  delivery: 'F9',
  orderList: 'Ctrl+O',
  kotList: 'Ctrl+K',
  salesReport: 'Ctrl+S',
  itemReport: 'Ctrl+I',
  help: 'Ctrl+H',
  back: 'Ctrl+Backspace',
};

export const DEFAULT_LAYOUT: LayoutConfig = {
  menuPosition: 'left',
  orderPanelPosition: 'right',
  menuGridCols: 5,
  categoryPosition: 'left',
  showImages: true,
};

export const DEFAULT_CONFIG: UICustomizationConfig = {
  layout: DEFAULT_LAYOUT,
  buttons: DEFAULT_BUTTONS,
  shortcuts: DEFAULT_SHORTCUTS,
  sidebarItems: DEFAULT_SIDEBAR_ITEMS,
  operationsOrder: [],
  appSidebarOrder: [],
  version: 2,
};

const SETTING_KEY = 'pos_ui_customization';

export function useUICustomization() {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [config, setConfig] = useState<UICustomizationConfig>(DEFAULT_CONFIG);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    
    const saved = getSetting<UICustomizationConfig | null>(SETTING_KEY, null);
    if (saved && saved.version) {
      const mergedButtons = DEFAULT_BUTTONS.map(def => {
        const saved_btn = saved.buttons?.find(b => b.id === def.id);
        return saved_btn ? { ...def, ...saved_btn } : def;
      });
      
      const mergedSidebar = DEFAULT_SIDEBAR_ITEMS.map(def => {
        const saved_item = saved.sidebarItems?.find(s => s.id === def.id);
        return saved_item ? { ...def, ...saved_item } : def;
      });

      setConfig({
        layout: { ...DEFAULT_LAYOUT, ...(saved.layout || {}) },
        buttons: mergedButtons,
        shortcuts: { ...DEFAULT_SHORTCUTS, ...(saved.shortcuts || {}) },
        sidebarItems: mergedSidebar,
        operationsOrder: saved.operationsOrder || [],
        appSidebarOrder: saved.appSidebarOrder || [],
        version: saved.version,
      });
    }
    setIsReady(true);
  }, [isLoaded, getSetting]);

  const updateConfig = useCallback(async (newConfig: UICustomizationConfig) => {
    setConfig(newConfig);
    await saveSetting(SETTING_KEY, newConfig);
    window.dispatchEvent(new CustomEvent('ui-customization-changed', { detail: newConfig }));
  }, [saveSetting]);

  const updateLayout = useCallback(async (layout: Partial<LayoutConfig>) => {
    const newConfig = { ...config, layout: { ...config.layout, ...layout } };
    await updateConfig(newConfig);
  }, [config, updateConfig]);

  const updateButtons = useCallback(async (buttons: ButtonConfig[]) => {
    const newConfig = { ...config, buttons };
    await updateConfig(newConfig);
  }, [config, updateConfig]);

  const updateShortcuts = useCallback(async (shortcuts: ShortcutConfig) => {
    const newConfig = { ...config, shortcuts };
    await updateConfig(newConfig);
  }, [config, updateConfig]);

  const updateSingleShortcut = useCallback(async (actionId: string, shortcut: string) => {
    const newShortcuts = { ...config.shortcuts, [actionId]: shortcut };
    await updateShortcuts(newShortcuts);
  }, [config.shortcuts, updateShortcuts]);

  const toggleButton = useCallback(async (buttonId: string) => {
    const newButtons = config.buttons.map(b =>
      b.id === buttonId ? { ...b, visible: !b.visible } : b
    );
    await updateButtons(newButtons);
  }, [config.buttons, updateButtons]);

  const reorderButtons = useCallback(async (group: string, fromIndex: number, toIndex: number) => {
    const groupButtons = config.buttons
      .filter(b => b.group === group)
      .sort((a, b) => a.position - b.position);
    
    const [moved] = groupButtons.splice(fromIndex, 1);
    groupButtons.splice(toIndex, 0, moved);
    
    const reordered = groupButtons.map((b, i) => ({ ...b, position: i + 1 }));
    const otherButtons = config.buttons.filter(b => b.group !== group);
    
    await updateButtons([...otherButtons, ...reordered]);
  }, [config.buttons, updateButtons]);

  const toggleSidebarItem = useCallback(async (itemId: string) => {
    const newItems = config.sidebarItems.map(s =>
      s.id === itemId ? { ...s, visible: !s.visible } : s
    );
    await updateConfig({ ...config, sidebarItems: newItems });
  }, [config, updateConfig]);

  const reorderSidebarItems = useCallback(async (fromIndex: number, toIndex: number) => {
    const sorted = [...config.sidebarItems].sort((a, b) => a.position - b.position);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    const reordered = sorted.map((item, i) => ({ ...item, position: i + 1 }));
    await updateConfig({ ...config, sidebarItems: reordered });
  }, [config, updateConfig]);

  const renameSidebarItem = useCallback(async (itemId: string, newLabel: string) => {
    const newItems = config.sidebarItems.map(s =>
      s.id === itemId ? { ...s, label: newLabel } : s
    );
    await updateConfig({ ...config, sidebarItems: newItems });
  }, [config, updateConfig]);

  const resetToDefault = useCallback(async () => {
    await updateConfig(DEFAULT_CONFIG);
  }, [updateConfig]);

  // Operations grid ordering
  const getOperationsOrder = useCallback(() => {
    return config.operationsOrder;
  }, [config.operationsOrder]);

  const reorderOperations = useCallback(async (fromIndex: number, toIndex: number, allIds: string[]) => {
    const reordered = [...allIds];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const newOrder: OperationItemConfig[] = reordered.map((id, i) => ({ id, position: i + 1, visible: true }));
    await updateConfig({ ...config, operationsOrder: newOrder });
  }, [config, updateConfig]);

  // AppSidebar ordering
  const getAppSidebarOrder = useCallback(() => {
    return config.appSidebarOrder;
  }, [config.appSidebarOrder]);

  const reorderAppSidebar = useCallback(async (fromIndex: number, toIndex: number, allIds: string[]) => {
    const reordered = [...allIds];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const newOrder: SidebarItemConfig[] = reordered.map((id, i) => ({
      id, path: '', label: '', icon: '', visible: true, position: i + 1,
    }));
    await updateConfig({ ...config, appSidebarOrder: newOrder });
  }, [config, updateConfig]);

  const getGroupButtons = useCallback((group: string) => {
    return config.buttons
      .filter(b => b.group === group)
      .sort((a, b) => a.position - b.position);
  }, [config.buttons]);

  const getVisibleButtons = useCallback((group: string) => {
    return getGroupButtons(group).filter(b => b.visible);
  }, [getGroupButtons]);

  const getSortedSidebarItems = useCallback(() => {
    return [...config.sidebarItems].sort((a, b) => a.position - b.position);
  }, [config.sidebarItems]);

  const isSidebarItemVisible = useCallback((itemId: string) => {
    const item = config.sidebarItems.find(s => s.id === itemId);
    return item?.visible ?? true;
  }, [config.sidebarItems]);

  const hasShortcutConflict = useCallback((actionId: string, shortcut: string) => {
    return Object.entries(config.shortcuts).some(
      ([id, s]) => id !== actionId && s.toLowerCase() === shortcut.toLowerCase()
    );
  }, [config.shortcuts]);

  const getShortcut = useCallback((actionId: string) => {
    return config.shortcuts[actionId] || DEFAULT_SHORTCUTS[actionId] || '';
  }, [config.shortcuts]);

  const isButtonVisible = useCallback((buttonId: string) => {
    const btn = config.buttons.find(b => b.id === buttonId);
    return btn?.visible ?? true;
  }, [config.buttons]);

  return {
    config,
    isReady,
    updateConfig,
    updateLayout,
    updateButtons,
    updateShortcuts,
    updateSingleShortcut,
    toggleButton,
    reorderButtons,
    toggleSidebarItem,
    reorderSidebarItems,
    renameSidebarItem,
    resetToDefault,
    getGroupButtons,
    getVisibleButtons,
    getSortedSidebarItems,
    isSidebarItemVisible,
    hasShortcutConflict,
    getShortcut,
    isButtonVisible,
    getOperationsOrder,
    reorderOperations,
    getAppSidebarOrder,
    reorderAppSidebar,
  };
}
