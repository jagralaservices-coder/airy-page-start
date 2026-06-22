// Hook for syncing orders between localStorage and cloud
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, getOrders, setOrders } from '@/lib/store';
import { parseOrderPaymentBreakdown } from '@/lib/paymentBreakdown';
import { toast } from 'sonner';

const SYNC_INTERVAL = 60000; // 1 minute
const LAST_SYNC_KEY = 'pos_orders_last_sync';

// Global cache to avoid redundant check queries that cause 400 Bad Request logs
let cachedHasPaymentBreakdown: boolean | null = null;

// UUID v5-like deterministic conversion from arbitrary string to UUID format
export function toUUID(input: string): string {
  // Check if already a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;
  
  // Create a deterministic UUID from the string by hashing it
  let hash = 0;
  const str = 'order:' + input;
  const chars: number[] = [];
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
    chars.push(Math.abs(hash) % 256);
  }
  // Pad to 16 bytes
  while (chars.length < 16) {
    hash = ((hash << 5) - hash) + chars.length;
    hash |= 0;
    chars.push(Math.abs(hash) % 256);
  }
  const hex = chars.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// Convert DB order to local Order format
const dbToLocal = (dbOrder: any): Order => ({
  id: dbOrder.id,
  billNumber: dbOrder.bill_number,
  items: dbOrder.items || [],
  subtotal: Number(dbOrder.subtotal),
  tax: Number(dbOrder.tax),
  discount: Number(dbOrder.discount),
  total: Number(dbOrder.total),
  status: dbOrder.status,
  orderType: dbOrder.order_type,
  tableNumber: dbOrder.table_number ? Number(dbOrder.table_number) : undefined,
  customerName: dbOrder.customer_name || undefined,
  customerPhone: dbOrder.customer_phone || undefined,
  paymentMethod: dbOrder.payment_method,
  paymentBreakdown: parseOrderPaymentBreakdown(dbOrder),
  createdAt: new Date(dbOrder.created_at),
  kotPrinted: false,
  billPrinted: dbOrder.status === 'completed',
  isDirectBill: true,
  cancelReason: dbOrder.cancel_reason || undefined,
  cancelledAt: dbOrder.cancelled_at || undefined,
  storeId: dbOrder.store_id,
});

// Global flag to prevent further sync after session invalidation
let sessionInvalidated = false;

export const useOrderSync = () => {
  const syncInProgress = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getStoreId = useCallback((): string | null => {
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
      try {
        return JSON.parse(activeStore);
      } catch {}
    }
    return null;
  }, []);

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

  // Save orders to cloud
  const saveOrdersToCloud = useCallback(async (ordersToSave: Order[]): Promise<boolean> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return false;
    if (sessionInvalidated) return false;
    const storeId = getStoreId();
    if (!storeId || ordersToSave.length === 0) return false;

    // Detect on-the-fly if public.orders table has payment_breakdown column (cached to avoid redundant queries/errors)
    let hasPaymentBreakdown = false;
    if (cachedHasPaymentBreakdown !== null) {
      hasPaymentBreakdown = cachedHasPaymentBreakdown;
    } else {
      try {
        const { error } = await supabase
          .from('orders')
          .select('payment_breakdown')
          .limit(1);
        if (!error) {
          hasPaymentBreakdown = true;
          cachedHasPaymentBreakdown = true;
        } else {
          cachedHasPaymentBreakdown = false;
        }
      } catch {
        hasPaymentBreakdown = false;
        cachedHasPaymentBreakdown = false;
      }
    }

    const isStoreLogin = localStorage.getItem('pos_is_store_login') === 'true';
    if (!isStoreLogin) {
      // Direct database upsert for owner/admin (more robust and bypasses redeploy of Edge Functions)
      try {
        const dbOrders = ordersToSave.map((order: any) => {
          const row: any = {
            id: toUUID(order.id),
            store_id: storeId,
            bill_number: order.billNumber || order.bill_number || `B${Date.now()}`,
            items: order.items || [],
            subtotal: Number(order.subtotal || 0),
            tax: Number(order.tax || 0),
            discount: Number(order.discount || 0),
            total: Number(order.total || 0),
            order_type: order.orderType || order.order_type || 'dine-in',
            table_number: order.tableNumber?.toString() || order.table_number || null,
            customer_name: order.customerName || order.customer_name || null,
            customer_phone: order.customerPhone || order.customer_phone || null,
            payment_method: order.paymentMethod || order.payment_method || 'cash',
            payment_details: order.paymentBreakdown || order.payment_breakdown 
              ? { breakdown: order.paymentBreakdown || order.payment_breakdown } 
              : (order.paymentDetails || order.payment_details || null),
            status: order.status || 'completed',
            cancel_reason: order.cancelReason || order.cancel_reason || null,
            cancelled_at: order.cancelledAt || order.cancelled_at || null,
            created_at: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (hasPaymentBreakdown) {
            row.payment_breakdown = order.paymentBreakdown || order.payment_breakdown || null;
          }

          return row;
        });

        const { data, error } = await supabase
          .from('orders')
          .upsert(dbOrders, { onConflict: 'id' })
          .select('id');

        if (error) {
          console.error('[OrderSync] Direct save error, falling back to Edge Function:', error);
          // Fall through to Edge Function call as fallback
        } else {
          console.log('[OrderSync] Direct saved', data?.length, 'orders to cloud');
          return true;
        }
      } catch (err) {
        console.error('[OrderSync] Direct save failed, falling back to Edge Function:', err);
        // Fall through
      }
    }

    try {
      // Map orders to match Edge Function save format
      const functionOrders = ordersToSave.map((order: any) => {
        const row: any = {
          ...order,
          // Backup to payment_details
          paymentDetails: order.paymentBreakdown || order.payment_breakdown 
            ? { breakdown: order.paymentBreakdown || order.payment_breakdown } 
            : (order.paymentDetails || order.payment_details || null),
        };
        return row;
      });

      const { data, error } = await supabase.functions.invoke('sync-orders', {
        body: {
          action: 'save',
          store_id: storeId,
          store_code: getStoreCode(),
          orders: functionOrders,
        }
      });

      if (error) {
        console.error('[OrderSync] Save error:', error);
        return false;
      }

      console.log('[OrderSync] Saved', data?.saved_count, 'orders to cloud');
      return true;
    } catch (err) {
      console.error('[OrderSync] Save failed:', err);
      return false;
    }
  }, [getStoreId]);

  // Fetch orders from cloud
  const clearStaleSession = () => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return;
    if (sessionInvalidated) return;
    sessionInvalidated = true;
    console.warn('[OrderSync] Sync error detected. Backing off temporarily to prevent loop.');
    if (syncTimerRef.current) { clearInterval(syncTimerRef.current); syncTimerRef.current = null; }
    
    // Backoff for 30 seconds before trying again, instead of wiping the session
    setTimeout(() => { sessionInvalidated = false; }, 30000);
  };

  const fetchOrdersFromCloud = useCallback(async (): Promise<Order[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return [];
    if (sessionInvalidated) return [];
    const storeId = getStoreId();
    if (!storeId) return [];

    try {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);

      const { data, error } = await supabase.functions.invoke('sync-orders', {
        body: {
          action: 'fetch',
          store_id: storeId,
          store_code: getStoreCode(),
          last_sync_time: lastSync || undefined,
        }
      });

      if (error) {
        console.error('[OrderSync] Fetch error:', error);
        // FunctionsHttpError = non-2xx, check status code for 401 or 403
        const status = (error as any).context?.status;
        const isAuthError = error.name === 'FunctionsHttpError' && (status === 401 || status === 403);
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
        }
        return [];
      }
      if (data?.error && (String(data.error).includes('Invalid') || String(data.error).includes('inactive') || String(data.error).includes('Authentication required') || String(data.error).includes('Access denied'))) {
        clearStaleSession();
        return [];
      }

      const cloudOrders = (data?.orders || []).map(dbToLocal);
      console.log('[OrderSync] Fetched', cloudOrders.length, 'orders from cloud');
      return cloudOrders;
    } catch (err) {
      console.error('[OrderSync] Fetch failed:', err);
      return [];
    }
  }, [getStoreId]);

  // Full sync: merge local and cloud orders
  const syncOrders = useCallback(async (localOrders: Order[]): Promise<Order[]> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return localOrders;
    if (syncInProgress.current) return localOrders;
    if (!navigator.onLine) return localOrders;

    const storeId = getStoreId();
    if (!storeId) return localOrders;

    syncInProgress.current = true;

    try {
      // 1. Save local orders to cloud
      const unsyncedOrders = localOrders.filter(o => {
        // Save all orders that have storeId matching current store
        return !o.storeId || o.storeId === storeId;
      });

      if (unsyncedOrders.length > 0) {
        await saveOrdersToCloud(unsyncedOrders);
      }

      // 2. Fetch orders from cloud
      const cloudOrders = await fetchOrdersFromCloud();

      // 3. Merge: cloud orders take precedence (newer updated_at)
      const mergedMap = new Map<string, Order>();
      
      // Add local orders first
      localOrders.forEach(o => mergedMap.set(o.id, o));
      
      // Cloud orders override local - but preserve local paymentBreakdown if cloud returns null/undefined
      // Also match by billNumber to prevent duplicates (since cloud has UUID and local has short ID)
      const localByBill = new Map(
        localOrders
          .filter(o => o.billNumber)
          .map(o => [o.billNumber, o])
      );

      cloudOrders.forEach(o => {
        const local = mergedMap.get(o.id) || (o.billNumber ? localByBill.get(o.billNumber) : undefined);
        
        if (local) {
          if (local.paymentBreakdown && !o.paymentBreakdown) {
            o.paymentBreakdown = local.paymentBreakdown;
          }
          // Remove the local order from mergedMap if it had a different ID (short ID vs UUID) to prevent duplicates
          if (local.id !== o.id) {
            mergedMap.delete(local.id);
          }
        }
        
        mergedMap.set(o.id, o);
      });

      const merged = Array.from(mergedMap.values());
      
      // 4. Save merged orders locally
      setOrders(merged);
      
      // 5. Update last sync time
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log('[OrderSync] Sync complete. Local:', localOrders.length, 'Cloud:', cloudOrders.length, 'Merged:', merged.length);
      
      return merged;
    } catch (err) {
      console.error('[OrderSync] Sync failed:', err);
      return localOrders;
    } finally {
      syncInProgress.current = false;
    }
  }, [getStoreId, saveOrdersToCloud, fetchOrdersFromCloud]);

  // Save a single order immediately to cloud
  const saveOrderToCloud = useCallback(async (order: Order): Promise<boolean> => {
    if (localStorage.getItem('pos_login_as_demo') === 'true') return true;
    console.log('ORDER BEFORE SAVE', order);
    
    const storeId = getStoreId();
    if (!storeId) return false;

    // Set storeId on order
    const orderWithStore = { ...order, storeId: storeId };
    
    if (!navigator.onLine) {
      console.log('[OrderSync] Offline - order saved locally only');
      return true;
    }
    
    try {
      const success = await saveOrdersToCloud([orderWithStore]);
      return success;
    } catch (err) {
      console.error('[OrderSync] Failed to save order to cloud:', err);
      return false;
    }
  }, [getStoreId, saveOrdersToCloud]);

  // Start periodic sync
  const startPeriodicSync = useCallback((getLocalOrders: () => Order[], onSync: (orders: Order[]) => void) => {
    // Stop existing timer
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    // Initial sync
    const doSync = async () => {
      if (localStorage.getItem('pos_login_as_demo') === 'true') return;
      const storeId = getStoreId();
      if (!storeId) {
        console.log('[OrderSync] No store ID, skipping sync');
        return;
      }
      const merged = await syncOrders(getLocalOrders());
      if (merged !== getLocalOrders()) {
        onSync(merged);
      }
    };

    doSync();

    // Periodic sync
    syncTimerRef.current = setInterval(doSync, SYNC_INTERVAL);

    // Sync when coming back online
    const handleOnline = () => {
      toast.info('Back online - syncing orders...');
      doSync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
      window.removeEventListener('online', handleOnline);
    };
  }, [syncOrders]);

  return {
    syncOrders,
    saveOrderToCloud,
    fetchOrdersFromCloud,
    startPeriodicSync,
  };
};
