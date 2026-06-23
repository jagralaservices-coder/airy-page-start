import { supabase } from '@/integrations/supabase/client';
import {
  getOrders, setOrders,
  getCreditLedger, setCreditLedger,
  getCreditPayments, setCreditPayments,
  getCustomers, setCustomers,
  safeMerge,
} from './store';

const getStoreId = () => {
  const storeData = localStorage.getItem('pos_active_store_data');
  if (storeData) {
    try {
      const parsed = JSON.parse(storeData);
      if (parsed?.id) return parsed.id;
    } catch {}
  }
  const activeStore = localStorage.getItem('pos_active_store');
  if (activeStore) {
    try { return JSON.parse(activeStore); } catch { return activeStore; }
  }
  return null;
};

class SyncEngine {
  private isSyncing = false;
  private interval: any = null;

  private realtimeChannel: any = null;

  start() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.sync);
      this.interval = setInterval(this.sync, 30000); // 30 seconds
      // Initial sync on startup
      setTimeout(this.sync, 2000);
      
      const storeId = getStoreId();
      if (storeId) {
        this.realtimeChannel = supabase.channel(`sync-${storeId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, this.handleRemoteChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_ledger', filter: `store_id=eq.${storeId}` }, this.handleRemoteChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_payments', filter: `store_id=eq.${storeId}` }, this.handleRemoteChange)
          .subscribe();
      }
    }
  }

  handleRemoteChange = () => {
    // Add small delay to batch multiple rapid events
    setTimeout(this.sync, 1000);
  };

  stop() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.sync);
    }
    if (this.interval) clearInterval(this.interval);
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  sync = async () => {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const storeId = getStoreId();
      if (!storeId) return;

      console.log('[SyncEngine] Starting sync loop...');
      await this.syncOrders(storeId);
      await this.syncCreditLedger(storeId);
      await this.syncCreditPayments(storeId);
      await this.syncCustomers(storeId);
      console.log('[SyncEngine] Sync loop completed.');
    } catch (e) {
      console.error('[SyncEngine] Sync failed', e);
    } finally {
      this.isSyncing = false;
    }
  };

  private async syncOrders(storeId: string) {
    const local = getOrders();
    const pending = local.filter(o => o.pendingSync);

    // Push
    for (const item of pending) {
      const payload = {
        id: item.id,
        store_id: item.storeId || storeId,
        bill_number: item.billNumber,
        items: item.items,
        subtotal: item.subtotal,
        tax: item.tax,
        discount: item.discount,
        total: item.total,
        status: item.status,
        order_type: item.orderType,
        table_number: item.tableNumber,
        customer_name: item.customerName,
        customer_phone: item.customerPhone,
        payment_method: item.paymentMethod,
        created_at: item.createdAt,
        cancel_reason: item.cancelReason,
        cancelled_at: item.cancelledAt,
        payment_breakdown: item.paymentBreakdown
      };
      const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'id' });
      if (!error) item.pendingSync = false;
    }
    if (pending.length > 0) setOrders([...local]);

    // Pull
    const { data, error } = await supabase.from('orders').select('*').eq('store_id', storeId).limit(200).order('created_at', { ascending: false });
    if (data && !error) {
      const cloudItems = data.map(row => ({
        ...row,
        billNumber: row.bill_number,
        orderType: row.order_type,
        tableNumber: row.table_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        paymentMethod: row.payment_method,
        createdAt: row.created_at,
        cancelReason: row.cancel_reason,
        cancelledAt: row.cancelled_at,
        paymentBreakdown: row.payment_breakdown,
        storeId: row.store_id
      }));
      setOrders(safeMerge(getOrders(), cloudItems as any));
    }
  }

  private async syncCreditLedger(storeId: string) {
    const local = getCreditLedger();
    const pending = local.filter(o => o.pendingSync);
    for (const item of pending) {
      const payload = { ...item };
      delete payload.pendingSync;
      delete payload.lastUpdated;
      if (!payload.store_id) payload.store_id = storeId;
      const { error } = await supabase.from('credit_ledger').upsert(payload, { onConflict: 'id' });
      if (!error) item.pendingSync = false;
    }
    if (pending.length > 0) setCreditLedger([...local]);

    const { data, error } = await supabase.from('credit_ledger').select('*').eq('store_id', storeId);
    if (data && !error) {
      setCreditLedger(safeMerge(getCreditLedger(), data));
    }
  }

  private async syncCreditPayments(storeId: string) {
    const local = getCreditPayments();
    const pending = local.filter(o => o.pendingSync);
    for (const item of pending) {
      const payload = { ...item };
      delete payload.pendingSync;
      delete payload.lastUpdated;
      if (!payload.store_id) payload.store_id = storeId;
      const { error } = await supabase.from('credit_payments').upsert(payload, { onConflict: 'id' });
      if (!error) item.pendingSync = false;
    }
    if (pending.length > 0) setCreditPayments([...local]);

    const { data, error } = await supabase.from('credit_payments').select('*').eq('store_id', storeId);
    if (data && !error) {
      setCreditPayments(safeMerge(getCreditPayments(), data));
    }
  }

  private async syncCustomers(storeId: string) {
    const local = getCustomers();
    const pending = local.filter(o => o.pendingSync);
    for (const item of pending) {
      // Avoid uploading anonymous or blank customers
      if (!item.phone || !item.name) continue;
      
      const payload = {
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        address: item.address,
        city: item.city,
        state: item.state,
        pincode: item.pincode,
        created_at: item.createdAt,
      };
      const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'id' });
      if (!error) item.pendingSync = false;
    }
    if (pending.length > 0) setCustomers([...local]);

    const { data, error } = await supabase.from('customers').select('*');
    if (data && !error) {
       const cloudItems = data.map(row => ({
         ...row,
         createdAt: row.created_at
       }));
       setCustomers(safeMerge(getCustomers(), cloudItems as any));
    }
  }
}

export const syncEngine = new SyncEngine();
