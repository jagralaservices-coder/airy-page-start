// Hook for syncing inventory, expenses, held bills, and settings to cloud
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  InventoryItem, Expense, HeldBill, Table,
  setInventory,
  setExpenses,
  setHeldBills,
  setTables,
  safeMerge,
  MenuItem, Category, Customer, CreditEntry, CreditPayment,
  getMenuItems, setMenuItems,
  getCategories, setCategories,
  getCustomers, setCustomers,
  getCreditLedger, setCreditLedger,
  getCreditPayments, setCreditPayments
} from '@/lib/store';

const SYNC_INTERVAL = 90000; // 90 seconds

const getStoreId = (): string | null => {
  const ownerSelected = localStorage.getItem('owner_selected_store_id');
  if (ownerSelected) return ownerSelected;

  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      const parsed = JSON.parse(storeData);
      if (parsed?.id) return parsed.id;
      if (parsed?.storeId) return parsed.storeId;
    }
  } catch {}
  const activeStore = localStorage.getItem('pos_active_store');
  if (activeStore) {
    try { return JSON.parse(activeStore); } catch {}
  }
  return null;
};

const getStoreCode = (): string | null => {
  // Check direct key first
  const direct = localStorage.getItem('pos_store_code');
  if (direct) return direct;
  
  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      const parsed = JSON.parse(storeData);
      if (parsed?.storeCode) return parsed.storeCode;
      if (parsed?.store_code) return parsed.store_code;
    }
  } catch {}
  
  try {
    const storeLogin = localStorage.getItem('pos_store_login_data');
    if (storeLogin) {
      const parsed = JSON.parse(storeLogin);
      if (parsed?.store_code) return parsed.store_code;
    }
  } catch {}
  
  try {
    const session = localStorage.getItem('pos_store_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.store_code) return parsed.store_code;
      if (parsed?.storeCode) return parsed.storeCode;
    }
  } catch {}
  
  return null;
};

let storeSessionInvalidated = false;

const clearStaleSession = () => {
  if (localStorage.getItem('pos_login_as_demo') === 'true') return;
  if (storeSessionInvalidated) return;
  storeSessionInvalidated = true;
  console.warn('[StoreSync] Sync error detected. Backing off temporarily to preserve offline state.');
  
  // Do NOT wipe localStorage here, as transient network errors or Supabase function timeouts 
  // will cause unexpected logouts for offline users or users with poor connections.
  // We only reset the invalidation flag to allow future sync attempts.
  
  setTimeout(() => { storeSessionInvalidated = false; }, 30000); // 30 second backoff
};

const callSyncFunction = async (body: any) => {
  if (localStorage.getItem('pos_login_as_demo') === 'true') return null;
  if (storeSessionInvalidated) return null;
  try {
    // Include store_code for authentication
    const store_code = getStoreCode();
    const authBody = store_code ? { ...body, store_code } : body;
    const { data, error } = await supabase.functions.invoke('sync-store-data', { body: authBody });
    if (error) {
      // Check error name and status - FunctionsHttpError with 401 or 403 status code is auth error
      const status = (error as any).context?.status;
      const isAuthError = error.name === 'FunctionsHttpError' && (status === 401 || status === 403);
      // Also try reading response body
      let errorBody = '';
      try {
        if (typeof (error as any).context?.json === 'function') {
          const jsonBody = await (error as any).context.json();
          errorBody = JSON.stringify(jsonBody);
        }
      } catch {}
      const dataError = data ? String(data?.error || '') : '';
      const combinedError = errorBody + dataError;
      if (isAuthError || combinedError.includes('Invalid') || combinedError.includes('inactive') || combinedError.includes('Authentication required') || combinedError.includes('Access denied')) {
        clearStaleSession();
        return null;
      }
      console.error('[StoreSync] Error:', error);
      return null;
    }
    if (data?.error && (String(data.error).includes('Invalid') || String(data.error).includes('inactive') || String(data.error).includes('Authentication required') || String(data.error).includes('Access denied'))) {
      clearStaleSession();
      return null;
    }
    return data;
  } catch (err) {
    console.error('[StoreSync] Exception:', err);
    return null;
  }
};

// 
// ===== OFFLINE RETRY QUEUE HELPERS =====
const getUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const queueFailedSync = (storeId: string, action: string, dataType: string, payload: any) => {
  const key = `pos_failed_sync_queue_${storeId}`;
  try {
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    // Avoid duplicate queued payloads of same action & type
    const isDuplicate = queue.some((item: any) => 
      item.action === action && 
      item.dataType === dataType && 
      JSON.stringify(item.payload) === JSON.stringify(payload)
    );
    if (!isDuplicate) {
      queue.push({ id: getUuid(), action, dataType, payload, timestamp: Date.now() });
      localStorage.setItem(key, JSON.stringify(queue));
      console.log(`[StoreSync] Queued failed/offline ${action} for ${dataType}`);
    }
  } catch (e) {
    console.error('[StoreSync] Failed to queue offline sync:', e);
  }
};

const processFailedQueue = async (storeId: string) => {
  if (!navigator.onLine) return;
  const key = `pos_failed_sync_queue_${storeId}`;
  try {
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    if (queue.length === 0) return;

    console.log(`[StoreSync] Processing ${queue.length} failed sync items...`);
    const remaining = [];
    for (const item of queue) {
      let success = false;
      try {
        let response;
        if (item.action === 'save') {
          response = await callSyncFunction({ 
            action: 'save', 
            store_id: storeId, 
            data_type: item.dataType, 
            ...item.payload 
          });
        } else if (item.action === 'delete') {
          response = await callSyncFunction({ 
            action: 'delete', 
            store_id: storeId, 
            data_type: item.dataType, 
            ...item.payload 
          });
        }
        if (response && !response.error) {
          success = true;
          console.log(`[StoreSync] Successfully processed queued ${item.action} for ${item.dataType}`);
        }
      } catch (err) {
        console.error('[StoreSync] Failed to process queued item:', item, err);
      }
      if (!success) {
        remaining.push(item);
      }
    }
    if (remaining.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch (e) {
    console.error('[StoreSync] Error processing offline queue:', e);
  }
};

// ===== INVENTORY SYNC =====
const dbToLocalInventory = (db: any): InventoryItem => ({
  id: db.id,
  name: db.name,
  quantity: Number(db.quantity),
  unit: db.unit,
  minStock: Number(db.min_stock),
  costPerUnit: Number(db.cost_per_unit),
  costUnit: db.cost_unit || 'pcs',
  lastUpdated: new Date(db.updated_at),
  productionYield: db.production_yield ? Number(db.production_yield) : undefined,
  productionYieldUnit: db.production_yield_unit || undefined,
});

const dbToLocalExpense = (db: any): Expense => ({
  id: db.id,
  category: db.category,
  amount: Number(db.amount),
  description: db.description || '',
  date: new Date(db.date),
  paidBy: db.paid_by || '',
  storeId: db.store_id,
});

const dbToLocalHeldBill = (db: any): HeldBill => ({
  id: db.id,
  items: db.items || [],
  tableNumber: db.table_number || undefined,
  customerName: db.customer_name || undefined,
  heldAt: new Date(db.held_at),
});

const dbToLocalMenuItem = (db: any, ingredients: any[] = [], variations: any[] = []): MenuItem => ({
  id: db.id,
  name: db.name,
  nameHindi: db.name_hindi || undefined,
  price: Number(db.price),
  category: db.category,
  image: db.image_url || undefined,
  isAvailable: db.is_available,
  preparationTime: db.preparation_time || undefined,
  stock: db.stock || undefined,
  linkedInventoryId: db.linked_inventory_id || undefined,
  gramagePerUnit: db.gramage_per_unit ? Number(db.gramage_per_unit) : undefined,
  sku: db.sku || undefined,
  barcode: db.barcode || undefined,
  ingredients: ingredients.filter((ing: any) => ing.menu_item_id === db.id).map((ing: any) => ({
    id: ing.id,
    inventoryItemId: ing.inventory_item_id,
    quantityRequired: Number(ing.quantity_required),
    unit: ing.unit,
  })),
  variations: variations.filter((v: any) => v.menu_item_id === db.id).map((v: any) => ({
    id: v.id,
    menuItemId: v.menu_item_id,
    name: v.name,
    sku: v.sku || undefined,
    price: Number(v.price),
    isAvailable: v.is_available,
    stock: v.stock || undefined,
    sortOrder: v.sort_order,
    unit: v.unit || undefined,
  })),
  lastUpdated: db.updated_at,
});

const dbToLocalCategory = (db: any): Category => ({
  id: db.category_id || db.id,
  name: db.name,
  nameHindi: db.name_hindi || undefined,
  icon: db.icon || '📦',
  color: db.color || 'cat-food',
  lastUpdated: db.updated_at,
});

const dbToLocalCustomer = (db: any): Customer => ({
  id: db.id,
  name: db.name,
  phone: db.phone || '',
  email: db.email || '',
  address: db.address || '',
  city: db.city || '',
  state: db.state || '',
  pincode: db.pincode || '',
  createdAt: db.created_at,
  lastUpdated: db.updated_at || db.created_at,
});

const dbToLocalCreditEntry = (db: any): CreditEntry => ({
  id: db.id,
  store_id: db.store_id,
  customer_name: db.customer_name,
  customer_phone: db.customer_phone,
  bill_number: db.bill_number,
  total_amount: Number(db.total_amount),
  paid_amount: Number(db.paid_amount),
  due_amount: Number(db.due_amount),
  payment_status: db.payment_status,
  notes: db.notes,
  created_at: new Date(db.created_at),
  updated_at: db.updated_at,
  lastUpdated: db.updated_at || db.created_at,
});

const dbToLocalCreditPayment = (db: any): CreditPayment => ({
  id: db.id,
  credit_id: db.credit_id,
  store_id: db.store_id,
  amount: Number(db.amount),
  payment_method: db.payment_method,
  received_by: db.received_by,
  notes: db.notes,
  created_at: new Date(db.created_at),
  updated_at: db.updated_at,
  lastUpdated: db.updated_at || db.created_at,
});

export const useStoreDataSync = () => {
  const syncInProgress = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync inventory
  const syncInventory = useCallback(async (localItems: InventoryItem[]): Promise<InventoryItem[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      // 0. Sync deletions first
      const deletedKey = `pos_deleted_inventory_${storeId}`;
      const deletedIdsStr = localStorage.getItem(deletedKey);
      if (deletedIdsStr) {
        const deletedIds = JSON.parse(deletedIdsStr) as string[];
        if (deletedIds.length > 0) {
          const success = await callSyncFunction({ action: 'delete', store_id: storeId, data_type: 'inventory', item_ids: deletedIds });
          if (success) {
            localStorage.removeItem(deletedKey);
            console.log('[StoreSync] Synced deleted inventory items:', deletedIds);
          }
        }
      }

      // 1. Save local to cloud
      if (localItems.length > 0) {
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'inventory', items: localItems });
      }
      // Fetch from cloud
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'inventory' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalInventory);
        const merged = safeMerge(localItems, cloudItems);
        setInventory(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] Inventory sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync expenses
  const syncExpenses = useCallback(async (localItems: Expense[]): Promise<Expense[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      // 0. Sync deletions first
      const deletedKey = `pos_deleted_expenses_${storeId}`;
      const deletedIdsStr = localStorage.getItem(deletedKey);
      if (deletedIdsStr) {
        const deletedIds = JSON.parse(deletedIdsStr) as string[];
        if (deletedIds.length > 0) {
          const success = await callSyncFunction({ action: 'delete', store_id: storeId, data_type: 'expenses', item_ids: deletedIds });
          if (success) {
            localStorage.removeItem(deletedKey);
            console.log('[StoreSync] Synced deleted expenses:', deletedIds);
          }
        }
      }

      if (localItems.length > 0) {
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'expenses', items: localItems });
      }
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'expenses' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalExpense);
        const merged = safeMerge(localItems, cloudItems);
        setExpenses(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] Expenses sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync held bills
  const syncHeldBills = useCallback(async (localItems: HeldBill[]): Promise<HeldBill[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      if (localItems.length > 0) {
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'held_bills', items: localItems });
      }
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'held_bills' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalHeldBill);
        const merged = safeMerge(localItems, cloudItems);
        setHeldBills(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] HeldBills sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync tables
  const syncTables = useCallback(async (localItems: Table[]): Promise<Table[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      if (localItems.length > 0) {
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'tables', items: localItems });
      }
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'tables' });
      if (data?.items) {
        const cloudItems = data.items as Table[];
        const merged = safeMerge(localItems, cloudItems);
        setTables(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] Tables sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync settings
  const syncSettings = useCallback(async () => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return;

    try {
      // Gather local settings
      const settings: Record<string, any> = {
        tax_percent: localStorage.getItem('pos_tax_percent') || '5',
        bill_config: localStorage.getItem('pos_bill_config') || '{}',
        country: localStorage.getItem('pos_country') || 'IN',
      };

      await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'settings', settings });

      // Fetch from cloud
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'settings' });
      if (data?.items?.length) {
        data.items.forEach((s: any) => {
          if (s.setting_key === 'tax_percent') localStorage.setItem('pos_tax_percent', String(s.setting_value));
          if (s.setting_key === 'bill_config') localStorage.setItem('pos_bill_config', typeof s.setting_value === 'string' ? s.setting_value : JSON.stringify(s.setting_value));
          if (s.setting_key === 'country') localStorage.setItem('pos_country', String(s.setting_value));
        });
      }
    } catch (err) {
      console.error('[StoreSync] Settings sync failed:', err);
    }
  }, []);

  // Sync whatsapp config
  const syncWhatsappConfig = useCallback(async (): Promise<any> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return null;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) {
      const cached = localStorage.getItem(`pos_whatsapp_config_${storeId}`);
      return cached ? JSON.parse(cached) : null;
    }

    try {
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'whatsapp_config' });
      if (data?.config) {
        localStorage.setItem(`pos_whatsapp_config_${storeId}`, JSON.stringify(data.config));
        return data.config;
      }
    } catch (err) {
      console.error('[StoreSync] WhatsApp config sync failed:', err);
    }
    const cached = localStorage.getItem(`pos_whatsapp_config_${storeId}`);
    return cached ? JSON.parse(cached) : null;
  }, []);

  // Save single item to cloud immediately with offline retry queue
  const saveInventoryToCloud = useCallback(async (items: InventoryItem[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'inventory', { items });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'inventory', items });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'inventory', { items });
      }
    } catch (err) {
      console.error('[StoreSync] Inventory save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'inventory', { items });
    }
  }, []);

  const saveExpensesToCloud = useCallback(async (items: Expense[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'expenses', { items });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'expenses', items });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'expenses', { items });
      }
    } catch (err) {
      console.error('[StoreSync] Expense save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'expenses', { items });
    }
  }, []);

  const saveHeldBillsToCloud = useCallback(async (items: HeldBill[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'held_bills', { items });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'held_bills', items });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'held_bills', { items });
      }
    } catch (err) {
      console.error('[StoreSync] Held bills save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'held_bills', { items });
    }
  }, []);

  const deleteHeldBillFromCloud = useCallback(async (billId: string) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId) return;

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'delete', 'held_bills', { item_ids: [billId] });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'delete', store_id: storeId, data_type: 'held_bills', item_ids: [billId] });
      if (!res || res.error) {
        queueFailedSync(storeId, 'delete', 'held_bills', { item_ids: [billId] });
      }
    } catch (err) {
      console.error('[StoreSync] Held bill delete failed, queuing:', err);
      queueFailedSync(storeId, 'delete', 'held_bills', { item_ids: [billId] });
    }
  }, []);

  const saveCustomerToCloud = useCallback(async (items: Customer[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'pos_customers', { items });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'pos_customers', items });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'pos_customers', { items });
      }
    } catch (err) {
      console.error('[StoreSync] Customer save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'pos_customers', { items });
    }
  }, []);

  const saveCreditEntryToCloud = useCallback(async (items: CreditEntry[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    const formattedItems = items.map(e => ({
      id: e.id,
      customer_name: e.customer_name,
      customer_phone: e.customer_phone,
      bill_number: e.bill_number,
      total_amount: e.total_amount,
      paid_amount: e.paid_amount,
      due_amount: e.due_amount,
      payment_status: e.payment_status,
      notes: e.notes || null,
      created_at: new Date(e.created_at).toISOString(),
    }));

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'credit_ledger', { items: formattedItems });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'credit_ledger', items: formattedItems });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'credit_ledger', { items: formattedItems });
      }
    } catch (err) {
      console.error('[StoreSync] Credit entry save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'credit_ledger', { items: formattedItems });
    }
  }, []);

  const saveCreditPaymentToCloud = useCallback(async (items: CreditPayment[]) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId || items.length === 0) return;

    const formattedItems = items.map(pay => ({
      id: pay.id,
      credit_id: pay.credit_id,
      amount: pay.amount,
      payment_method: pay.payment_method,
      received_by: pay.received_by || null,
      notes: pay.notes || null,
      created_at: new Date(pay.created_at).toISOString(),
    }));

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'credit_payments', { items: formattedItems });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'credit_payments', items: formattedItems });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'credit_payments', { items: formattedItems });
      }
    } catch (err) {
      console.error('[StoreSync] Credit payment save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'credit_payments', { items: formattedItems });
    }
  }, []);

  const saveWhatsappConfigToCloud = useCallback(async (config: any) => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    const storeId = getStoreId();
    if (!storeId) return;

    // Cache locally immediately
    localStorage.setItem(`pos_whatsapp_config_${storeId}`, JSON.stringify(config));

    if (!navigator.onLine) {
      queueFailedSync(storeId, 'save', 'whatsapp_config', { config });
      return;
    }

    try {
      const res = await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'whatsapp_config', config });
      if (!res || res.error) {
        queueFailedSync(storeId, 'save', 'whatsapp_config', { config });
      }
    } catch (err) {
      console.error('[StoreSync] WhatsApp config save failed, queuing:', err);
      queueFailedSync(storeId, 'save', 'whatsapp_config', { config });
    }
  }, []);

  // Sync menu items
  const syncMenuItems = useCallback(async (localItems: MenuItem[]): Promise<MenuItem[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      // 1. Sync deletions first
      const deletedKey = `pos_deleted_menu_items_${storeId}`;
      const deletedIdsStr = localStorage.getItem(deletedKey);
      if (deletedIdsStr) {
        const deletedIds = JSON.parse(deletedIdsStr) as string[];
        if (deletedIds.length > 0) {
          const success = await callSyncFunction({ action: 'delete', store_id: storeId, data_type: 'menu_items', item_ids: deletedIds });
          if (success) {
            localStorage.removeItem(deletedKey);
            console.log('[StoreSync] Synced deleted menu items:', deletedIds);
          }
        }
      }

      // 2. Identify and push dirty items
      const unsynced = localItems.filter(item => item.pendingSync);
      for (const item of unsynced) {
        try {
          await callSyncFunction({
            action: 'save',
            store_id: storeId,
            data_type: 'menu_items',
            items: [item]
          });
          await callSyncFunction({
            action: 'update',
            store_id: storeId,
            data_type: 'menu_items',
            item_id: item.id,
            updates: {
              name: item.name,
              name_hindi: item.nameHindi || null,
              price: item.price,
              category: item.category,
              is_available: item.isAvailable,
              preparation_time: item.preparationTime || null,
              stock: item.stock || null,
              image_url: item.image || null,
              linked_inventory_id: item.linkedInventoryId || null,
              gramage_per_unit: item.gramagePerUnit || 0,
              sku: item.sku || null,
            },
            variations: item.variations || [],
            ingredients: item.ingredients || []
          });
          item.pendingSync = false;
        } catch (itemErr) {
          console.error('[StoreSync] Failed to sync menu item:', item.name, itemErr);
        }
      }

      // 3. Fetch latest from cloud
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'menu_items' });
      if (data?.items) {
        const ingredients = data.ingredients || [];
        const variations = data.variations || [];
        const cloudItems = data.items.map((item: any) => dbToLocalMenuItem(item, ingredients, variations));
        
        const merged = safeMerge(localItems, cloudItems);
        merged.forEach(item => {
          if (!unsynced.some(u => u.id === item.id)) {
            item.pendingSync = false;
          }
        });
        setMenuItems(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] MenuItems sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync categories
  const syncCategories = useCallback(async (localItems: Category[]): Promise<Category[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      const unsynced = localItems.filter(cat => cat.pendingSync);
      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'categories' });
      const cloudItems = (data?.items || []).map(dbToLocalCategory);
      
      const merged = safeMerge(localItems, cloudItems);
      
      if (unsynced.length > 0 || localItems.length > merged.length) {
        merged.forEach(cat => { cat.pendingSync = false; });
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'categories', items: merged });
      }
      
      setCategories(merged);
      return merged;
    } catch (err) {
      console.error('[StoreSync] Categories sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync customers
  const syncCustomers = useCallback(async (localItems: Customer[]): Promise<Customer[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      const deletedKey = `pos_deleted_customers_${storeId}`;
      const deletedIdsStr = localStorage.getItem(deletedKey);
      if (deletedIdsStr) {
        const deletedIds = JSON.parse(deletedIdsStr) as string[];
        if (deletedIds.length > 0) {
          const success = await callSyncFunction({ action: 'delete', store_id: storeId, data_type: 'pos_customers', item_ids: deletedIds });
          if (success) {
            localStorage.removeItem(deletedKey);
          }
        }
      }

      const unsynced = localItems.filter(c => c.pendingSync);
      if (unsynced.length > 0) {
        await callSyncFunction({ action: 'save', store_id: storeId, data_type: 'pos_customers', items: unsynced });
      }

      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'pos_customers' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalCustomer);
        const merged = safeMerge(localItems, cloudItems);
        merged.forEach(c => {
          if (!unsynced.some(u => u.id === c.id)) {
            c.pendingSync = false;
          }
        });
        setCustomers(merged);
        return merged;
      }
    } catch (err) {
      console.error('[StoreSync] Customers sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync Credit Ledger
  const syncCreditLedger = useCallback(async (localItems: CreditEntry[]): Promise<CreditEntry[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      const unsynced = localItems.filter(e => e.pendingSync);
      if (unsynced.length > 0) {
        const response = await callSyncFunction({
          action: 'save',
          store_id: storeId,
          data_type: 'credit_ledger',
          items: unsynced.map(e => ({
            id: e.id,
            customer_name: e.customer_name,
            customer_phone: e.customer_phone,
            bill_number: e.bill_number,
            total_amount: e.total_amount,
            paid_amount: e.paid_amount,
            due_amount: e.due_amount,
            payment_status: e.payment_status,
            notes: e.notes || null,
            created_at: new Date(e.created_at).toISOString(),
          }))
        });
        if (response?.success) {
          unsynced.forEach(e => {
            e.pendingSync = false;
          });
        }
      }

      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'credit_ledger' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalCreditEntry);
        const merged = safeMerge(localItems as any, cloudItems as any) as any[];
        merged.forEach((e: any) => {
          if (!unsynced.some(u => u.id === e.id)) {
            e.pendingSync = false;
          }
        });
        setCreditLedger(merged as any);
        return merged as any;
      }
    } catch (err) {
      console.error('[StoreSync] CreditLedger sync failed:', err);
    }
    return localItems;
  }, []);

  // Sync Credit Payments
  const syncCreditPayments = useCallback(async (localItems: CreditPayment[]): Promise<CreditPayment[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localItems;
    const storeId = getStoreId();
    if (!storeId || !navigator.onLine) return localItems;

    try {
      const unsynced = localItems.filter(p => p.pendingSync);
      if (unsynced.length > 0) {
        const response = await callSyncFunction({
          action: 'save',
          store_id: storeId,
          data_type: 'credit_payments',
          items: unsynced.map(pay => ({
            id: pay.id,
            credit_id: pay.credit_id,
            amount: pay.amount,
            payment_method: pay.payment_method,
            received_by: pay.received_by || null,
            notes: pay.notes || null,
            created_at: new Date(pay.created_at).toISOString(),
          }))
        });
        if (response?.success) {
          unsynced.forEach(p => {
            p.pendingSync = false;
          });
        }
      }

      const data = await callSyncFunction({ action: 'fetch', store_id: storeId, data_type: 'credit_payments' });
      if (data?.items) {
        const cloudItems = data.items.map(dbToLocalCreditPayment);
        const merged = safeMerge(localItems as any, cloudItems as any) as any[];
        merged.forEach((p: any) => {
          if (!unsynced.some(u => u.id === p.id)) {
            p.pendingSync = false;
          }
        });
        setCreditPayments(merged as any);
        return merged as any;
      }
    } catch (err) {
      console.error('[StoreSync] CreditPayments sync failed:', err);
    }
    return localItems;
  }, []);

  // Full periodic sync
  const startPeriodicSync = useCallback((
    getLocalInventory: () => InventoryItem[],
    getLocalExpenses: () => Expense[],
    getLocalHeldBills: () => HeldBill[],
    onInventorySync: (items: InventoryItem[]) => void,
    onExpensesSync: (items: Expense[]) => void,
    onHeldBillsSync: (items: HeldBill[]) => void,
    getLocalTables?: () => Table[],
    onTablesSync?: (items: Table[]) => void,
    onMenuItemsSync?: (items: MenuItem[]) => void,
    onCategoriesSync?: (items: Category[]) => void,
  ) => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);

    const doSync = async () => {
      if (localStorage.getItem('pos_login_as_demo') === 'true') {
        return;
      }
      const storeId = getStoreId();
      syncInProgress.current = true;
      try {
        if (storeId) {
          await processFailedQueue(storeId);
        }

        const invResult = await syncInventory(getLocalInventory());
        const expResult = await syncExpenses(getLocalExpenses());
        const hbResult = await syncHeldBills(getLocalHeldBills());
        const menuResult = await syncMenuItems(getMenuItems());
        const catResult = await syncCategories(getCategories());
        
        await syncCustomers(getCustomers());
        await syncCreditLedger(getCreditLedger());
        await syncCreditPayments(getCreditPayments());
        
        let tblResult = getLocalTables ? getLocalTables() : [];
        if (getLocalTables) {
          tblResult = await syncTables(getLocalTables());
        }

        onInventorySync(invResult);
        onExpensesSync(expResult);
        onHeldBillsSync(hbResult);
        if (onMenuItemsSync) onMenuItemsSync(menuResult);
        if (onCategoriesSync) onCategoriesSync(catResult);
        if (onTablesSync && getLocalTables) {
          onTablesSync(tblResult);
        }
        await syncSettings();
        console.log('[StoreSync] Full sync complete');
      } finally {
        syncInProgress.current = false;
      }
    };

    doSync();
    syncTimerRef.current = setInterval(doSync, SYNC_INTERVAL);

    const handleOnline = () => doSync();
    window.addEventListener('online', handleOnline);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncInventory, syncExpenses, syncHeldBills, syncTables, syncSettings, syncMenuItems, syncCategories, syncCustomers, syncCreditLedger, syncCreditPayments]);

  return {
    syncInventory,
    syncExpenses,
    syncHeldBills,
    syncTables,
    syncSettings,
    syncMenuItems,
    syncCategories,
    syncCustomers,
    syncCreditLedger,
    syncCreditPayments,
    syncWhatsappConfig,
    saveInventoryToCloud,
    saveExpensesToCloud,
    saveHeldBillsToCloud,
    deleteHeldBillFromCloud,
    saveCustomerToCloud,
    saveCreditEntryToCloud,
    saveCreditPaymentToCloud,
    saveWhatsappConfigToCloud,
    startPeriodicSync,
  };
};
