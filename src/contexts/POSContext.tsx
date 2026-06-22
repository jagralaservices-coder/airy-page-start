// POS Context - Force rebuild timestamp: 2026-02-09T12:00
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { showLowStockAlert, showOutOfStockAlert } from '@/lib/notifications';
import { formatQuantityDisplay, convertToBaseUnit } from '@/lib/inventoryUtils';
import { useOrderSync } from '@/hooks/useOrderSync';
import { useStoreDataSync } from '@/hooks/useStoreDataSync';
import { useStoreInitializer } from '@/hooks/useStoreInitializer';
import {
  MenuItem,
  MenuItemIngredient,
  CartItem,
  Category,
  Order,
  HeldBill,
  Table,
  Store,
  getCategories,
  getOrders,
  setOrders,
  getHeldBills,
  setHeldBills,
  getTables,
  setTables,
  setCategories,
  getStores,
  setStores as setStoresStorage,
  getActiveStore,
  setActiveStore as setActiveStoreStorage,
  initializeData,
  generateId,
  generateBillNumber,
  generateKOTNumber,
  generateStoreCode,
  addOrder as addOrderToStorage,
  defaultCategories,
  getInventory,
  setInventory,
  getExpenses,
  setExpenses,
  Expense,
  getMenuItems,
  setMenuItems,
  safeMerge,
  registerBackupCallback,
  getCreditLedger,
  setCreditLedger,
  CreditEntry,
} from '@/lib/store';
import { triggerDebouncedBackup } from '@/lib/backupUtils';
import { logSecurityAction } from '@/lib/auditLogger';

interface POSContextType {
  // Menu & Categories
  menuItems: MenuItem[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  toggleItemAvailability: (id: string) => void;
  addMenuItems: (items: Omit<MenuItem, 'id' | 'isAvailable'>[]) => Promise<boolean>;
  addCategory: (category: Omit<Category, 'color'>) => void;
  deleteMenuItem: (id: string) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  syncCategoriesFromMenu: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: MenuItem, customPrice?: number, customQuantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTax: number;
  cartTotal: number;
  discount: number;
  setDiscount: (amount: number) => void;
  taxPercent: number;
  setTaxPercent: (percent: number) => void;
  customTax: number | null;
  setCustomTax: (amount: number | null) => void;

  // Orders
  orders: Order[];
  recentBills: Order[]; // Completed bills for recent display
  currentOrderType: 'dine-in' | 'takeaway' | 'delivery' | 'online';
  setCurrentOrderType: (type: 'dine-in' | 'takeaway' | 'delivery' | 'online') => void;
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  placeOrder: (paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit') => Promise<Order | null> | Order | null;
  createKOTOrder: () => Promise<Order | null>; // Create order for KOT only (no sales)
  printBillForOrder: (orderId: string, paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit', customerInfo?: { name?: string; phone?: string; email?: string; address?: string }, paymentBreakdown?: { method: string; amount: number }[]) => Promise<Order | null>; // Print bill for existing KOT order
  directBillPrint: (paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit' | 'access', customerInfo?: { name?: string; phone?: string; email?: string; address?: string }, paymentBreakdown?: { method: string; amount: number }[]) => Promise<Order | null>; // Direct bill without KOT (not in orders)
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderPaymentMethod: (orderId: string, paymentMethod: Order['paymentMethod']) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  clearAllOrders: () => void;
  
  // Held Bills
  heldBills: HeldBill[];
  holdBill: () => void;
  recallBill: (billId: string) => void;
  deleteHeldBill: (billId: string) => void;

  // Tables
  tables: Table[];
  updateTableStatus: (tableId: string, status: 'available' | 'occupied' | 'reserved') => void;

  // KOT
  printKOT: (order: Order) => void;

  // Online status
  isOnline: boolean;

  // Today's stats
  todayStats: {
    totalSales: number;
    orderCount: number;
    avgOrderValue: number;
  };

  // Stores
  stores: Store[];
  activeStore: Store | null;
  setActiveStoreId: (storeId: string | null) => void;
  addStore: (store: Omit<Store, 'id' | 'createdAt' | 'isActive' | 'storeCode'> & { email?: string }) => Store;
  loginStore: (storeCode: string, password: string) => Promise<Store | null>;
  logoutStore: () => void;
  updateStore: (id: string, updates: Partial<Store>) => void;
  deleteStore: (id: string) => void;
  getStoreSales: (storeId: string) => number;
  isStoreLogin: boolean; // True when logged in via store login (not owner login)

  // Low stock items
  lowStockItems: MenuItem[];
}

export const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return localStorage.getItem('pos_active_category') || 'all';
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [heldBills, setHeldBillsState] = useState<HeldBill[]>([]);
  const [tables, setTablesState] = useState<Table[]>([]);
  const [currentOrderType, setCurrentOrderType] = useState<'dine-in' | 'takeaway' | 'delivery' | 'online'>(() => {
    return (localStorage.getItem('pos_current_order_type') as any) || 'dine-in';
  });
  const [selectedTable, setSelectedTable] = useState<Table | null>(() => {
    try {
      const saved = localStorage.getItem('pos_selected_table');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [discount, setDiscount] = useState(() => {
    const saved = localStorage.getItem('pos_discount');
    return saved ? Number(saved) : 0;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stores, setStoresState] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [isStoreLogin, setIsStoreLogin] = useState<boolean>(() => {
    return localStorage.getItem('pos_is_store_login') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pos_active_category', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pos_current_order_type', currentOrderType);
  }, [currentOrderType]);

  useEffect(() => {
    if (selectedTable) {
      localStorage.setItem('pos_selected_table', JSON.stringify(selectedTable));
    } else {
      localStorage.removeItem('pos_selected_table');
    }
  }, [selectedTable]);

  useEffect(() => {
    localStorage.setItem('pos_discount', String(discount));
  }, [discount]);

  // Helper to get store_code for edge function auth
  const getStoreCode = useCallback((): string | null => {
    try {
      const storeData = localStorage.getItem('pos_active_store_data');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        if (parsed?.storeCode) return parsed.storeCode;
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsStoreLogin(false);
        localStorage.removeItem('store_login');
        localStorage.removeItem('pos_store_session');
        localStorage.removeItem('pos_store_login_data');
        localStorage.removeItem('pos_is_store_login');
        localStorage.removeItem('pos_store_code');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Order cloud sync
  const { saveOrderToCloud, startPeriodicSync: startOrderSync } = useOrderSync();

  // Store data cloud sync (inventory, expenses, held bills, settings)
  const { startPeriodicSync: startStoreDataSync, saveCreditEntryToCloud } = useStoreDataSync();

  // Stable refs for sync functions to prevent infinite loop
  const startOrderSyncRef = useRef(startOrderSync);
  const startStoreDataSyncRef = useRef(startStoreDataSync);

  useEffect(() => {
    startOrderSyncRef.current = startOrderSync;
  }, [startOrderSync]);

  useEffect(() => {
    startStoreDataSyncRef.current = startStoreDataSync;
  }, [startStoreDataSync]);

  // Store initializer for first-time login full download
  const { initializeStoreSession } = useStoreInitializer();

  // Fetch menu items from database based on active store (with ingredients)
  const fetchMenuItems = useCallback(async (storeId: string | null) => {
    if (!storeId) {
      setMenuItemsState([]);
      return;
    }

    try {
      let data: any[] | null = null;
      let ingredientsData: any[] = [];
      let variationsData: any[] = [];

      if (isStoreLogin) {
        // Use edge function for store login (no auth session)
        const { data: result, error: fnError } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'fetch', store_id: storeId, data_type: 'menu_items', store_code: getStoreCode() }
        });
        if (fnError || result?.error) {
          console.error('Error fetching menu items via edge function:', fnError || result?.error);
          toast.error('Failed to load menu items');
          return;
        }
        data = result?.items || [];
        ingredientsData = result?.ingredients || [];
        variationsData = result?.variations || [];
      } else {
        // Direct DB access for authenticated users
        const { data: dbData, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('store_id', storeId);

        if (error) {
          console.error('Error fetching menu items:', error);
          toast.error('Failed to load menu items');
          return;
        }
        data = dbData;
      }

      // Fetch all ingredients for this store's menu items
      const menuItemIds = (data || []).map(item => item.id);
      let ingredientsMap: Record<string, MenuItemIngredient[]> = {};
      let variationsMap: Record<string, MenuItem['variations']> = {};
      
      if (menuItemIds.length > 0) {
        // For store login, ingredientsData and variationsData are already fetched
        if (isStoreLogin) {
          ingredientsData.forEach((ing: any) => {
            if (!ingredientsMap[ing.menu_item_id]) {
              ingredientsMap[ing.menu_item_id] = [];
            }
            ingredientsMap[ing.menu_item_id].push({
              id: ing.id,
              inventoryItemId: ing.inventory_item_id,
              quantityRequired: Number(ing.quantity_required),
              unit: ing.unit
            });
          });
          variationsData.forEach((variation: any) => {
            if (!variationsMap[variation.menu_item_id]) {
              variationsMap[variation.menu_item_id] = [];
            }
            variationsMap[variation.menu_item_id]!.push({
              id: variation.id,
              menuItemId: variation.menu_item_id,
              name: variation.name,
              sku: variation.sku || undefined,
              price: Number(variation.price),
              isAvailable: variation.is_available,
              stock: variation.stock || undefined,
              sortOrder: variation.sort_order,
              unit: variation.unit || undefined,
            });
          });
        } else {
          // Fetch ingredients directly for authenticated users
          const { data: ingsData, error: ingredientsError } = await supabase
            .from('menu_item_ingredients')
            .select('*')
            .in('menu_item_id', menuItemIds);

          if (!ingredientsError && ingsData) {
            ingsData.forEach(ing => {
              if (!ingredientsMap[ing.menu_item_id]) {
                ingredientsMap[ing.menu_item_id] = [];
              }
              ingredientsMap[ing.menu_item_id].push({
                id: ing.id,
                inventoryItemId: ing.inventory_item_id,
                quantityRequired: Number(ing.quantity_required),
                unit: ing.unit
              });
            });
          }

          // Fetch variations
          const { data: varsData, error: variationsError } = await supabase
            .from('menu_item_variations')
            .select('*')
            .in('menu_item_id', menuItemIds)
            .order('sort_order', { ascending: true });

          if (!variationsError && varsData) {
            varsData.forEach(variation => {
              if (!variationsMap[variation.menu_item_id]) {
                variationsMap[variation.menu_item_id] = [];
              }
              variationsMap[variation.menu_item_id]!.push({
                id: variation.id,
                menuItemId: variation.menu_item_id,
                name: variation.name,
                sku: variation.sku || undefined,
                price: Number(variation.price),
                isAvailable: variation.is_available,
                stock: variation.stock || undefined,
                sortOrder: variation.sort_order,
                unit: variation.unit || undefined,
              });
            });
          }
        }
      }

      const items: MenuItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        nameHindi: item.name_hindi || undefined,
        price: Number(item.price),
        category: item.category,
        image: item.image_url || undefined,
        isAvailable: item.is_available,
        preparationTime: item.preparation_time || undefined,
        stock: item.stock || undefined,
        linkedInventoryId: item.linked_inventory_id || undefined,
        gramagePerUnit: item.gramage_per_unit ? Number(item.gramage_per_unit) : undefined,
        ingredients: ingredientsMap[item.id] || [],
        sku: (item as Record<string, unknown>).sku as string | undefined,
        barcode: (item as Record<string, unknown>).barcode as string | undefined,
        variations: variationsMap[item.id] || [],
      }));

      // Safe merge menu items with existing local menu items
      const localMenuItems = getMenuItems();
      let mergedItems = localMenuItems;
      
      if (items && items.length > 0) {
        mergedItems = safeMerge(localMenuItems, items);
        
        // Remove default items "1", "2", "3" if real store items have been fetched/synced from the cloud
        const hasRealItems = mergedItems.some(i => i.id !== '1' && i.id !== '2' && i.id !== '3');
        if (hasRealItems) {
          mergedItems = mergedItems.filter(i => i.id !== '1' && i.id !== '2' && i.id !== '3');
        }
        setMenuItems(mergedItems);
      }
      setMenuItemsState(mergedItems);

      // Sync categories from menu items AND save to DB
      const uniqueCategoryIds = [...new Set(mergedItems.map(item => item.category).filter(Boolean))];
      
      const menuCategories: Category[] = uniqueCategoryIds.map(catId => ({
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' '),
        icon: '📦',
        color: 'cat-food'
      }));

      if (menuCategories.length > 0) {
        const localCats = getCategories();
        let mergedCats = safeMerge(localCats, menuCategories);
        const hasRealCats = mergedCats.some(c => c.id !== 'general' && c.id !== 'grocery' && c.id !== 'electronics' && c.id !== 'hardware' && c.id !== 'food' && c.id !== 'stationery');
        if (hasRealCats) {
          mergedCats = mergedCats.filter(c => c.id !== 'general' && c.id !== 'grocery' && c.id !== 'electronics' && c.id !== 'hardware' && c.id !== 'food' && c.id !== 'stationery');
        }
        setCategories(mergedCats);
        setCategoriesState(mergedCats);

        // Save categories to DB
        const stId = isStoreLogin 
          ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
          : storeId;
        if (stId) {
          try {
            if (isStoreLogin) {
              await supabase.functions.invoke('sync-store-data', {
                body: { action: 'save', store_id: stId, data_type: 'categories', store_code: getStoreCode(), items: menuCategories }
              });
            } else {
              // Direct DB: delete and re-insert
              await supabase.from('store_categories').delete().eq('store_id', stId);
              if (menuCategories.length > 0) {
                await supabase.from('store_categories').insert(
                  menuCategories.map((c, idx) => ({
                    store_id: stId,
                    category_id: c.id,
                    name: c.name,
                    icon: c.icon,
                    color: c.color,
                    sort_order: idx,
                  }))
                );
              }
            }
          } catch (e) {
            console.error('Failed to save categories to DB:', e);
          }
        }
      }

      // Check for low stock items
      const lowStock = items.filter(item => {
        if (item.stockAlertThreshold !== undefined && item.stock !== undefined) {
          return item.stock <= item.stockAlertThreshold && item.stock > 0;
        }
        return false;
      });

      const outOfStock = items.filter(item => item.stock === 0);

      if (lowStock.length > 0) {
        toast.warning(`${lowStock.length} items have low stock!`, {
          description: lowStock.slice(0, 3).map(i => `${i.name} (${i.stock})`).join(', ')
        });
        
        if (localStorage.getItem('push_notifications_enabled') === 'true') {
          showLowStockAlert(lowStock.map(i => ({ name: i.name, stock: i.stock || 0 })));
        }
      }

      if (outOfStock.length > 0 && localStorage.getItem('push_notifications_enabled') === 'true') {
        showOutOfStockAlert(outOfStock.map(i => ({ name: i.name })));
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // Offline fallback: load local storage items so UI remains functional
      const localMenuItems = getMenuItems();
      setMenuItemsState(localMenuItems);
      
      const uniqueCategoryIds = [...new Set(localMenuItems.map(item => item.category).filter(Boolean))];
      const menuCategories: Category[] = uniqueCategoryIds.map(catId => ({
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' '),
        icon: '📦',
        color: 'cat-food'
      }));
      setCategoriesState(menuCategories);
    }
  }, [isStoreLogin]);

  // Validate and sync store data from database
  const validateStoreLogin = useCallback(async () => {
    if (isStoreLogin) {
      const storedData = localStorage.getItem('pos_active_store_data');
      if (!storedData) {
        setIsStoreLogin(false);
        setActiveStoreIdState(null);
        return;
      }
      
      try {
        const store = JSON.parse(storedData);
        if (!store?.id || !store?.storeCode) {
          localStorage.removeItem('pos_active_store_data');
          localStorage.removeItem('pos_is_store_login');
          setIsStoreLogin(false);
          setActiveStoreIdState(null);
          toast.error('Store session invalid. Please login again.');
          return;
        }

        // Validate store actually exists in DB via edge function
        try {
          const { data, error } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: store.id, data_type: 'settings', store_code: getStoreCode() }
          });
          if (error || data?.error) {
            const isNetworkError = !navigator.onLine || 
              (error && (
                error.message?.includes('Failed to fetch') || 
                error.message?.includes('NetworkError') ||
                error.message?.includes('Load failed') ||
                error.message?.includes('network error')
              ));

            if (isNetworkError) {
              console.warn('[POSContext] Validation skipped due to offline state or network failure.');
              return;
            }

            const combinedError = String(error?.message || '') + String(data?.error || '');
            const status = (error as any)?.context?.status;
            const isAuthError = (error?.name === 'FunctionsHttpError' && (status === 401 || status === 403)) || 
              combinedError.includes('Invalid') || 
              combinedError.includes('inactive') || 
              combinedError.includes('Authentication required') || 
              combinedError.includes('Access denied');

            if (isAuthError) {
              console.warn('Store validation failed with auth error, clearing stale session:', data?.error || error);
              localStorage.removeItem('pos_active_store_data');
              localStorage.removeItem('pos_is_store_login');
              localStorage.removeItem('pos_active_store');
              setIsStoreLogin(false);
              setActiveStoreIdState(null);
              toast.error('Store session expired or invalid. Please login again.');
            } else {
              console.warn('[POSContext] Validation failed due to transient server/DB error (session retained):', data?.error || error);
            }
            return;
          }

          // Fetch latest store details (name, address, phone, tax_type, tax_percentage) via proxy
          const { data: detailsData, error: detailsError } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: store.id, data_type: 'store_details', store_code: getStoreCode() }
          });
          if (!detailsError && detailsData?.success && detailsData?.store) {
            const updatedStore = {
              ...store,
              name: detailsData.store.store_name,
              address: detailsData.store.address,
              phone: detailsData.store.phone,
              businessType: detailsData.store.business_type,
              country: detailsData.store.country,
              currencyCode: detailsData.store.currency_code,
              taxType: detailsData.store.tax_type,
              taxPercentage: detailsData.store.tax_percentage,
            };
            localStorage.setItem('pos_active_store_data', JSON.stringify(updatedStore));
            
            // Also sync local taxPercent state immediately
            if (updatedStore.taxPercentage !== undefined && updatedStore.taxPercentage !== null) {
              const safeTax = Number(updatedStore.taxPercentage);
              if (!isNaN(safeTax)) {
                setTaxPercentState(safeTax);
                localStorage.setItem('pos_tax_percent', String(safeTax));
              }
            }
          }
        } catch (validationError) {
          console.warn('Store validation network error, keeping session:', validationError);
          // Network error - keep session (offline mode)
        }
      } catch (e) {
        console.error('Error validating store:', e);
        localStorage.removeItem('pos_active_store_data');
        localStorage.removeItem('pos_is_store_login');
        setIsStoreLogin(false);
        setActiveStoreIdState(null);
      }
    } else {
      // For owner login, validate activeStoreId against actual stores AND sync store list from DB
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('merchant_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!roleData?.merchant_id) return;

      // Fetch actual stores from DB
      let query = supabase
        .from('stores')
        .select('id, name, address, phone, merchant_id, business_type, country, currency_code, tax_type, tax_percentage, is_active, created_at, updated_at');

      // Admins see all stores, owners see their own
      if (roleData.role !== 'admin') {
        query = query.eq('merchant_id', roleData.merchant_id);
      }
      query = query.eq('is_active', true);

      const { data: validStores } = await query;

      if (!validStores || validStores.length === 0) {
        // Clear any stale store data from localStorage to prevent 401 sync errors
        localStorage.removeItem('pos_active_store_data');
        localStorage.removeItem('pos_active_store');
        localStorage.removeItem('pos_store_code');
        localStorage.removeItem('pos_is_store_login');
        setActiveStoreIdState(null);
        // Also clear stale stores from localStorage
        setStoresState([]);
        setStoresStorage([]);
        console.log('[POSContext] Owner has no stores, cleared stale store data');
        return;
      }

      // Fetch login emails for each store via user_roles + profiles
      const storeIds = validStores.map(s => s.id);
      const { data: storeRoles } = await supabase
        .from('user_roles')
        .select('store_id, user_id, role')
        .in('store_id', storeIds)
        .eq('is_active', true);

      let emailMap: Record<string, string> = {};
      if (storeRoles && storeRoles.length > 0) {
        const userIds = [...new Set(storeRoles.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        
        if (profilesData) {
          const profileMap: Record<string, string> = {};
          profilesData.forEach(p => { profileMap[p.id] = p.email; });
          // Prefer store_manager, then staff, then any role
          storeRoles.forEach(r => {
            if (r.store_id && profileMap[r.user_id]) {
              if (!emailMap[r.store_id] || r.role === 'store_manager') {
                emailMap[r.store_id] = profileMap[r.user_id];
              }
            }
          });
        }
      }

      // Sync stores state from DB (replaces any stale localStorage entries)
      const dbStores: Store[] = validStores.map(s => ({
        id: s.id,
        name: (s as any).name,
        storeCode: s.id.slice(0, 8).toUpperCase(),
        password: '',
        address: s.address || undefined,
        phone: s.phone || undefined,
        isActive: s.is_active ?? true,
        createdAt: new Date(s.created_at),
        customer_id: (s as any).merchant_id,
        businessType: (s.business_type as 'restaurant' | 'retail') || 'restaurant',
        country: s.country || 'India',
        currencyCode: s.currency_code || 'INR',
        taxType: s.tax_type || 'GST',
        taxPercentage: s.tax_percentage ?? 0,
        loginEmail: emailMap[s.id] || undefined,
      }));
      setStoresState(dbStores);
      setStoresStorage(dbStores);
      console.log('[POSContext] Synced', dbStores.length, 'stores from DB');

      const currentStoreId = getActiveStore();
      const isValidStore = validStores.some(s => s.id === currentStoreId);

      if (!isValidStore && validStores.length > 0) {
        console.log('Invalid store ID detected, setting first valid store:', validStores[0].id);
        setActiveStoreStorage(validStores[0].id);
        setActiveStoreIdState(validStores[0].id);
        toast.info(`Store set to: ${(validStores[0] as any).name}`);
      }
    }
  }, [isStoreLogin]);

  // Initialize data on mount
  useEffect(() => {
    initializeData();

    const storedMenuItems = getMenuItems();
    setMenuItemsState(storedMenuItems);

    const cats = getCategories();
    if (cats.length === 0) {
      setCategoriesState(defaultCategories);
      setCategories(defaultCategories);
    } else {
      setCategoriesState(cats);
    }
    
    setOrdersState(getOrders());
    setHeldBillsState(getHeldBills());
    setTablesState(getTables());
    setStoresState(getStores());
    
    const storedActiveStore = getActiveStore();
    setActiveStoreIdState(storedActiveStore);
    
    // Validate store login
    validateStoreLogin();

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [validateStoreLogin]);

  // Re-validate store and load data when auth state changes (critical for multi-device login)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !isStoreLogin) {
        console.log('[POSContext] Auth state changed to SIGNED_IN, re-validating store...');

        window.setTimeout(() => {
          void (async () => {
            await validateStoreLogin();

            const storeId = getActiveStore();
            if (storeId) {
              setActiveStoreIdState(storeId);
            }
          })();
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isStoreLogin, validateStoreLogin]);

  // Start periodic order sync with cloud
  useEffect(() => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
      
    if (!storeId) return;

    const cleanup = startOrderSyncRef.current(
      () => getOrders(),
      (syncedOrders) => setOrdersState(syncedOrders)
    );
    return cleanup;
  }, [activeStoreId, isStoreLogin]);

  // Start periodic store data sync (inventory, expenses, held bills, tables, settings, menu items, categories)
  useEffect(() => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
      
    if (!storeId) return;

    const cleanup = startStoreDataSyncRef.current(
      () => getInventory(),
      () => getExpenses(),
      () => getHeldBills(),
      (inv) => { setInventory(inv); },
      (exp) => { setExpenses(exp); },
      (hb) => { setHeldBillsState(hb); setHeldBills(hb); },
      () => getTables(),
      (tbl) => { setTablesState(tbl); setTables(tbl); },
      (menu) => { setMenuItemsState(menu); },
      (cats) => { setCategoriesState(cats); },
    );
    return cleanup;
  }, [activeStoreId, isStoreLogin]);

  // Fetch menu items and initialize store when active store changes
  useEffect(() => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
    
    if (storeId) {
      // First, load local scoped items immediately so that UI is not blank!
      const storedItems = getMenuItems();
      setMenuItemsState(storedItems);

      fetchMenuItems(storeId);
      
      initializeStoreSession(storeId, isStoreLogin, {
        onOrders: (orders) => setOrdersState(orders),
        onInventory: () => {}, // Inventory is managed by useStoreDataSync
        onExpenses: () => {},
        onHeldBills: (bills) => setHeldBillsState(bills),
        onTables: (tbl) => setTablesState(tbl),
      });
    } else {
      setMenuItemsState([]);
    }
  }, [activeStoreId, isStoreLogin, fetchMenuItems, initializeStoreSession]);

  // Automatic backup registration
  useEffect(() => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
    
    if (storeId) {
      registerBackupCallback(() => {
        triggerDebouncedBackup(storeId);
      });
    }
  }, [activeStoreId, isStoreLogin]);

  const [taxPercent, setTaxPercentState] = useState(() => {
    const saved = localStorage.getItem('pos_tax_percent');
    if (saved) {
      const parsed = Number(saved);
      return isNaN(parsed) ? 5 : parsed;
    }
    return 5;
  });
  const [customTax, setCustomTax] = useState<number | null>(null);

  const setTaxPercent = (percent: number) => {
    const safePercent = isNaN(Number(percent)) ? 0 : Number(percent);
    setTaxPercentState(safePercent);
    localStorage.setItem('pos_tax_percent', String(safePercent));
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTax = customTax !== null ? customTax : Math.round(cartSubtotal * taxPercent / 100);
  const cartTotal = cartSubtotal + cartTax - discount;

  // Today's stats - only count orders with billPrinted = true (actual sales)
  const todayStats = React.useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (order) => new Date(order.createdAt).toDateString() === today && order.billPrinted === true
    );
    const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = todayOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;
    return { totalSales, orderCount, avgOrderValue };
  }, [orders]);

  // Recent bills - completed bills with billPrinted = true
  const recentBills = React.useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(order => 
        new Date(order.createdAt).toDateString() === today && 
        order.billPrinted === true
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }, [orders]);

  const toggleItemAvailability = async (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    // Apply change locally first
    const updatedLocal = menuItems.map(i => {
      if (i.id === id) {
        return {
          ...i,
          isAvailable: !i.isAvailable,
          lastUpdated: new Date().toISOString(),
          pendingSync: true,
        };
      }
      return i;
    });
    setMenuItemsState(updatedLocal);
    setMenuItems(updatedLocal);

    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : null;

    try {
      if (isStoreLogin && storeId) {
        await supabase.functions.invoke('sync-store-data', {
          body: { action: 'update', store_id: storeId, data_type: 'menu_items', item_id: id, updates: { is_available: !item.isAvailable }, store_code: getStoreCode() }
        });
      } else {
        await supabase
          .from('menu_items')
          .update({ is_available: !item.isAvailable })
          .eq('id', id);
      }
      setMenuItemsState((prev) => {
        const cleared = prev.map(i => i.id === id ? { ...i, pendingSync: false } : i);
        setMenuItems(cleared);
        return cleared;
      });
    } catch (err) {
      console.warn('[Offline] Saved availability toggle locally, will sync later.', err);
    }
  };

  const addMenuItems = async (items: Omit<MenuItem, 'id' | 'isAvailable'>[]) => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : (activeStoreId
          || localStorage.getItem('owner_selected_store_id')
          || getActiveStore());

    if (!storeId) {
      toast.error('Please select a store first');
      return false;
    }
    if (!isStoreLogin && !activeStoreId && storeId) {
      setActiveStoreIdState(storeId);
      setActiveStoreStorage(storeId);
    }

    const newItemsLocal: MenuItem[] = items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      isAvailable: true,
      lastUpdated: new Date().toISOString(),
      pendingSync: true,
    }));

    setMenuItemsState(prev => {
      const updated = [...prev, ...newItemsLocal];
      setMenuItems(updated);
      return updated;
    });
    toast.success(`${newItemsLocal.length} item(s) added locally`);
    logSecurityAction('CREATE', 'menu_items', undefined, undefined, newItemsLocal);

    try {
      if (isStoreLogin) {
        const { data: result, error: fnError } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'save', store_id: storeId, data_type: 'menu_items', store_code: getStoreCode(), items: newItemsLocal.map(item => ({
            id: item.id,
            name: item.name,
            nameHindi: item.nameHindi || null,
            price: item.price,
            category: item.category,
            isAvailable: true,
            preparationTime: item.preparationTime || null,
            stock: item.stock || null,
            image: item.image || null,
            linkedInventoryId: item.linkedInventoryId || null,
            gramagePerUnit: item.gramagePerUnit || 0,
            sku: item.sku || null,
          })) }
        });

        if (!fnError && result?.items) {
          setMenuItemsState(prev => {
            const cleared = prev.map(p => {
              if (newItemsLocal.some(n => n.id === p.id)) {
                return { ...p, pendingSync: false };
              }
              return p;
            });
            setMenuItems(cleared);
            return cleared;
          });
        }
      } else {
        const dbItems = newItemsLocal.map(item => ({
          id: item.id,
          store_id: storeId,
          name: item.name,
          name_hindi: item.nameHindi || null,
          price: item.price,
          category: item.category,
          is_available: true,
          preparation_time: item.preparationTime || null,
          stock: item.stock || null,
          image_url: item.image || null,
          linked_inventory_id: item.linkedInventoryId || null,
          gramage_per_unit: item.gramagePerUnit || 0,
          sku: item.sku || null,
          barcode: item.barcode || null,
        }));

        const { error } = await supabase
          .from('menu_items')
          .insert(dbItems);

        if (error) throw error;

        setMenuItemsState(prev => {
          const cleared = prev.map(p => {
            if (newItemsLocal.some(n => n.id === p.id)) {
              return { ...p, pendingSync: false };
            }
            return p;
          });
          setMenuItems(cleared);
          return cleared;
        });
      }
    } catch (err) {
      console.warn('[Offline] Add items synced locally only, background sync will retry.', err);
    }
    return true;
  };

  const addCategory = async (category: Omit<Category, 'color'>) => {
    if (categories.some(c => c.id === category.id)) {
      return;
    }
    
    const newCategory: Category = {
      ...category,
      color: 'cat-food',
      lastUpdated: new Date().toISOString(),
      pendingSync: true,
    };
    
    const updatedCategories = [...categories, newCategory];
    setCategoriesState(updatedCategories);
    setCategories(updatedCategories);
    toast.success('Category added locally');
    
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : (activeStoreId
          || localStorage.getItem('owner_selected_store_id')
          || getActiveStore());
    if (!isStoreLogin && !activeStoreId && storeId) {
      setActiveStoreIdState(storeId);
      setActiveStoreStorage(storeId);
    }
    if (storeId) {
      try {
        if (isStoreLogin) {
          await supabase.functions.invoke('sync-store-data', {
            body: { action: 'save', store_id: storeId, data_type: 'categories', store_code: getStoreCode(), items: updatedCategories }
          });
        } else {
          await supabase.from('store_categories').delete().eq('store_id', storeId);
          await supabase.from('store_categories').insert(
            updatedCategories.map((c, idx) => ({
              store_id: storeId,
              category_id: c.id,
              name: c.name,
              icon: c.icon,
              color: c.color,
              sort_order: idx,
            }))
          );
        }
        setCategoriesState(prev => {
          const cleared = prev.map(c => c.id === newCategory.id ? { ...c, pendingSync: false } : c);
          setCategories(cleared);
          return cleared;
        });
      } catch (e) {
        console.warn('[Offline] Category saved locally, will sync later.', e);
      }
    }
  };

  const deleteMenuItem = async (id: string) => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId || null;

    setMenuItemsState(prev => {
      const updated = prev.filter(item => item.id !== id);
      setMenuItems(updated);
      return updated;
    });

    if (storeId) {
      const deletedKey = `pos_deleted_menu_items_${storeId}`;
      const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]') as string[];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
      }
    }

    toast.success('Item deleted locally');
    logSecurityAction('DELETE', 'menu_items', id);

    if (storeId) {
      try {
        if (isStoreLogin && getStoreCode()) {
          await supabase.functions.invoke('sync-store-data', {
            body: { action: 'delete', store_id: storeId, data_type: 'menu_items', item_ids: [id], store_code: getStoreCode() }
          });
        } else {
          await supabase
            .from('menu_items')
            .delete()
            .eq('id', id);
        }
        const deletedKey = `pos_deleted_menu_items_${storeId}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]') as string[];
        const filtered = deletedIds.filter(d => d !== id);
        localStorage.setItem(deletedKey, JSON.stringify(filtered));
      } catch (err) {
        console.warn('[Offline] Deleted item locally, cloud deletion queued.', err);
      }
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    let updatedItem: MenuItem | null = null;
    setMenuItemsState(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            ...updates,
            lastUpdated: new Date().toISOString(),
            pendingSync: true,
          };
          return updatedItem;
        }
        return item;
      });
      setMenuItems(updated);
      return updated;
    });
    toast.success('Item updated locally');
    logSecurityAction('UPDATE', 'menu_items', id, undefined, updates);

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.nameHindi !== undefined) dbUpdates.name_hindi = updates.nameHindi;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.preparationTime !== undefined) dbUpdates.preparation_time = updates.preparationTime;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.linkedInventoryId !== undefined) dbUpdates.linked_inventory_id = updates.linkedInventoryId || null;
    if (updates.gramagePerUnit !== undefined) dbUpdates.gramage_per_unit = updates.gramagePerUnit || 0;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;

    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId || null;

    if (storeId) {
      try {
        if (isStoreLogin && getStoreCode()) {
          await supabase.functions.invoke('sync-store-data', {
            body: { 
              action: 'update', store_id: storeId, data_type: 'menu_items', item_id: id, updates: dbUpdates,
              store_code: getStoreCode(),
              ...(updates.ingredients !== undefined ? { ingredients: updates.ingredients } : {}),
              ...(updates.variations !== undefined ? { variations: updates.variations } : {}),
            }
          });
        } else {
          await supabase
            .from('menu_items')
            .update(dbUpdates)
            .eq('id', id);

          if (updates.ingredients !== undefined) {
            await supabase
              .from('menu_item_ingredients')
              .delete()
              .eq('menu_item_id', id);

            if (updates.ingredients.length > 0) {
              const ingredientsToInsert = updates.ingredients.map(ing => ({
                menu_item_id: id,
                inventory_item_id: ing.inventoryItemId,
                quantity_required: ing.quantityRequired,
                unit: ing.unit
              }));
              await supabase.from('menu_item_ingredients').insert(ingredientsToInsert);
            }
          }
          if (updates.variations !== undefined) {
            await supabase
              .from('menu_item_variations')
              .delete()
              .eq('menu_item_id', id);

            if (updates.variations.length > 0) {
              const variationsToInsert = updates.variations.map((v, idx) => ({
                menu_item_id: id,
                name: v.name,
                sku: v.sku || null,
                price: v.price || 0,
                is_available: v.isAvailable !== undefined ? v.isAvailable : true,
                stock: v.stock || null,
                sort_order: v.sortOrder !== undefined ? v.sortOrder : idx,
                unit: v.unit || 'pcs'
              }));
              await supabase.from('menu_item_variations').insert(variationsToInsert);
            }
          }
        }
        setMenuItemsState(prev => {
          const cleared = prev.map(item => item.id === id ? { ...item, pendingSync: false } : item);
          setMenuItems(cleared);
          return cleared;
        });
      } catch (err) {
        console.warn('[Offline] Item updated locally, sync queued.', err);
      }
    }
  };

  // Sync categories based on menu items - ONLY show categories from menu
  const syncCategoriesFromMenu = () => {
    const uniqueCategoryIds = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
    
    // Create categories ONLY from menu items
    const menuCategories: Category[] = uniqueCategoryIds.map(catId => ({
      id: catId,
      name: catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' '),
      icon: '📦',
      color: 'cat-food'
    }));

    if (menuCategories.length > 0) {
      setCategoriesState(menuCategories);
      setCategories(menuCategories);
    }
  };

  const clearAllOrders = () => {
    setOrdersState([]);
    setOrders([]);
  };

  const addToCart = useCallback((item: MenuItem, customPrice?: number, customQuantity?: number) => {
    setCart((prev) => {
      const priceToUse = customPrice !== undefined ? customPrice : item.price;
      const qtyToUse = customQuantity !== undefined ? customQuantity : 1;
      const isDynamic = item.preparationTime === 998 || item.preparationTime === 999;
      
      const existing = prev.find((i) => {
        if (isDynamic) {
          return i.id === item.id && i.price === priceToUse;
        }
        return i.id === item.id;
      });
      
      if (existing) {
        return prev.map((i) => {
          const isMatch = isDynamic 
            ? (i.id === item.id && i.price === priceToUse)
            : (i.id === item.id);
          return isMatch ? { ...i, quantity: i.quantity + qtyToUse } : i;
        });
      }
      
      const cartItemId = `${item.id}-${priceToUse}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      return [...prev, { ...item, price: priceToUse, quantity: qtyToUse, cartItemId }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const filtered = prev.filter((item) => (item.cartItemId || item.id) !== itemId);
      return filtered;
    });
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    if (updates.quantity !== undefined && updates.quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) => {
      const mapped = prev.map((item) => {
        const isMatch = (item.cartItemId || item.id) === itemId;
        return isMatch ? { ...item, ...updates } : item;
      });
      return mapped;
    });
  }, [removeFromCart]);

  const updateCartQuantity = useCallback((itemId: string, quantity: number) => {
    updateCartItem(itemId, { quantity });
  }, [updateCartItem]);

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedTable(null);
  };

  // Helper function to reduce stock and inventory (supports recipe-based deduction with auto-production)
  const reduceStock = async (cartItems: CartItem[]) => {
    console.log('[reduceStock] Starting stock reduction for', cartItems.length, 'items');
    const stockChanges: string[] = [];
    const inventoryChanges: string[] = [];
    const autoProductionLog: string[] = [];
    
    // Get current inventory from localStorage - create a deep copy
    let currentInventory = JSON.parse(JSON.stringify(getInventory())) as typeof getInventory extends () => infer T ? T : never;
    let inventoryUpdated = false;

    console.log('[reduceStock] Current inventory items:', currentInventory.length);

    // Load inventory components from database for accurate deduction
    const { data: componentsData } = await supabase
      .from('inventory_components')
      .select('*');
    
    // Build components map
    const componentsMap: Record<string, { childInventoryId: string; quantityRequired: number; unit: string }[]> = {};
    if (componentsData) {
      componentsData.forEach(c => {
        if (!componentsMap[c.parent_inventory_id]) {
          componentsMap[c.parent_inventory_id] = [];
        }
        componentsMap[c.parent_inventory_id].push({
          childInventoryId: c.child_inventory_id,
          quantityRequired: Number(c.quantity_required),
          unit: c.unit
        });
      });
    }

    // Auto-production helper: produces item from components if stock is insufficient
    // Now supports PARTIAL PRODUCTION - will use whatever ingredients are available
    // and produce as much as possible, even if it can't cover the full demand
    const autoProduceIfNeeded = (inventoryId: string, requiredQuantity: number): number => {
      const invItemIndex = currentInventory.findIndex(i => i.id === inventoryId);
      if (invItemIndex === -1) return 0;

      const invItem = currentInventory[invItemIndex];
      
      // If we have enough stock, no need to produce
      if (invItem.quantity >= requiredQuantity) {
        return requiredQuantity; // We can fulfill the full requirement
      }

      // Check if this item has components (can be produced)
      const itemComponents = componentsMap[inventoryId] || invItem.components || [];
      if (itemComponents.length === 0) {
        console.log('[AutoProduce] No recipe for:', invItem.name, '- cannot auto-produce');
        return invItem.quantity; // Return whatever stock we have
      }

      const shortfall = requiredQuantity - Math.max(0, invItem.quantity);
      console.log('[AutoProduce]', invItem.name, 'shortfall:', shortfall, invItem.unit);

      // Use productionYield if defined, otherwise fallback to sum of components
      let yieldPerBatch: number;
      if (invItem.productionYield && invItem.productionYield > 0) {
        yieldPerBatch = invItem.productionYield;
        console.log('[AutoProduce] Using configured yield:', yieldPerBatch, invItem.productionYieldUnit || invItem.unit);
      } else {
        yieldPerBatch = itemComponents.reduce((sum, c) => {
          return sum + convertToBaseUnit(c.quantityRequired, c.unit);
        }, 0);
        console.log('[AutoProduce] Using calculated yield (sum of components):', yieldPerBatch);
      }

      if (yieldPerBatch <= 0) {
        console.log('[AutoProduce] Invalid yield per batch:', yieldPerBatch);
        return invItem.quantity;
      }

      // How many batches do we need ideally?
      const batchesNeededIdeal = Math.ceil(shortfall / yieldPerBatch);
      
      console.log('[AutoProduce] Yield per batch:', yieldPerBatch, '- Batches needed (ideal):', batchesNeededIdeal);

      // Calculate max batches we can produce based on available components
      let maxBatchesPossible = batchesNeededIdeal;
      
      for (const component of itemComponents) {
        const childItem = currentInventory.find(i => i.id === component.childInventoryId);
        if (!childItem) {
          console.log('[AutoProduce] Component not found:', component.childInventoryId);
          maxBatchesPossible = 0;
          break;
        }

        const componentQtyPerBatch = convertToBaseUnit(component.quantityRequired, component.unit);
        
        // How many batches can this component support?
        const batchesFromThisComponent = componentQtyPerBatch > 0 
          ? Math.floor(childItem.quantity / componentQtyPerBatch) 
          : 0;
        
        console.log('[AutoProduce] Component:', childItem.name, 
          '- Have:', childItem.quantity, childItem.unit,
          '- Per batch:', componentQtyPerBatch,
          '- Can make:', batchesFromThisComponent, 'batches');
        
        // Limit by the component with least availability
        maxBatchesPossible = Math.min(maxBatchesPossible, batchesFromThisComponent);
      }

      console.log('[AutoProduce] Max batches possible:', maxBatchesPossible, 'of', batchesNeededIdeal, 'needed');

      // If no batches possible, don't produce anything but still allow stock to go negative
      if (maxBatchesPossible <= 0) {
        console.log('[AutoProduce] Cannot produce any batches - insufficient ingredients');
        toast.warning(`Cannot auto-produce ${invItem.name}`, {
          description: `Insufficient ingredients. Stock will go negative.`,
        });
        return invItem.quantity; // Return current stock (may be 0 or negative)
      }

      // Produce as many batches as possible
      const batchesToProduce = maxBatchesPossible;
      
      console.log('[AutoProduce] Starting PARTIAL production of', invItem.name, '- producing', batchesToProduce, 'batches');

      // Deduct components for the batches we're producing
      for (const component of itemComponents) {
        const componentQtyNeeded = convertToBaseUnit(component.quantityRequired, component.unit) * batchesToProduce;
        const childItemIndex = currentInventory.findIndex(i => i.id === component.childInventoryId);
        
        if (childItemIndex !== -1) {
          const oldQty = currentInventory[childItemIndex].quantity;
          currentInventory[childItemIndex] = {
            ...currentInventory[childItemIndex],
            quantity: currentInventory[childItemIndex].quantity - componentQtyNeeded,
            lastUpdated: new Date()
          };
          console.log('[AutoProduce] Used component:', currentInventory[childItemIndex].name, 
            '- Deducted:', componentQtyNeeded, 
            '- Old:', oldQty, '-> New:', currentInventory[childItemIndex].quantity);
          
          // Track ingredient usage in inventory changes
          inventoryChanges.push(`${currentInventory[childItemIndex].name}: ${formatQuantityDisplay(oldQty, currentInventory[childItemIndex].unit)} → ${formatQuantityDisplay(currentInventory[childItemIndex].quantity, currentInventory[childItemIndex].unit)} (used in production)`);
        }
      }

      // Add produced quantity to parent item
      const quantityProduced = yieldPerBatch * batchesToProduce;
      const oldParentQty = currentInventory[invItemIndex].quantity;
      currentInventory[invItemIndex] = {
        ...currentInventory[invItemIndex],
        quantity: currentInventory[invItemIndex].quantity + quantityProduced,
        lastUpdated: new Date()
      };
      
      inventoryUpdated = true;
      autoProductionLog.push(`${invItem.name}: ${formatQuantityDisplay(quantityProduced, invItem.unit)} auto-produced`);
      
      console.log('[AutoProduce] SUCCESS:', invItem.name, 'produced', quantityProduced, invItem.unit,
        '- Stock:', oldParentQty, '->', currentInventory[invItemIndex].quantity);
      
      const isPartial = batchesToProduce < batchesNeededIdeal;
      if (isPartial) {
        toast.warning(`🏭 Partial Production: ${invItem.name}`, {
          description: `Produced ${formatQuantityDisplay(quantityProduced, invItem.unit)} (not enough ingredients for full demand)`,
          duration: 5000,
        });
      } else {
        toast.success(`🏭 Auto-Produced: ${invItem.name}`, {
          description: `${formatQuantityDisplay(quantityProduced, invItem.unit)} from components`,
          duration: 5000,
        });
      }

      // Return the new stock level after production
      return currentInventory[invItemIndex].quantity;
    };

    // Helper to deduct from inventory item
    // If item has components AND stock is insufficient, try auto-production first (partial if needed)
    // Then deduct from the produced stock - ingredients are ALWAYS deducted during production
    const deductInventoryItem = (inventoryId: string, quantityToDeduct: number) => {
      const invItemIndex = currentInventory.findIndex(i => i.id === inventoryId);
      if (invItemIndex === -1) {
        console.log('[reduceStock] Inventory item not found:', inventoryId);
        return;
      }

      const invItem = currentInventory[invItemIndex];
      console.log('[reduceStock] Deducting from', invItem.name, '- current stock:', invItem.quantity, '- need:', quantityToDeduct);

      // Check if stock is insufficient - always try to auto-produce if possible
      if (invItem.quantity < quantityToDeduct) {
        // Check if this item can be auto-produced from components
        const itemComponents = componentsMap[inventoryId] || invItem.components || [];
        
        if (itemComponents.length > 0) {
          console.log('[reduceStock] Stock insufficient, attempting auto-production for:', invItem.name);
          // Try to auto-produce - this now does PARTIAL production and returns new stock level
          // Ingredients are deducted during this process
          const stockAfterProduction = autoProduceIfNeeded(inventoryId, quantityToDeduct);
          console.log('[reduceStock] Stock after auto-production attempt:', stockAfterProduction);
        }
      }

      // Now deduct from the inventory item (after potential auto-production)
      // Re-fetch the item as it may have been updated by auto-production
      const updatedInvItemIndex = currentInventory.findIndex(i => i.id === inventoryId);
      if (updatedInvItemIndex === -1) return;
      
      const updatedInvItem = currentInventory[updatedInvItemIndex];
      const oldQuantity = updatedInvItem.quantity;
      const newQuantity = updatedInvItem.quantity - quantityToDeduct;
      
      console.log('[reduceStock] Final deduction from', updatedInvItem.name, ':', oldQuantity, '->', newQuantity, '(deducted:', quantityToDeduct, updatedInvItem.unit + ')');
      
      // Update the item in place
      currentInventory[updatedInvItemIndex] = {
        ...updatedInvItem,
        quantity: newQuantity,
        lastUpdated: new Date()
      };
      inventoryUpdated = true;
      
      inventoryChanges.push(`${updatedInvItem.name}: ${formatQuantityDisplay(oldQuantity, updatedInvItem.unit)} → ${formatQuantityDisplay(newQuantity, updatedInvItem.unit)}`);
      
      // Alert if stock went negative
      if (newQuantity < 0 && oldQuantity >= 0) {
        toast.error(`⚠️ ${updatedInvItem.name} NEGATIVE STOCK!`, {
          description: `Stock is now ${formatQuantityDisplay(newQuantity, updatedInvItem.unit)} - Please restock immediately!`,
          duration: 10000,
        });
      } else if (newQuantity < 0) {
        // Already negative, show how much more negative
        toast.warning(`${updatedInvItem.name}: ${formatQuantityDisplay(newQuantity, updatedInvItem.unit)}`, {
          description: `Stock deficit increased`,
          duration: 5000,
        });
      }
    };
    
    for (const cartItem of cartItems) {
      const menuItem = menuItems.find(m => m.id === cartItem.id);
      if (!menuItem) {
        console.log('[reduceStock] Menu item not found:', cartItem.id);
        continue;
      }
      
      console.log('[reduceStock] Processing menu item:', menuItem.name, 'qty:', cartItem.quantity, 'ingredients:', menuItem.ingredients?.length || 0, 'linkedInventoryId:', menuItem.linkedInventoryId, 'gramagePerUnit:', menuItem.gramagePerUnit);
      
      // Update menu item stock if defined
      if (menuItem.stock !== undefined && menuItem.stock !== null) {
        const oldStock = menuItem.stock;
        const newStock = Math.max(0, menuItem.stock - cartItem.quantity);
        
        // Update in database
        await supabase
          .from('menu_items')
          .update({ stock: newStock })
          .eq('id', cartItem.id);
        
        stockChanges.push(`${menuItem.name}: ${oldStock} → ${newStock}`);
        
        // Update local state
        setMenuItemsState(prev => prev.map(item => 
          item.id === cartItem.id ? { ...item, stock: newStock } : item
        ));
      }
      
      // NEW: Recipe-based deduction (multiple ingredients)
      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        console.log('[reduceStock] Using recipe-based deduction for:', menuItem.name, '- cart qty:', cartItem.quantity);
        for (const ingredient of menuItem.ingredients) {
          // Convert ingredient quantity to base unit (g, ml, pcs) then multiply by cart quantity
          const ingredientInBaseUnit = convertToBaseUnit(ingredient.quantityRequired, ingredient.unit);
          const totalQtyNeeded = ingredientInBaseUnit * cartItem.quantity;
          
          const invItem = currentInventory.find(i => i.id === ingredient.inventoryItemId);
          console.log('[reduceStock] Ingredient:', invItem?.name || ingredient.inventoryItemId, 
            '- Recipe:', ingredient.quantityRequired, ingredient.unit,
            '- Converted to base:', ingredientInBaseUnit,
            '- x Cart qty', cartItem.quantity, '=', totalQtyNeeded);
          
          deductInventoryItem(ingredient.inventoryItemId, totalQtyNeeded);
        }
      }
      // LEGACY: Single inventory link with gramage
      else if (menuItem.linkedInventoryId && menuItem.gramagePerUnit && menuItem.gramagePerUnit > 0) {
        console.log('[reduceStock] Using legacy gramage deduction for:', menuItem.name);
        const gramageUsed = menuItem.gramagePerUnit * cartItem.quantity;
        deductInventoryItem(menuItem.linkedInventoryId, gramageUsed);
      } else {
        console.log('[reduceStock] No inventory link for:', menuItem.name, '- skipping deduction');
      }
    }
    
    // Save updated inventory to localStorage
    if (inventoryUpdated) {
      console.log('[reduceStock] Saving updated inventory to localStorage, items updated:', inventoryChanges.length);
      setInventory(currentInventory);
    }
    
    // Show stock update notification
    if (stockChanges.length > 0) {
      toast.success('Stock Updated', {
        description: stockChanges.slice(0, 3).join(', ') + (stockChanges.length > 3 ? ` +${stockChanges.length - 3} more` : ''),
        duration: 3000,
      });
    }
    
    // Show inventory update notification
    if (inventoryChanges.length > 0) {
      toast.success('Inventory Deducted', {
        description: inventoryChanges.slice(0, 3).join(', ') + (inventoryChanges.length > 3 ? ` +${inventoryChanges.length - 3} more` : ''),
        duration: 4000,
      });
    }

    // Show auto-production notification summary
    if (autoProductionLog.length > 0) {
      console.log('[reduceStock] Auto-production summary:', autoProductionLog);
    }
  };

  // DB-first bill/KOT number generation
  const generateBillNumberFromDB = useCallback(async (): Promise<string> => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
    if (storeId) {
      try {
        if (isStoreLogin) {
          const { data } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'increment', store_id: storeId, data_type: 'bill_counter', counter_type: 'bill', store_code: getStoreCode() }
          });
          if (data?.counter) {
            const count = 100000 + (Number(data.counter) % 900000);
            return count.toString();
          }
        } else {
          const { data, error } = await supabase.rpc('increment_bill_counter', { p_store_id: storeId });
          if (!error && data) {
            const count = 100000 + (Number(data) % 900000);
            return count.toString();
          }
        }
      } catch (e) {
        console.error('Failed to get bill number from DB:', e);
      }
    }
    return generateBillNumber(); // fallback to localStorage
  }, [isStoreLogin, activeStoreId, getStoreCode]);

  const generateKOTNumberFromDB = useCallback(async (): Promise<string> => {
    const storeId = isStoreLogin 
      ? JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id 
      : activeStoreId;
    if (storeId) {
      try {
        if (isStoreLogin) {
          const { data } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'increment', store_id: storeId, data_type: 'bill_counter', counter_type: 'kot', store_code: getStoreCode() }
          });
          if (data?.counter) {
            return `K${data.counter.toString().padStart(4, '0')}`;
          }
        } else {
          const { data, error } = await supabase.rpc('increment_kot_counter', { p_store_id: storeId });
          if (!error && data) {
            return `K${data.toString().padStart(4, '0')}`;
          }
        }
      } catch (e) {
        console.error('Failed to get KOT number from DB:', e);
      }
    }
    return generateKOTNumber(); // fallback
  }, [isStoreLogin, activeStoreId, getStoreCode]);

  // Create KOT order - shows in orders, no sales added
  // Auto-merges if the selected table already has an active order
  const createKOTOrder = async (): Promise<Order | null> => {
    if (cart.length === 0) return null;

    // Check for existing active order on same table
    if (currentOrderType === 'dine-in' && selectedTable) {
      const existingOrder = orders.find(
        o => o.tableNumber === selectedTable.number &&
          !o.isDirectBill &&
          (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
      );

      if (existingOrder) {
        // Auto-merge: add new cart items into existing order
        const mergedItems = [...existingOrder.items];
        for (const cartItem of cart) {
          const existingIdx = mergedItems.findIndex(
            i => i.id === cartItem.id && i.notes === cartItem.notes
          );
          if (existingIdx >= 0) {
            mergedItems[existingIdx] = {
              ...mergedItems[existingIdx],
              quantity: mergedItems[existingIdx].quantity + cartItem.quantity,
            };
          } else {
            mergedItems.push({ ...cartItem });
          }
        }

        const newSubtotal = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const newTax = existingOrder.tax; // Retain tax calculation
        const newTotal = newSubtotal + newTax - (existingOrder.discount || 0);

        const updatedOrder: Order = {
          ...existingOrder,
          items: mergedItems,
          subtotal: newSubtotal,
          total: newTotal,
        };

        const updatedOrders = orders.map(o => o.id === existingOrder.id ? updatedOrder : o);
        setOrdersState(updatedOrders);
        setOrders(updatedOrders);
        saveOrderToCloud(updatedOrder);
        logSecurityAction('MERGE_KOT_ORDER', 'orders', updatedOrder.id, undefined, updatedOrder);

        toast.success(`Items merged into Table ${selectedTable.number} order`);
        clearCart();
        return updatedOrder;
      }
    }

    const kotNumber = await generateKOTNumberFromDB();
    const order: Order = {
      id: generateId(),
      kotNumber,
      items: [...cart],
      subtotal: cartSubtotal,
      tax: cartTax,
      discount,
      total: cartTotal,
      status: 'pending',
      orderType: currentOrderType,
      tableNumber: selectedTable?.number,
      createdAt: new Date(),
      kotPrinted: true,
      billPrinted: false,
      isDirectBill: false,
      storeId: activeStoreId || undefined,
    };

    addOrderToStorage(order);
    saveOrderToCloud(order);
    logSecurityAction('CREATE_KOT_ORDER', 'orders', order.id, undefined, order);
    setOrdersState(getOrders());

    if (currentOrderType === 'dine-in' && selectedTable) {
      updateTableStatus(selectedTable.id, 'occupied');
    }

    clearCart();
    return order;
  };

  // Print bill for existing KOT order - adds to sales
  const printBillForOrder = async (
    orderId: string,
    paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit',
    customerInfo?: { name?: string; phone?: string; email?: string; address?: string },
    paymentBreakdown?: { method: string; amount: number }[]
  ): Promise<Order | null> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const billNumber = await generateBillNumberFromDB();
    
    // Build payment breakdown object for storage
    const breakdown: Record<string, number> = {};
    if (paymentBreakdown) {
      paymentBreakdown.forEach(({ method, amount }) => {
        breakdown[method] = amount;
      });
    }

    const updatedOrder: Order = {
      ...order,
      billNumber,
      paymentMethod,
      paymentBreakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
      customerName: customerInfo?.name || order.customerName,
      customerPhone: customerInfo?.phone || order.customerPhone,
      billPrinted: true,
      status: 'completed'
    };

    console.log('ORDER BEFORE SAVE', updatedOrder);

    // Try to save to cloud, but don't block bill printing if it fails (will sync later)
    try {
      const saveSuccess = await saveOrderToCloud(updatedOrder);
      if (!saveSuccess) {
        console.warn('[POS] Cloud sync failed - order saved locally, will retry later');
      }
    } catch (e) {
      console.warn('[POS] Cloud sync error - order saved locally:', e);
    }

    logSecurityAction('PRINT_BILL', 'orders', updatedOrder.id, undefined, updatedOrder);

    const updatedOrders = orders.map(o => o.id === orderId ? updatedOrder : o);
    setOrdersState(updatedOrders);
    setOrders(updatedOrders);

    reduceStock(order.items);

    if (order.orderType === 'dine-in' && order.tableNumber) {
      const table = tables.find(t => t.number === order.tableNumber);
      if (table) {
        updateTableStatus(table.id, 'available');
      }
    }

    // Auto-create Credit Ledger entry for due/credit sales
    const finalCustomerName = (customerInfo?.name || order.customerName || 'Walk-in Customer').trim();
    const finalCustomerPhone = (customerInfo?.phone || order.customerPhone || '').trim() || null;

    if ((paymentMethod === 'due' || paymentMethod === 'credit') && activeStoreId) {
      const creditEntry: CreditEntry = {
        id: generateId(),
        store_id: activeStoreId,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        bill_number: billNumber,
        total_amount: order.total,
        paid_amount: 0,
        due_amount: order.total,
        payment_status: 'unpaid',
        notes: null,
        created_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        pendingSync: true
      };

      try {
        const currentLedger = getCreditLedger();
        setCreditLedger([...currentLedger, creditEntry]);
        await saveCreditEntryToCloud([creditEntry]);
      } catch (e) {
        console.error('[CreditLedger] insert failed:', e);
      }
    }

    // For part payments, create credit ledger entry for credit portion if > 0
    if (paymentMethod === 'part' && paymentBreakdown && activeStoreId) {
      const creditPortion = paymentBreakdown.find(p => p.method.toLowerCase() === 'credit' || p.method.toLowerCase() === 'due');
      if (creditPortion && creditPortion.amount > 0) {
        const creditEntry: CreditEntry = {
          id: generateId(),
          store_id: activeStoreId,
          customer_name: finalCustomerName,
          customer_phone: finalCustomerPhone,
          bill_number: billNumber,
          total_amount: creditPortion.amount,
          paid_amount: 0,
          due_amount: creditPortion.amount,
          payment_status: 'unpaid',
          notes: null,
          created_at: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          pendingSync: true
        };

        try {
          const currentLedger = getCreditLedger();
          setCreditLedger([...currentLedger, creditEntry]);
          await saveCreditEntryToCloud([creditEntry]);
        } catch (e) {
          console.error('[CreditLedger] insert failed for part payment credit:', e);
        }
      }
    }

    return updatedOrder;
  };

  // Direct bill print - no KOT, doesn't show in orders (only in recent bills)
  const directBillPrint = async (
    paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit' | 'access',
    customerInfo?: { name?: string; phone?: string; email?: string; address?: string },
    paymentBreakdown?: { method: string; amount: number }[]
  ): Promise<Order | null> => {
    if (cart.length === 0) return null;

    if (paymentMethod === 'credit') {
      if (!customerInfo?.name?.trim() || !customerInfo?.phone?.trim()) {
        toast.error('Customer details required!', {
          description: 'Please add Customer Name and Phone Number for credit (Khata) bills.'
        });
        return null;
      }
    }

    const billNumber = await generateBillNumberFromDB();
    
    // Build payment breakdown object for storage
    const breakdown: Record<string, number> = {};
    if (paymentBreakdown) {
      paymentBreakdown.forEach(({ method, amount }) => {
        breakdown[method] = amount;
      });
    }
    
    const order: Order = {
      id: generateId(),
      billNumber,
      items: [...cart],
      subtotal: cartSubtotal,
      tax: cartTax,
      discount,
      total: cartTotal,
      status: 'completed',
      orderType: currentOrderType,
      tableNumber: selectedTable?.number,
      customerName: customerInfo?.name || undefined,
      customerPhone: customerInfo?.phone || undefined,
      paymentMethod,
      paymentBreakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
      createdAt: new Date(),
      kotPrinted: false,
      billPrinted: true,
      isDirectBill: true,
      storeId: activeStoreId || undefined,
    };

    console.log('ORDER BEFORE SAVE', order);
    console.log('[directBillPrint] Order being stored:', {
      paymentMethod: order.paymentMethod,
      paymentBreakdown: order.paymentBreakdown,
      breakdownKeys: Object.keys(breakdown),
    });

    // Try to save to cloud, but don't block bill printing if it fails (will sync later)
    try {
      const saveSuccess = await saveOrderToCloud(order);
      if (!saveSuccess) {
        console.warn('[POS] Cloud sync failed - order saved locally, will retry later');
      }
    } catch (e) {
      console.warn('[POS] Cloud sync error - order saved locally:', e);
    }

    logSecurityAction('PRINT_BILL', 'orders', order.id, undefined, order);

    addOrderToStorage(order);
    
    console.log('[directBillPrint] Order after storage - checking localStorage');
    const storedOrders = getOrders();
    const storedOrder = storedOrders.find(o => o.id === order.id);
    console.log('[directBillPrint] Retrieved stored order:', {
      found: !!storedOrder,
      paymentBreakdown: storedOrder?.paymentBreakdown,
    });

    setOrdersState(getOrders());

    reduceStock(cart);

    const finalCustomerName = (customerInfo?.name || 'Walk-in Customer').trim();
    const finalCustomerPhone = (customerInfo?.phone || '').trim() || null;

    // Auto-create Credit Ledger entry for due/credit sales
    if ((paymentMethod === 'due' || paymentMethod === 'credit') && activeStoreId) {
      const creditEntry: CreditEntry = {
        id: generateId(),
        store_id: activeStoreId,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        bill_number: billNumber,
        total_amount: cartTotal,
        paid_amount: 0,
        due_amount: cartTotal,
        payment_status: 'unpaid',
        notes: null,
        created_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        pendingSync: true
      };

      try {
        const currentLedger = getCreditLedger();
        setCreditLedger([...currentLedger, creditEntry]);
        await saveCreditEntryToCloud([creditEntry]);
      } catch (e) {
        console.error('[CreditLedger] insert failed:', e);
      }
    }

    // For part payments, create credit ledger entry for credit portion
    if (paymentMethod === 'part' && paymentBreakdown && activeStoreId) {
      const creditPortion = paymentBreakdown.find(p => p.method.toLowerCase() === 'credit' || p.method.toLowerCase() === 'due');
      if (creditPortion && creditPortion.amount > 0) {
        const creditEntry: CreditEntry = {
          id: generateId(),
          store_id: activeStoreId,
          customer_name: finalCustomerName,
          customer_phone: finalCustomerPhone,
          bill_number: billNumber,
          total_amount: creditPortion.amount,
          paid_amount: 0,
          due_amount: creditPortion.amount,
          payment_status: 'unpaid',
          notes: null,
          created_at: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          pendingSync: true
        };

        try {
          const currentLedger = getCreditLedger();
          setCreditLedger([...currentLedger, creditEntry]);
          await saveCreditEntryToCloud([creditEntry]);
        } catch (e) {
          console.error('[CreditLedger] insert failed for part payment credit:', e);
        }
      }
    }

    if (currentOrderType === 'dine-in' && selectedTable) {
      updateTableStatus(selectedTable.id, 'available');
    }

    clearCart();
    return order;
  };

  // Legacy placeOrder - kept for compatibility
  const placeOrder = (paymentMethod: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit'): Order | null => {
    // Fire and forget the async version
    directBillPrint(paymentMethod);
    return null; // Async now, callers should use directBillPrint
  };

  // Update order status
  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    const updatedOrder = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status } : o
    );
    setOrdersState(updatedOrders);
    setOrders(updatedOrders);
    if (updatedOrder) saveOrderToCloud({ ...updatedOrder, status });
  };

  // Update order payment method
  const updateOrderPaymentMethod = (orderId: string, paymentMethod: Order['paymentMethod']) => {
    const updatedOrder = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, paymentMethod } : o
    );
    setOrdersState(updatedOrders);
    setOrders(updatedOrders);
    if (updatedOrder) saveOrderToCloud({ ...updatedOrder, paymentMethod });
    toast.success('Payment method updated');
  };

  // Cancel order with reason
  const cancelOrder = (orderId: string, reason?: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const cancelledOrder = { 
      ...order, 
      status: 'cancelled' as const,
      cancelReason: reason,
      cancelledAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => 
      o.id === orderId ? cancelledOrder : o
    );
    setOrdersState(updatedOrders);
    setOrders(updatedOrders);
    saveOrderToCloud(cancelledOrder); // Sync cancellation to cloud

    // Free up table if dine-in
    if (order.orderType === 'dine-in' && order.tableNumber) {
      const table = tables.find(t => t.number === order.tableNumber);
      if (table) {
        updateTableStatus(table.id, 'available');
      }
    }

    toast.info(`Order #${order.kotNumber || order.id.slice(-6).toUpperCase()} cancelled`);
  };

  const holdBill = () => {
    if (cart.length === 0) return;

    const bill: HeldBill = {
      id: generateId(),
      items: [...cart],
      tableNumber: selectedTable?.number,
      heldAt: new Date(),
    };

    const newHeldBills = [...heldBills, bill];
    setHeldBillsState(newHeldBills);
    setHeldBills(newHeldBills);
    clearCart();
  };

  const recallBill = (billId: string) => {
    const bill = heldBills.find((b) => b.id === billId);
    if (!bill) return;

    setCart(bill.items);
    if (bill.tableNumber) {
      const table = tables.find((t) => t.number === bill.tableNumber);
      if (table) setSelectedTable(table);
    }
    deleteHeldBill(billId);
  };

  const deleteHeldBill = (billId: string) => {
    const newHeldBills = heldBills.filter((b) => b.id !== billId);
    setHeldBillsState(newHeldBills);
    setHeldBills(newHeldBills);
  };

  const updateTableStatus = (tableId: string, status: 'available' | 'occupied' | 'reserved') => {
    const newTables = tables.map((t) => (t.id === tableId ? { ...t, status } : t));
    setTablesState(newTables);
    setTables(newTables);
  };

  const printKOT = (order: Order) => {
    // In a real app, this would send to a thermal printer
    console.log('Printing KOT:', order);
    const updatedOrders = orders.map((o) =>
      o.id === order.id ? { ...o, kotPrinted: true, status: 'preparing' as const } : o
    );
    setOrdersState(updatedOrders);
    setOrders(updatedOrders);
  };

  // Store management - for store login, get from localStorage; otherwise from stores state
  const activeStore = React.useMemo(() => {
    if (isStoreLogin) {
      const storedData = localStorage.getItem('pos_active_store_data');
      if (storedData) {
        try {
          return JSON.parse(storedData) as Store;
        } catch {
          return null;
        }
      }
    }
    return stores.find(s => s.id === activeStoreId) || null;
  }, [isStoreLogin, stores, activeStoreId]);

  // Sync tax percentage state when active store changes
  useEffect(() => {
    if (activeStore) {
      const storeTax = activeStore.taxPercentage ?? 0;
      setTaxPercentState(storeTax);
      localStorage.setItem('pos_tax_percent', String(storeTax));
    }
  }, [activeStore]);

  const setActiveStoreId = (storeId: string | null) => {
    setActiveStoreIdState(storeId);
    setActiveStoreStorage(storeId);
  };

  const addStore = (storeData: Omit<Store, 'id' | 'createdAt' | 'isActive' | 'storeCode'> & { email?: string }): Store => {
    const localStoreId = crypto.randomUUID();
    // Create a temporary local store object for immediate UI response
    const tempStore: Store = {
      ...storeData,
      id: localStoreId,
      storeCode: localStoreId.slice(0, 8).toUpperCase(),
      isActive: true,
      createdAt: new Date()
    };

    // Persist to Supabase asynchronously
    (async () => {
      try {
        // Get merchant_id from current user's role
        const { data: { user } } = await supabase.auth.getUser();
        let merchantId: string | null = null;

        if (user) {
          const { data: roleRows } = await supabase
            .from('user_roles')
            .select('merchant_id, role')
            .eq('user_id', user.id)
            .eq('is_active', true);
          const primary = (roleRows || []).find((r: any) => r.merchant_id) || (roleRows || [])[0];
          merchantId = (primary as any)?.merchant_id || null;
        }

        if (!storeData.email?.trim()) {
          toast.error('Store email is required');
          return;
        }

        const storePayload = {
          store_id: tempStore.id,
          merchant_id: merchantId,
          store_name: storeData.name,
          email: storeData.email.trim().toLowerCase(),
          password: storeData.password || null,
          address: storeData.address || null,
          phone: storeData.phone || null,
          business_type: storeData.businessType || 'restaurant',
          country: storeData.country || 'India',
          currency_code: storeData.currencyCode || 'INR',
          tax_type: storeData.taxType || 'GST',
          tax_percentage: storeData.taxPercentage ?? 0,
        };

        let dbStore: { id: string; store_code: string | null; store_name: string } | null = null;

        const { data, error } = await supabase.functions.invoke('create-store', {
          body: storePayload,
        });

        if (error || !data?.success) {
          console.error('Failed to create store via edge function:', error || data?.error);
          toast.error(data?.error || 'Failed to create store');
          return;
        }

        dbStore = data.store;

        if (!dbStore) return;

        // Update the local store with actual DB values
        const finalStore: Store = {
          ...storeData,
          id: dbStore.id,
          storeCode: dbStore.store_code || tempStore.storeCode,
          name: dbStore.store_name,
          isActive: true,
          createdAt: new Date()
        };

        setStoresState(prev => {
          const withoutTemp = prev.filter(s => s.id !== tempStore.id);
          return [...withoutTemp, finalStore];
        });
        setStoresStorage([...stores.filter(s => s.id !== tempStore.id), finalStore]);
        toast.success('Store created successfully!');
      } catch (err) {
        console.error('Store creation error:', err);
        toast.error('Failed to create store');
      }
    })();

    // Return temp store immediately for UI
    const updatedStores = [...stores, tempStore];
    setStoresState(updatedStores);
    setStoresStorage(updatedStores);
    return tempStore;
  };

  const loginStore = async (storeCode: string, password: string): Promise<Store | null> => {
    try {
      // Input validation - allow UUID-prefix Store IDs or STR##### ref codes
      const sanitizedStoreCode = storeCode.trim().replace(/[<>'"&]/g, '');
      const sanitizedPassword = password.trim();

      const isValidFormat = /^[0-9A-F]{8}$/i.test(sanitizedStoreCode) || /^STR[0-9]{5}$/i.test(sanitizedStoreCode);
      if (!isValidFormat) {
        toast.error('Invalid store code format. Use 8-character Store ID.');
        return null;
      }

      if (sanitizedPassword.length < 4 || sanitizedPassword.length > 50) {
        toast.error('Invalid password format');
        return null;
      }

      // Use secure edge function for store login
      const { data, error } = await supabase.functions.invoke('secure-store-login', {
        body: { 
          store_code: sanitizedStoreCode, 
          password: sanitizedPassword 
        }
      });
      
      if (error) {
        console.error('Store login error:', error);
        toast.error('Login failed. Please try again.');
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }
      
      if (data?.success) {
        const store: Store = {
          id: data.store_id,
          name: data.store_name,
          address: data.store_address || '',
          phone: data.store_phone || '',
          storeCode: sanitizedStoreCode,
          // SECURITY: Don't store password in localStorage
          password: '',
          isActive: true,
          createdAt: new Date(),
          customer_id: data.customer_id
        };
        
        setActiveStoreIdState(data.store_id);
        setActiveStoreStorage(data.store_id);
        setIsStoreLogin(true);
        localStorage.setItem('pos_is_store_login', 'true');
        // Store store_code directly for reliable auth
        localStorage.setItem('pos_store_code', sanitizedStoreCode);
        // Store only non-sensitive data
        localStorage.setItem('pos_active_store_data', JSON.stringify({
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          storeCode: store.storeCode,
          store_code: sanitizedStoreCode,
          customer_id: store.customer_id,
          subscription_tier: data.subscription_tier || 'basic',
          business_type: data.business_type || 'restaurant',
          enabled_addons: data.enabled_addons || [],
          staff_limit: data.staff_limit || 2,
          outlet_limit: data.outlet_limit || 1,
        }));
        
        logSecurityAction('LOGIN', 'stores', data.store_id);
        return store;
      }
      
      toast.error('Invalid store code or password');
      return null;
    } catch (error) {
      console.error('Store login error:', error);
      toast.error('An unexpected error occurred');
      return null;
    }
  };

  const logoutStore = () => {
    if (activeStoreId) {
      logSecurityAction('LOGOUT', 'stores', activeStoreId);
    }
    setActiveStoreIdState(null);
    setActiveStoreStorage(null);
    setIsStoreLogin(false);
    localStorage.removeItem('pos_is_store_login');
    localStorage.removeItem('pos_active_store_data');
    localStorage.removeItem('pos_store_code');
    // IMPORTANT: Do NOT clear localStorage data (orders, inventory, etc.)
    // Data is scoped by store_id and will be naturally isolated on next login
    // Clearing would cause data loss for the business
  };

  const updateStore = (id: string, updates: Partial<Store>) => {
    const updatedStores = stores.map(store => 
      store.id === id ? { ...store, ...updates } : store
    );
    setStoresState(updatedStores);
    setStoresStorage(updatedStores);

    // Persist to Supabase database
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.businessType !== undefined) dbUpdates.business_type = updates.businessType;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.currencyCode !== undefined) dbUpdates.currency_code = updates.currencyCode;
    if (updates.taxType !== undefined) dbUpdates.tax_type = updates.taxType;
    if (updates.taxPercentage !== undefined) dbUpdates.tax_percentage = updates.taxPercentage;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    if (Object.keys(dbUpdates).length > 0) {
      if (isStoreLogin) {
        supabase.functions.invoke('sync-store-data', {
          body: {
            action: 'update',
            store_id: id,
            data_type: 'store_details',
            store_code: getStoreCode(),
            updates: dbUpdates
          }
        }).then(({ data, error }) => {
          if (error || data?.error) {
            console.error('Failed to update store via edge function:', error || data?.error);
          } else {
            // Also sync active store data if it's the current store
            const stored = localStorage.getItem('pos_active_store_data');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed.id === id) {
                  localStorage.setItem('pos_active_store_data', JSON.stringify({ ...parsed, ...updates }));
                }
              } catch {}
            }
          }
        });
      } else {
        supabase
          .from('stores')
          .update(dbUpdates)
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to update store in Supabase:', error);
            }
          });
      }
    }
  };

  const deleteStore = (id: string) => {
    const updatedStores = stores.filter(store => store.id !== id);
    setStoresState(updatedStores);
    setStoresStorage(updatedStores);
    if (activeStoreId === id) {
      setActiveStoreId(null);
    }
    toast.success('Store deleted');
  };

  const getStoreSales = (storeId: string): number => {
    const today = new Date().toDateString();
    return orders
      .filter(order => 
        order.storeId === storeId && 
        new Date(order.createdAt).toDateString() === today &&
        order.status === 'completed'
      )
      .reduce((sum, order) => sum + order.total, 0);
  };

  // Low stock items - based on per-item stockAlertThreshold
  const lowStockItems = menuItems.filter(item => {
    if (item.stockAlertThreshold !== undefined && item.stock !== undefined) {
      return item.stock <= item.stockAlertThreshold;
    }
    return false;
  });

  return (
    <POSContext.Provider
      value={{
        menuItems,
        categories,
        activeCategory,
        setActiveCategory,
        toggleItemAvailability,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartItem,
        clearCart,
        cartSubtotal,
        cartTax,
        cartTotal,
        discount,
        setDiscount,
        taxPercent,
        setTaxPercent,
        customTax,
        setCustomTax,
        orders,
        recentBills,
        currentOrderType,
        setCurrentOrderType,
        selectedTable,
        setSelectedTable,
        placeOrder,
        createKOTOrder,
        printBillForOrder,
        directBillPrint,
        updateOrderStatus,
        updateOrderPaymentMethod,
        cancelOrder,
        clearAllOrders,
        heldBills,
        holdBill,
        recallBill,
        deleteHeldBill,
        tables,
        updateTableStatus,
        printKOT,
        isOnline,
        todayStats,
        addMenuItems,
        addCategory,
        deleteMenuItem,
        updateMenuItem,
        syncCategoriesFromMenu,
        stores,
        activeStore,
        setActiveStoreId,
        addStore,
        loginStore,
        logoutStore,
        updateStore,
        deleteStore,
        getStoreSales,
        isStoreLogin,
        lowStockItems,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing - for components that may render outside provider
export const usePOSSafe = () => {
  return useContext(POSContext);
};
