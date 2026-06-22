import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecoverySnapshot {
  id: string;
  timestamp: string;
  storeId: string;
  // Scoped lists
  menu_items?: any[];
  categories?: any[];
  orders?: any[];
  held_bills?: any[];
  staff?: any[];
  tables?: any[];
  inventory?: any[];
  expenses?: any[];
  customers?: any[];
  credit_ledger?: any[];
  credit_payments?: any[];
  // Unscoped lists
  purchase_orders?: any[];
  staff_schedule?: any[];
  staff_tasks?: any[];
  staff_leave_requests?: any[];
  staff_advance_requests?: any[];
  compliance_items?: any[];
  // Configurations
  settings: Record<string, any>;
}

// Generate the recovery snapshot payload representing all local store data
export function buildSnapshot(storeId: string): RecoverySnapshot {
  const settingsKeys = [
    'displaySettings',
    'pos_kot_settings',
    'printers_config',
    'pos_bill_config',
    'pos_sales_reset_config',
    'pos_restaurant_config',
    'pos_settings_notifications',
    'pos_settings_security',
    'pos_settings_printer',
    'pos_settings_billing',
    'billingSystemSettings',
    'pos_tax_percent',
    'pos_tax_inclusive',
    'pos_country',
    'pos_language',
    'pos_theme',
    `qr_automation_settings_${storeId}`
  ];

  const settingsData: Record<string, any> = {};
  settingsKeys.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      try {
        settingsData[key] = JSON.parse(val);
      } catch {
        settingsData[key] = val;
      }
    }
  });

  const getJSON = (key: string) => {
    const val = localStorage.getItem(key);
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  };

  return {
    id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    storeId,
    // Scoped items
    menu_items: getJSON(`pos_menu_items_${storeId}`),
    categories: getJSON(`pos_categories_${storeId}`),
    orders: getJSON(`pos_orders_${storeId}`),
    held_bills: getJSON(`pos_held_bills_${storeId}`),
    staff: getJSON(`pos_staff_${storeId}`),
    tables: getJSON(`pos_tables_${storeId}`),
    inventory: getJSON(`pos_inventory_${storeId}`),
    expenses: getJSON(`pos_expenses_${storeId}`),
    customers: getJSON(`pos_customers_${storeId}`),
    credit_ledger: getJSON(`pos_credit_ledger_${storeId}`),
    credit_payments: getJSON(`pos_credit_payments_${storeId}`),
    // Unscoped items
    purchase_orders: getJSON('purchase_orders'),
    staff_schedule: getJSON('staff_schedule'),
    staff_tasks: getJSON('staff_tasks'),
    staff_leave_requests: getJSON('staff_leave_requests'),
    staff_advance_requests: getJSON('staff_advance_requests'),
    compliance_items: getJSON('compliance_items'),
    settings: settingsData
  };
}

// Check if a snapshot is valid (i.e. contains actual store data and is not empty)
export function validateSnapshot(snapshot: RecoverySnapshot): boolean {
  if (!snapshot || !snapshot.storeId || !snapshot.settings) return false;
  
  // A snapshot must contain at least some categories, menu items, or settings to be valid
  const hasMenu = (snapshot.menu_items && snapshot.menu_items.length > 0);
  const hasCategories = (snapshot.categories && snapshot.categories.length > 0);
  const hasSettings = Object.keys(snapshot.settings).length > 0;
  
  return hasMenu || hasCategories || hasSettings;
}

// Save backup to Local Storage history (retains maximum last 5 copies)
export function saveBackupToLocalHistory(storeId: string, snapshot: RecoverySnapshot) {
  try {
    const key = `pos_local_backups_${storeId}`;
    const rawHistory = localStorage.getItem(key);
    let history: RecoverySnapshot[] = [];
    if (rawHistory) {
      try {
        history = JSON.parse(rawHistory);
      } catch {}
    }
    
    // Add new backup at the front
    history.unshift(snapshot);
    
    // Slice to maximum last 5 entries
    if (history.length > 5) {
      history = history.slice(0, 5);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (err) {
    console.error('[Backup] Failed to save backup to local history:', err);
  }
}

// Get the local backup history
export function getLocalBackupHistory(storeId: string): RecoverySnapshot[] {
  try {
    const key = `pos_local_backups_${storeId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Fetch active store credentials helper
function getStoreCode(): string | null {
  const direct = localStorage.getItem('pos_store_code');
  if (direct) return direct;
  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      return JSON.parse(storeData).storeCode || JSON.parse(storeData).store_code || null;
    }
  } catch {}
  return null;
}

// Push backup to Supabase Cloud
export async function pushBackupToCloud(storeId: string, snapshot: RecoverySnapshot): Promise<boolean> {
  if (localStorage.getItem('pos_login_as_demo') === 'true') return false;
  if (!validateSnapshot(snapshot)) {
    console.warn('[Backup] Invalid snapshot bypassed Cloud push to prevent corruption');
    return false;
  }

  setBackupStatus(storeId, { backupStatus: 'syncing' });

  try {
    // Check session path
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = !!session?.access_token;
    
    if (jwt) {
      // Upsert directly to store_settings table
      const { error } = await supabase
        .from('store_settings')
        .upsert(
          {
            store_id: storeId,
            setting_key: 'backup_snapshot',
            setting_value: snapshot as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,setting_key' }
        );
      
      if (error) {
        console.error('[Backup] Cloud direct push failed:', error);
        setBackupStatus(storeId, { backupStatus: 'failed' });
        return false;
      }
      
      const total = Object.values(getLocalCounts(storeId)).reduce((a, b) => a + b, 0);
      setBackupStatus(storeId, {
        backupStatus: 'success',
        lastBackupTime: new Date().toISOString(),
        totalRecordsBackedUp: total,
        syncStatus: 'synced'
      });
      return true;
    } else {
      // Edge function proxy path
      const storeCode = getStoreCode();
      const { error } = await supabase.functions.invoke('sync-store-data', {
        body: {
          action: 'save',
          store_id: storeId,
          store_code: storeCode,
          data_type: 'settings',
          settings: {
            backup_snapshot: snapshot
          }
        }
      });
      
      if (error) {
        console.error('[Backup] Cloud Edge Function push failed:', error);
        setBackupStatus(storeId, { backupStatus: 'failed' });
        return false;
      }
      
      const total = Object.values(getLocalCounts(storeId)).reduce((a, b) => a + b, 0);
      setBackupStatus(storeId, {
        backupStatus: 'success',
        lastBackupTime: new Date().toISOString(),
        totalRecordsBackedUp: total,
        syncStatus: 'synced'
      });
      return true;
    }
  } catch (err) {
    console.error('[Backup] Cloud push exception:', err);
    setBackupStatus(storeId, { backupStatus: 'failed' });
    return false;
  }
}

// Fetch backup from Supabase Cloud
export async function fetchBackupFromCloud(storeId: string): Promise<RecoverySnapshot | null> {
  if (localStorage.getItem('pos_login_as_demo') === 'true') return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = !!session?.access_token;

    if (jwt) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('setting_value')
        .eq('store_id', storeId)
        .eq('setting_key', 'backup_snapshot')
        .maybeSingle();
      
      if (error) {
        console.error('[Backup] Failed to fetch cloud backup:', error);
        return null;
      }
      return data?.setting_value as unknown as RecoverySnapshot || null;
    } else {
      const storeCode = getStoreCode();
      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: {
          action: 'fetch',
          store_id: storeId,
          store_code: storeCode,
          data_type: 'settings'
        }
      });

      if (error) {
        console.error('[Backup] Failed to fetch cloud backup via Edge Function:', error);
        return null;
      }
      
      const rows = data?.items || [];
      const backupRow = rows.find((r: any) => r.setting_key === 'backup_snapshot');
      return backupRow ? (backupRow.setting_value as RecoverySnapshot) : null;
    }
  } catch (err) {
    console.error('[Backup] Cloud fetch exception:', err);
    return null;
  }
}

// Complete manual local + cloud backup flow
export async function runManualBackup(storeId: string): Promise<RecoverySnapshot | null> {
  const snapshot = buildSnapshot(storeId);
  if (!validateSnapshot(snapshot)) {
    toast.error('Backup failed: No valid business data found to save.');
    return null;
  }
  
  saveBackupToLocalHistory(storeId, snapshot);
  const cloudSuccess = await pushBackupToCloud(storeId, snapshot);
  
  if (cloudSuccess) {
    toast.success('Local & Cloud backup snapshot created successfully!');
  } else {
    toast.warning('Local backup created, but failed to sync to Cloud. Check internet connection.');
  }
  
  return snapshot;
}

// Debounce helper for automatic background backups
let backupTimeout: ReturnType<typeof setTimeout> | null = null;
export function triggerDebouncedBackup(storeId: string) {
  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }
  
  // Run background backup 2.5 seconds after the last action
  backupTimeout = setTimeout(async () => {
    const snapshot = buildSnapshot(storeId);
    if (validateSnapshot(snapshot)) {
      saveBackupToLocalHistory(storeId, snapshot);
      if (navigator.onLine) {
        await pushBackupToCloud(storeId, snapshot);
        console.log('[Backup] Automatic background backup synced to Local & Cloud');
      } else {
        console.log('[Backup] Offline: Automatic background backup saved locally');
        setBackupStatus(storeId, { syncStatus: 'offline' });
      }
    }
  }, 2500);
}

// Restore selected parts of the snapshot
export function restoreSnapshot(
  storeId: string,
  snapshot: RecoverySnapshot,
  type: 'full' | 'menu' | 'reports' | 'inventory' | 'settings'
): boolean {
  if (!snapshot) return false;

  const setItem = (key: string, val: any) => {
    if (val !== undefined && val !== null) {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  };

  try {
    if (type === 'full' || type === 'menu') {
      setItem(`pos_menu_items_${storeId}`, snapshot.menu_items);
      setItem(`pos_categories_${storeId}`, snapshot.categories);
    }
    
    if (type === 'full' || type === 'reports') {
      setItem(`pos_orders_${storeId}`, snapshot.orders);
      setItem(`pos_expenses_${storeId}`, snapshot.expenses);
      setItem(`pos_customers_${storeId}`, snapshot.customers);
      setItem(`pos_credit_ledger_${storeId}`, snapshot.credit_ledger);
      setItem(`pos_credit_payments_${storeId}`, snapshot.credit_payments);
      
      // Unscoped reports data
      setItem('purchase_orders', snapshot.purchase_orders);
      setItem('staff_schedule', snapshot.staff_schedule);
      setItem('staff_tasks', snapshot.staff_tasks);
      setItem('staff_leave_requests', snapshot.staff_leave_requests);
      setItem('staff_advance_requests', snapshot.staff_advance_requests);
      setItem('compliance_items', snapshot.compliance_items);
    }
    
    if (type === 'full' || type === 'inventory') {
      setItem(`pos_inventory_${storeId}`, snapshot.inventory);
    }
    
    if (type === 'full' || type === 'settings') {
      if (snapshot.settings) {
        Object.entries(snapshot.settings).forEach(([key, val]) => {
          setItem(key, val);
        });
      }
    }
    
    if (type === 'full') {
      // Restore staff and tables configurations as well on full restore
      setItem(`pos_staff_${storeId}`, snapshot.staff);
      setItem(`pos_tables_${storeId}`, snapshot.tables);
    }

    setBackupStatus(storeId, {
      restoreStatus: 'success',
      lastRestoreTime: new Date().toISOString(),
      syncStatus: 'synced'
    });

    return true;
  } catch (err) {
    console.error('[Restore] Restoration failed:', err);
    setBackupStatus(storeId, { restoreStatus: 'failed' });
    return false;
  }
}

export interface RecordCounts {
  categories: number;
  menuItems: number;
  orders: number;
  customers: number;
  inventory: number;
  expenses: number;
  heldBills: number;
}

export function getLocalCounts(storeId: string): RecordCounts {
  const getLength = (key: string) => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return 0;
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  return {
    categories: getLength(`pos_categories_${storeId}`),
    menuItems: getLength(`pos_menu_items_${storeId}`),
    orders: getLength(`pos_orders_${storeId}`),
    customers: getLength(`pos_customers_${storeId}`),
    inventory: getLength(`pos_inventory_${storeId}`),
    expenses: getLength(`pos_expenses_${storeId}`),
    heldBills: getLength(`pos_held_bills_${storeId}`),
  };
}

export function getSnapshotCounts(snapshot: RecoverySnapshot): RecordCounts {
  return {
    categories: snapshot.categories?.length || 0,
    menuItems: snapshot.menu_items?.length || 0,
    orders: snapshot.orders?.length || 0,
    customers: snapshot.customers?.length || 0,
    inventory: snapshot.inventory?.length || 0,
    expenses: snapshot.expenses?.length || 0,
    heldBills: snapshot.held_bills?.length || 0,
  };
}

export function verifyBackupCounts(storeId: string, snapshot: RecoverySnapshot): boolean {
  const local = getLocalCounts(storeId);
  const cloud = getSnapshotCounts(snapshot);
  
  const categoriesMatch = local.categories === cloud.categories;
  const menuItemsMatch = local.menuItems === cloud.menuItems;
  const ordersMatch = local.orders === cloud.orders;
  const customersMatch = local.customers === cloud.customers;
  const inventoryMatch = local.inventory === cloud.inventory;
  const expensesMatch = local.expenses === cloud.expenses;
  const heldBillsMatch = local.heldBills === cloud.heldBills;

  const matches = (
    categoriesMatch &&
    menuItemsMatch &&
    ordersMatch &&
    customersMatch &&
    inventoryMatch &&
    expensesMatch &&
    heldBillsMatch
  );

  setBackupStatus(storeId, {
    syncStatus: matches ? 'synced' : 'mismatch'
  });

  return matches;
}

export interface BackupStatus {
  lastBackupTime: string | null;
  lastRestoreTime: string | null;
  totalRecordsBackedUp: number;
  backupStatus: 'success' | 'failed' | 'idle' | 'syncing';
  restoreStatus: 'success' | 'failed' | 'idle' | 'no_backup_found';
  syncStatus: 'synced' | 'mismatch' | 'offline' | 'pending';
}

export function getBackupStatus(storeId: string): BackupStatus {
  const totalRecords = () => {
    const counts = getLocalCounts(storeId);
    return Object.values(counts).reduce((a, b) => a + b, 0);
  };

  return {
    lastBackupTime: localStorage.getItem(`pos_last_backup_time_${storeId}`),
    lastRestoreTime: localStorage.getItem(`pos_last_restore_time_${storeId}`),
    totalRecordsBackedUp: Number(localStorage.getItem(`pos_total_records_backed_up_${storeId}`) || totalRecords()),
    backupStatus: (localStorage.getItem(`pos_backup_status_${storeId}`) || 'idle') as any,
    restoreStatus: (localStorage.getItem(`pos_restore_status_${storeId}`) || 'idle') as any,
    syncStatus: (localStorage.getItem(`pos_sync_status_${storeId}`) || 'synced') as any,
  };
}

export function setBackupStatus(storeId: string, updates: Partial<BackupStatus>) {
  Object.entries(updates).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      const storageKey = `pos_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}_${storeId}`;
      localStorage.setItem(storageKey, String(val));
    }
  });
}
