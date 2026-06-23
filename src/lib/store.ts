// Offline-first data store using localStorage

export interface MenuItemVariation {
  id: string;
  menuItemId: string;
  name: string; // e.g., "500ml", "1L", "Small", "Large"
  sku?: string;
  price: number;
  isAvailable: boolean;
  stock?: number;
  sortOrder: number;
  unit?: string; // g, ml, ltr, kg, pcs
}

export interface MenuItem {
  id: string;
  name: string;
  nameHindi?: string;
  price: number;
  category: string;
  color?: string;
  image?: string;
  isAvailable: boolean;
  preparationTime?: number;
  stock?: number; // undefined means unlimited stock
  storeStock?: { [storeId: string]: number }; // Store-wise stock
  lastUpdated?: string | Date;
  pendingSync?: boolean;
  stockAlertThreshold?: number; // Optional: Alert when stock falls below this value
  linkedInventoryId?: string; // ID of linked inventory item (legacy single link)
  gramagePerUnit?: number; // Grams of inventory item used per unit sold (legacy)
  ingredients?: MenuItemIngredient[]; // Multiple ingredients for recipe-based linking
  sku?: string; // Stock Keeping Unit code
  barcode?: string; // Barcode value for scanning
  variations?: MenuItemVariation[]; // Sub-variations like sizes (500ml, 1L etc.)
}

export interface Category {
  id: string;
  name: string;
  nameHindi?: string;
  icon: string;
  color: string;
  lastUpdated?: string | Date;
  pendingSync?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  createdAt: string | Date;
  totalOrders?: number;
  totalSpent?: number;
  lastUpdated?: string | Date;
  pendingSync?: boolean;
}

export interface CreditEntry {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  bill_number: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string | Date;
  updated_at?: string | Date;
  lastUpdated?: string | Date;
  pendingSync?: boolean;
}

export interface CreditPayment {
  id: string;
  credit_id: string;
  store_id: string;
  amount: number;
  payment_method: string;
  received_by?: string | null;
  notes?: string | null;
  created_at: string | Date;
  updated_at?: string | Date;
  lastUpdated?: string | Date;
  pendingSync?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  cartItemId?: string;
}

export interface Order {
  id: string;
  billNumber?: string; // Bill number for completed sales
  kotNumber?: string; // KOT number for kitchen orders
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'online' | 'qr';
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit' | 'access';
  paymentBreakdown?: Record<string, number>; // For 'part' payments: { cash: amount, card: amount, upi: amount, credit: amount }
  createdAt: Date;
  kotPrinted: boolean;
  isDirectBill?: boolean; // True if bill printed without KOT (won't show in orders)
  billPrinted?: boolean; // True if bill has been printed (adds to sales)
  deliveryBoy?: string;
  onlineSource?: 'swiggy' | 'zomato' | 'direct';
  storeId?: string;
  cancelReason?: string; // Reason for cancellation
  cancelledAt?: string; // ISO timestamp when cancelled
}

export interface HeldBill {
  id: string;
  items: CartItem[];
  tableNumber?: number;
  customerName?: string;
  heldAt: Date;
}

export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'delivery';
  phone: string;
  pin: string;
  isActive: boolean;
  attendance: AttendanceRecord[];
  facePhotoUrl?: string; // URL to face photo in storage
}

export interface AttendanceRecord {
  date: string;
  checkIn?: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'half-day';
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  currentOrderId?: string;
  name?: string; // Custom table name/alias (e.g., "Window Seat", "VIP 1")
  section?: string; // Section this table belongs to
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  costUnit?: string; // Unit for cost calculation (kg, g, ltr, ml, pcs)
  lastUpdated: Date;
  components?: InventoryComponent[]; // Sub-components for this inventory item
  productionYield?: number; // How much is produced from components (in base unit g/ml/pcs)
  productionYieldUnit?: string; // Unit for production yield
  isManufactured?: boolean; // Flag to indicate this is produced internally, not purchased
}

export interface InventoryComponent {
  id: string;
  childInventoryId: string;
  quantityRequired: number;
  unit: string;
}

export interface MenuItemIngredient {
  id: string;
  inventoryItemId: string;
  quantityRequired: number;
  unit: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  paidBy: string;
  storeId?: string;
}

export interface Store {
  id: string;
  name: string;
  storeCode: string;
  password: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  customer_id?: string;
  businessType?: 'restaurant' | 'retail';
  country?: string;
  currencyCode?: string;
  taxType?: string;
  taxPercentage?: number;
  loginEmail?: string;
}

// Generate 8 digit store code
export const generateStoreCode = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Default data - Generic categories for any business type
export const defaultCategories: Category[] = [];

export const defaultMenuItems: MenuItem[] = [];

export const defaultTables: Table[] = [
  { id: 't1', number: 1, capacity: 4, status: 'available' },
  { id: 't2', number: 2, capacity: 2, status: 'available' },
  { id: 't3', number: 3, capacity: 6, status: 'available' }
];

// Storage helper functions
const STORAGE_KEYS = {
  MENU_ITEMS: 'pos_menu_items',
  CATEGORIES: 'pos_categories',
  ORDERS: 'pos_orders',
  HELD_BILLS: 'pos_held_bills',
  STAFF: 'pos_staff',
  TABLES: 'pos_tables',
  INVENTORY: 'pos_inventory',
  EXPENSES: 'pos_expenses',
  SETTINGS: 'pos_settings',
  STORES: 'pos_stores',
  ACTIVE_STORE: 'pos_active_store',
  CUSTOMERS: 'pos_customers',
  CREDIT_LEDGER: 'pos_credit_ledger',
  CREDIT_PAYMENTS: 'pos_credit_payments',
};

const readActiveStoreId = (): string | null => {
  const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE);
  if (!raw || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : parsed?.id || null;
  } catch {
    return raw;
  }
};

// Get the current store-scoped storage key
// This ensures data is isolated per store and doesn't mix across devices/logins
const getScopedKey = (baseKey: string): string => {
  const ownerSelectedStoreId = localStorage.getItem('owner_selected_store_id');
  if (ownerSelectedStoreId) return `${baseKey}_${ownerSelectedStoreId}`;

  const activeStoreId = readActiveStoreId();
  // Also check store login data
  if (!activeStoreId) {
    try {
      const storeData = localStorage.getItem('pos_active_store_data');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        if (parsed?.id) return `${baseKey}_${parsed.id}`;
      }
    } catch {}
  }
  if (activeStoreId) return `${baseKey}_${activeStoreId}`;
  return baseKey; // fallback to unscoped
};

let backupCallback: (() => void) | null = null;

export const registerBackupCallback = (cb: () => void) => {
  backupCallback = cb;
};

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (backupCallback && key !== 'pos_local_backups' && !key.startsWith('pos_local_backups_')) {
        backupCallback();
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
      if (backupCallback && key !== 'pos_local_backups' && !key.startsWith('pos_local_backups_')) {
        backupCallback();
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
};

// Safe Merge Utility to prevent data resets/overwrites and handle multi-device sync
export const safeMerge = <T extends { id?: string | number; category_id?: string | number; updated_at?: string; lastUpdated?: Date | string; pendingSync?: boolean }>(
  localItems: T[],
  cloudItems: T[],
  keyField: keyof T = 'id'
): T[] => {
  if (!cloudItems || !Array.isArray(cloudItems)) {
    return localItems;
  }
  // Ignore empty cloud payloads to protect local data from resets
  if (cloudItems.length === 0) {
    return localItems;
  }

  const mergedMap = new Map<string, T>();

  const getKey = (item: T): string => String(item[keyField] || item.id || item.category_id || '');

  // 1. Add all existing local items first
  localItems.forEach((item) => {
    const key = getKey(item);
    if (key) {
      mergedMap.set(key, item);
    }
  });

  // 2. Merge cloud items based on timestamp
  cloudItems.forEach((cloudItem) => {
    const key = getKey(cloudItem);
    if (!key) return;

    if (mergedMap.has(key)) {
      const localItem = mergedMap.get(key)!;

      // CRITICAL: never overwrite an item that has unsynced local edits.
      // The caller is responsible for pushing pendingSync items to cloud BEFORE
      // calling safeMerge; until that push succeeds and clears the flag we must
      // not allow a stale cloud row to wipe the local change (data-loss guard
      // for items #4 / #5: cloud sync overwrite + pendingSync protection).
      if (localItem && (localItem as any).pendingSync === true) {
        return;
      }

      const getTimestamp = (item: T) => {
        const val = item.updated_at || item.lastUpdated;
        if (!val) return 0;
        return new Date(val).getTime();
      };

      const localTime = getTimestamp(localItem);
      const cloudTime = getTimestamp(cloudItem);

      // Cloud wins only when strictly newer; tie -> keep local to avoid
      // overwriting an in-flight local mutation that hasn't bumped updated_at yet.
      if (cloudTime > localTime) {
        mergedMap.set(key, cloudItem);
      }
    } else {
      // Missing in local, add it
      mergedMap.set(key, cloudItem);
    }
  });

  return Array.from(mergedMap.values());
};

// Initialize default data - only if not already present
// IMPORTANT: Does NOT overwrite existing data
export const initializeData = () => {
  // Scoped default data - initialize only if absent for current store
  const scopedMenuItems = getScopedKey(STORAGE_KEYS.MENU_ITEMS);
  if (!localStorage.getItem(scopedMenuItems)) {
    storage.set(scopedMenuItems, defaultMenuItems);
  }
  const scopedCategories = getScopedKey(STORAGE_KEYS.CATEGORIES);
  if (!localStorage.getItem(scopedCategories)) {
    storage.set(scopedCategories, defaultCategories);
  }
  const scopedTables = getScopedKey(STORAGE_KEYS.TABLES);
  if (!localStorage.getItem(scopedTables)) {
    storage.set(scopedTables, defaultTables);
  }
  const scopedOrders = getScopedKey(STORAGE_KEYS.ORDERS);
  if (!localStorage.getItem(scopedOrders)) {
    storage.set(scopedOrders, []);
  }
  const scopedHeldBills = getScopedKey(STORAGE_KEYS.HELD_BILLS);
  if (!localStorage.getItem(scopedHeldBills)) {
    storage.set(scopedHeldBills, []);
  }
  const scopedStaff = getScopedKey(STORAGE_KEYS.STAFF);
  if (!localStorage.getItem(scopedStaff)) {
    storage.set(scopedStaff, []);
  }
  const scopedInventory = getScopedKey(STORAGE_KEYS.INVENTORY);
  if (!localStorage.getItem(scopedInventory)) {
    storage.set(scopedInventory, []);
  }
  const scopedExpenses = getScopedKey(STORAGE_KEYS.EXPENSES);
  if (!localStorage.getItem(scopedExpenses)) {
    storage.set(scopedExpenses, []);
  }
  const scopedCustomers = getScopedKey(STORAGE_KEYS.CUSTOMERS);
  if (!localStorage.getItem(scopedCustomers)) {
    storage.set(scopedCustomers, []);
  }
  const scopedCreditLedger = getScopedKey(STORAGE_KEYS.CREDIT_LEDGER);
  if (!localStorage.getItem(scopedCreditLedger)) {
    storage.set(scopedCreditLedger, []);
  }
  const scopedCreditPayments = getScopedKey(STORAGE_KEYS.CREDIT_PAYMENTS);
  if (!localStorage.getItem(scopedCreditPayments)) {
    storage.set(scopedCreditPayments, []);
  }
};

// Helper to apply pendingSync to modified items automatically
const applyPendingSync = <T extends { id?: string | number, lastUpdated?: string | Date, pendingSync?: boolean, updated_at?: string | Date, created_at?: string | Date }>(newItems: T[], oldItems: T[]): T[] => {
  const oldMap = new Map(oldItems.map(i => [String(i.id), i]));
  return newItems.map(newItem => {
    const oldItem = oldMap.get(String(newItem.id));
    if (!oldItem) {
      return { ...newItem, pendingSync: true, lastUpdated: new Date().toISOString() };
    }
    const oldStr = JSON.stringify({ ...oldItem, pendingSync: undefined, lastUpdated: undefined, updated_at: undefined });
    const newStr = JSON.stringify({ ...newItem, pendingSync: undefined, lastUpdated: undefined, updated_at: undefined });
    if (oldStr !== newStr) {
      return { ...newItem, pendingSync: true, lastUpdated: new Date().toISOString() };
    }
    // Allow SyncEngine to clear the flag
    if (newItem.pendingSync === false) {
      return { ...newItem, pendingSync: false, lastUpdated: oldItem.lastUpdated };
    }
    return { ...newItem, pendingSync: oldItem.pendingSync, lastUpdated: oldItem.lastUpdated };
  });
};

// Data access functions - now fully scoped per store to enforce multi-device isolation
export const getMenuItems = (): MenuItem[] => {
  const items = storage.get(getScopedKey(STORAGE_KEYS.MENU_ITEMS), defaultMenuItems);
  return items.filter(item => !['d1', 'd2', 'dr1', 'dr2', 'pz1', 'bg1', '1', '2', '3'].includes(item.id));
};
export const setMenuItems = (items: MenuItem[]) => {
  const newItems = applyPendingSync(items, getMenuItems());
  storage.set(getScopedKey(STORAGE_KEYS.MENU_ITEMS), newItems);
};

export const getCategories = (): Category[] => {
  const cats = storage.get(getScopedKey(STORAGE_KEYS.CATEGORIES), defaultCategories);
  return cats.filter(cat => !['desserts', 'drinks', 'pizza', 'burgers'].includes(cat.id));
};
export const setCategories = (categories: Category[]) => {
  const newCats = applyPendingSync(categories, getCategories());
  storage.set(getScopedKey(STORAGE_KEYS.CATEGORIES), newCats);
};

// Orders, held bills, inventory, expenses are store-scoped
export const getOrders = (): Order[] => storage.get(getScopedKey(STORAGE_KEYS.ORDERS), []);
export const setOrders = (orders: Order[]) => {
  const newOrders = applyPendingSync(orders, getOrders());
  storage.set(getScopedKey(STORAGE_KEYS.ORDERS), newOrders);
};
export const addOrder = (order: Order) => {
  const orders = getOrders();
  orders.push(order);
  setOrders(orders);
};

export const getHeldBills = (): HeldBill[] => storage.get(getScopedKey(STORAGE_KEYS.HELD_BILLS), []);
export const setHeldBills = (bills: HeldBill[]) => storage.set(getScopedKey(STORAGE_KEYS.HELD_BILLS), bills);

export const getTables = (): Table[] => storage.get(getScopedKey(STORAGE_KEYS.TABLES), defaultTables);
export const setTables = (tables: Table[]) => storage.set(getScopedKey(STORAGE_KEYS.TABLES), tables);

export const getStaff = (): Staff[] => storage.get(getScopedKey(STORAGE_KEYS.STAFF), []);
export const setStaff = (staff: Staff[]) => storage.set(getScopedKey(STORAGE_KEYS.STAFF), staff);

export const getInventory = (): InventoryItem[] => storage.get(getScopedKey(STORAGE_KEYS.INVENTORY), []);
export const setInventory = (items: InventoryItem[]) => {
  const newItems = applyPendingSync(items, getInventory());
  storage.set(getScopedKey(STORAGE_KEYS.INVENTORY), newItems);
};

export const getExpenses = (): Expense[] => storage.get(getScopedKey(STORAGE_KEYS.EXPENSES), []);
export const setExpenses = (expenses: Expense[]) => {
  const newItems = applyPendingSync(expenses, getExpenses());
  storage.set(getScopedKey(STORAGE_KEYS.EXPENSES), newItems);
};

export const getCustomers = (): Customer[] => storage.get(getScopedKey(STORAGE_KEYS.CUSTOMERS), []);
export const setCustomers = (items: Customer[]) => {
  const newItems = applyPendingSync(items, getCustomers());
  storage.set(getScopedKey(STORAGE_KEYS.CUSTOMERS), newItems);
};

export const getCreditLedger = (): CreditEntry[] => storage.get(getScopedKey(STORAGE_KEYS.CREDIT_LEDGER), []);
export const setCreditLedger = (items: CreditEntry[]) => {
  const newItems = applyPendingSync(items, getCreditLedger());
  storage.set(getScopedKey(STORAGE_KEYS.CREDIT_LEDGER), newItems);
};

export const getCreditPayments = (): CreditPayment[] => storage.get(getScopedKey(STORAGE_KEYS.CREDIT_PAYMENTS), []);
export const setCreditPayments = (items: CreditPayment[]) => {
  const newItems = applyPendingSync(items, getCreditPayments());
  storage.set(getScopedKey(STORAGE_KEYS.CREDIT_PAYMENTS), newItems);
};

export const getStores = (): Store[] => storage.get(STORAGE_KEYS.STORES, []);
export const setStores = (stores: Store[]) => storage.set(STORAGE_KEYS.STORES, stores);

export const getActiveStore = (): string | null => readActiveStoreId();
export const setActiveStore = (storeId: string | null) => storage.set(STORAGE_KEYS.ACTIVE_STORE, storeId);

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate bill number (sequential 6-digit number)
export const generateBillNumber = (): string => {
  const key = 'pos_bill_number_counter';
  let counter = parseInt(localStorage.getItem(key) || '99999') + 1; // Start from 100000
  if (counter > 999999) {
    counter = 100000; // Reset if exceeds 6 digits
  }
  localStorage.setItem(key, counter.toString());
  return counter.toString();
};

// Generate KOT number (sequential for the day)
export const generateKOTNumber = (): string => {
  const today = new Date().toDateString();
  const key = 'pos_kot_counter_' + today;
  const counter = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, counter.toString());
  return `K${counter.toString().padStart(4, '0')}`;
};

// Format currency - now uses locale settings
export const formatCurrency = (amount: number): string => {
  // Get country from localStorage for non-React contexts
  const storedCountry = localStorage.getItem('pos_country') || 'IN';
  
  const currencyConfig: Record<string, { locale: string; currency: string; minFrac: number; maxFrac: number }> = {
    'IN': { locale: 'en-IN', currency: 'INR', minFrac: 0, maxFrac: 0 },
    'OM': { locale: 'ar-OM', currency: 'OMR', minFrac: 2, maxFrac: 3 },
    'SA': { locale: 'ar-SA', currency: 'SAR', minFrac: 2, maxFrac: 2 },
    'DE': { locale: 'de-DE', currency: 'EUR', minFrac: 2, maxFrac: 2 },
    'GB': { locale: 'en-GB', currency: 'GBP', minFrac: 2, maxFrac: 2 },
  };
  
  const config = currencyConfig[storedCountry] || currencyConfig['IN'];
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minFrac,
    maximumFractionDigits: config.maxFrac,
  }).format(amount);
};
