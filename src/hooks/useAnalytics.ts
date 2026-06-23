import { useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { POSContext } from '@/contexts/POSContext';
import { Order, CartItem } from '@/lib/store';
import { getPaymentBreakdownSummary, parseOrderPaymentBreakdown } from '@/lib/paymentBreakdown';
import { supabase } from '@/integrations/supabase/client';
import { getCreditPayments, getCreditLedger, safeMerge } from '@/lib/store';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { useOwnerStore } from './useOwnerStore';
import { useCloudData } from './useCloudData';
import { dbToLocalCreditEntry, dbToLocalCreditPayment } from '@/lib/transformers';

export type TimeRange = 'today' | 'week' | 'month' | 'all' | 'custom';
export interface CustomDateRange {
  from: Date;
  to?: Date;
}

export interface AnalyticsSummary {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSales: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
  avgOrderValue: number;
  totalTables: number;
  activeTables: number;
  availableTables: number;
  reservedTables: number;
  dineInOrders: number;
  takeawayOrders: number;
  deliveryOrders: number;
  onlineOrders: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  splitSales: number;
  dueSales: number;
  kotCount: number;
  billCount: number;
  heldBillsCount: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  itemCount: number;
  totalQty: number;
  totalAmount: number;
  percentage: number;
}

export interface ItemSummary {
  id: string;
  name: string;
  category: string;
  qty: number;
  amount: number;
  avgPrice: number;
}

export interface OrderTypeSummary {
  type: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentSummary {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface HourlySales {
  hour: string;
  orders: number;
  amount: number;
}

export interface CounterSummary {
  counter: string;
  orders: number;
  amount: number;
}

// Convert DB row to local Order format
const dbToLocalOrder = (dbOrder: any): Order => ({
  id: dbOrder.id,
  billNumber: dbOrder.bill_number,
  items: Array.isArray(dbOrder.items) ? dbOrder.items : [],
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

// Get store_id from localStorage for store login mode
const getStoreIdFromStorage = (): string | null => {
  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      const parsed = JSON.parse(storeData);
      if (parsed?.id) return parsed.id;
    }
  } catch {}
  const activeStore = localStorage.getItem('pos_active_store');
  if (activeStore) {
    try { return JSON.parse(activeStore); } catch {}
  }
  return null;
};

const getStoreCodeFromStorage = (): string | null => {
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

export const useAnalytics = (timeRange: TimeRange = 'today', customDateRange?: CustomDateRange) => {
  const posContext = useContext(POSContext);
  const { selectedStoreId, isOwner } = useOwnerStore();

  const { data: cloudCreditLedger } = useCloudData('credit_ledger', (data) => {
    return (data?.items || []).map(dbToLocalCreditEntry);
  }, []);

  const { data: cloudCreditPayments } = useCloudData('credit_payments', (data) => {
    return (data?.items || []).map(dbToLocalCreditPayment);
  }, []);

  const tables = posContext?.tables || [];
  const heldBills = posContext?.heldBills || [];
  const stores = posContext?.stores || [];
  const isStoreLogin = posContext?.isStoreLogin || false;

  // DB-fetched orders state
  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Determine which store_id to query
  const effectiveStoreId = useMemo(() => {
    if (isOwner && selectedStoreId) return selectedStoreId;
    return getStoreIdFromStorage();
  }, [isOwner, selectedStoreId]);

  // Convert QR order row to local Order format
  const qrToLocalOrder = (qr: any): Order => ({
    id: qr.id,
    billNumber: `QR-${qr.order_number}`,
    items: Array.isArray(qr.items) ? qr.items : [],
    subtotal: Number(qr.subtotal),
    tax: Number(qr.tax),
    discount: 0,
    total: Number(qr.total),
    status: 'completed',
    orderType: 'qr',
    customerName: qr.customer_name || undefined,
    customerPhone: qr.customer_phone || undefined,
    paymentMethod: 'qr' as any,
    createdAt: new Date(qr.created_at),
    kotPrinted: false,
    billPrinted: true,
    isDirectBill: true,
    storeId: qr.store_id,
  });

  // Fetch orders from DB (including QR orders)
  const fetchOrdersFromDB = useCallback(async () => {
    if (!effectiveStoreId && !isOwner) {
      setDbOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      if (isStoreLogin) {
        // Use edge function for store login (no auth session)
        const { data, error } = await supabase.functions.invoke('sync-orders', {
          body: {
            action: 'fetch',
            store_id: effectiveStoreId,
            store_code: getStoreCodeFromStorage(),
          }
        });

        if (error || data?.error) {
          console.error('[useAnalytics] Edge function fetch error:', error || data?.error);
          setDbOrders(posContext?.orders || []);
          return;
        }

        const orders = (data?.orders || []).map(dbToLocalOrder);
        const localOrders = posContext?.orders || [];
        const localOrdersMap = new Map(localOrders.map(o => [o.id, o]));
        const localOrdersByBill = new Map(
          localOrders
            .filter(o => o.billNumber)
            .map(o => [o.billNumber, o])
        );

        orders.forEach(o => {
          const local = localOrdersMap.get(o.id) || (o.billNumber ? localOrdersByBill.get(o.billNumber) : undefined);
          if (local && local.paymentBreakdown && !o.paymentBreakdown) {
            o.paymentBreakdown = local.paymentBreakdown;
          }
        });
        setDbOrders(orders);
      } else {
        // Fetch main orders and completed QR orders in parallel
        let ordersQuery = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5000);
        let qrQuery = supabase.from('qr_orders').select('*').in('status', ['completed', 'ready', 'accepted', 'preparing']).order('created_at', { ascending: false }).limit(5000);
        
        if (effectiveStoreId) {
          ordersQuery = ordersQuery.eq('store_id', effectiveStoreId);
          qrQuery = qrQuery.eq('store_id', effectiveStoreId);
        }

        const [ordersRes, qrRes] = await Promise.all([
          ordersQuery,
          qrQuery,
        ]);

        if (ordersRes.error) {
          console.error('[useAnalytics] DB fetch error:', ordersRes.error);
          setDbOrders(posContext?.orders || []);
          return;
        }

        const mainOrders = (ordersRes.data || []).map(dbToLocalOrder);

        const localOrders = posContext?.orders || [];
        const localOrdersMap = new Map(localOrders.map(o => [o.id, o]));
        const localOrdersByBill = new Map(
          localOrders
            .filter(o => o.billNumber)
            .map(o => [o.billNumber, o])
        );

        mainOrders.forEach(o => {
          const local = localOrdersMap.get(o.id) || (o.billNumber ? localOrdersByBill.get(o.billNumber) : undefined);
          if (local && local.paymentBreakdown && !o.paymentBreakdown) {
            o.paymentBreakdown = local.paymentBreakdown;
          }
        });

        // Merge QR orders that haven't been synced to main orders table yet
        const existingBillNumbers = new Set(mainOrders.map(o => o.billNumber));
        const unSyncedQrOrders = (qrRes.data || [])
          .filter((qr: any) => !existingBillNumbers.has(`QR-${qr.order_number}`))
          .map(qrToLocalOrder);

        console.log(`[useAnalytics] Main orders: ${mainOrders.length}, Unsynced QR orders: ${unSyncedQrOrders.length}`);
        setDbOrders([...mainOrders, ...unSyncedQrOrders]);
      }
    } catch (err) {
      console.error('[useAnalytics] Fetch failed:', err);
      setDbOrders(posContext?.orders || []);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveStoreId, isStoreLogin]);

  // Fetch on mount and when store changes
  useEffect(() => {
    fetchOrdersFromDB();

    // Refresh every 60 seconds as fallback
    const interval = setInterval(fetchOrdersFromDB, 60000);
    return () => clearInterval(interval);
  }, [fetchOrdersFromDB]);

  // Supabase Realtime subscription for instant cross-device sync
  useEffect(() => {
    if (!effectiveStoreId) return;

    const channel = supabase
      .channel(`orders-realtime-${effectiveStoreId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${effectiveStoreId}`,
        },
        (payload) => {
          console.log('[useAnalytics] Realtime order update:', payload.eventType);
          fetchOrdersFromDB();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_orders',
          filter: `store_id=eq.${effectiveStoreId}`,
        },
        (payload) => {
          console.log('[useAnalytics] Realtime QR order update:', payload.eventType);
          fetchOrdersFromDB();
        }
      )
      .subscribe((status) => {
        console.log('[useAnalytics] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveStoreId, fetchOrdersFromDB]);

  // Merge DB orders and local orders to ensure unsynced local data is visible
  const orders = useMemo(() => {
    return safeMerge(posContext?.orders || [], dbOrders);
  }, [dbOrders, posContext?.orders]);

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(o => o.billPrinted || o.status === 'completed');

    if (timeRange === 'all') return filtered;

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'custom':
        if (customDateRange?.from) {
          startDate = startOfDay(customDateRange.from);
          // If 'to' is provided, we filter between 'from' and 'to'
          if (customDateRange.to) {
            const endDate = new Date(customDateRange.to);
            endDate.setHours(23, 59, 59, 999);
            return filtered.filter(order => {
              const orderDate = new Date(order.createdAt);
              return isAfter(orderDate, startDate) && orderDate <= endDate;
            });
          }
        } else {
          startDate = startOfDay(now);
        }
        break;
      default:
        startDate = startOfDay(now);
    }

    return filtered.filter(order =>
      isAfter(new Date(order.createdAt), startDate)
    );
  }, [orders, timeRange, customDateRange]);

  // All orders for status counts (not just billed)
  const allActiveOrders = useMemo(() => {
    const now = new Date();
    const startDate = startOfDay(now);
    return orders.filter(order =>
      !order.isDirectBill && isAfter(new Date(order.createdAt), startDate)
    );
  }, [orders]);

  const filteredCancelledOrders = useMemo(() => {
    let filtered = orders.filter(o => o.status === 'cancelled');

    if (timeRange === 'all') return filtered;

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'custom':
        if (customDateRange?.from) {
          startDate = startOfDay(customDateRange.from);
          // If 'to' is provided, we filter between 'from' and 'to'
          if (customDateRange.to) {
            const endDate = new Date(customDateRange.to);
            endDate.setHours(23, 59, 59, 999);
            return filtered.filter(order => {
              const orderDate = new Date(order.createdAt);
              return isAfter(orderDate, startDate) && orderDate <= endDate;
            });
          }
        } else {
          startDate = startOfDay(now);
        }
        break;
      default:
        startDate = startOfDay(now);
    }

    return filtered.filter(order =>
      isAfter(new Date(order.createdAt), startDate)
    );
  }, [orders, timeRange, customDateRange]);

  // Core Summary
  const summary: AnalyticsSummary = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o =>
      new Date(o.createdAt).toDateString() === today && (o.billPrinted || o.status === 'completed')
    );

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

    const weekStart = startOfWeek(new Date());
    const monthStart = startOfMonth(new Date());
    const weekOrders = orders.filter(o => (o.billPrinted || o.status === 'completed') && isAfter(new Date(o.createdAt), weekStart));
    const monthOrders = orders.filter(o => (o.billPrinted || o.status === 'completed') && isAfter(new Date(o.createdAt), monthStart));

    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let upiSalesTotal = 0;
    let dueSalesTotal = 0;
    let qrSalesTotal = 0;
    let splitSalesTotal = 0;

    filteredOrders.forEach(o => {
      const method = (o.paymentMethod || '').toLowerCase();
      let cashAmt = 0;
      let cardAmt = 0;
      let upiAmt = 0;
      let creditAmt = 0;
      let qrAmt = 0;

      if (method === 'part') {
        const breakdown = getPaymentBreakdownSummary(o);
        cashAmt = breakdown.amounts.cash;
        cardAmt = breakdown.amounts.card;
        upiAmt = breakdown.amounts.upi;
        creditAmt = breakdown.amounts.credit;
      } else if (method === 'access') {
        const breakdown = getPaymentBreakdownSummary(o);
        const subTotal = breakdown.amounts.cash + breakdown.amounts.card + breakdown.amounts.upi + breakdown.amounts.credit;
        if (subTotal > 0) {
          cashAmt = breakdown.amounts.cash;
          cardAmt = breakdown.amounts.card;
          upiAmt = breakdown.amounts.upi;
          creditAmt = breakdown.amounts.credit;
        } else {
          cashAmt = o.total;
        }
      } else if (method === 'cash') {
        cashAmt = o.total;
      } else if (method === 'card') {
        cardAmt = o.total;
      } else if (method === 'upi') {
        upiAmt = o.total;
      } else if (method === 'due' || method === 'credit') {
        creditAmt = o.total;
      } else if (method === 'qr') {
        qrAmt = o.total;
      } else if (method === 'split') {
        // Handled below separately
      }

      console.log('REPORT DEBUG', {
        bill: o.total,
        paymentMethod: o.paymentMethod || (o as any).payment_method,
        breakdown: getPaymentBreakdownSummary(o),
        cashAdded: cashAmt,
        cardAdded: cardAmt,
        upiAdded: upiAmt,
        creditAdded: creditAmt,
        qrAdded: qrAmt
      });

      cashSalesTotal += (cashAmt ?? 0);
      cardSalesTotal += (cardAmt ?? 0);
      upiSalesTotal += (upiAmt ?? 0);
      dueSalesTotal += (creditAmt ?? 0);
      qrSalesTotal += (qrAmt ?? 0);
      
      if (method === 'split') {
        splitSalesTotal += o.total;
      }
    });

    return {
      totalOrders: filteredOrders.length,
      todayOrders: todayOrders.length,
      pendingOrders: allActiveOrders.filter(o => o.status === 'pending').length,
      preparingOrders: allActiveOrders.filter(o => o.status === 'preparing').length,
      readyOrders: allActiveOrders.filter(o => o.status === 'ready').length,
      completedOrders: allActiveOrders.filter(o => o.status === 'completed').length,
      cancelledOrders: allActiveOrders.filter(o => o.status === 'cancelled').length,
      totalSales,
      todaySales,
      weekSales: weekOrders.reduce((sum, o) => sum + o.total, 0),
      monthSales: monthOrders.reduce((sum, o) => sum + o.total, 0),
      avgOrderValue: filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0,
      totalTables: tables.length,
      activeTables: tables.filter(t => t.status === 'occupied').length,
      availableTables: tables.filter(t => t.status === 'available').length,
      reservedTables: tables.filter(t => t.status === 'reserved').length,
      dineInOrders: filteredOrders.filter(o => o.orderType === 'dine-in').length,
      takeawayOrders: filteredOrders.filter(o => o.orderType === 'takeaway').length,
      deliveryOrders: filteredOrders.filter(o => o.orderType === 'delivery').length,
      onlineOrders: filteredOrders.filter(o => o.orderType === 'online').length,
      cashSales: cashSalesTotal,
      cardSales: cardSalesTotal,
      upiSales: upiSalesTotal,
      splitSales: splitSalesTotal,
      dueSales: dueSalesTotal,
      qrSales: qrSalesTotal,
      kotCount: orders.filter(o => o.kotPrinted && new Date(o.createdAt).toDateString() === today).length,
      billCount: todayOrders.length,
      heldBillsCount: heldBills.length,
    };
  }, [filteredOrders, allActiveOrders, orders, tables, heldBills]);

  // Category Summary
  const categorySummary: CategorySummary[] = useMemo(() => {
    const categoryMap = new Map<string, { itemCount: number; totalQty: number; totalAmount: number }>();

    filteredOrders.forEach(order => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item: any) => {
        const category = item.category || 'Uncategorized';
        const existing = categoryMap.get(category) || { itemCount: 0, totalQty: 0, totalAmount: 0 };
        categoryMap.set(category, {
          itemCount: existing.itemCount + 1,
          totalQty: existing.totalQty + (item.quantity || 1),
          totalAmount: existing.totalAmount + ((item.price || 0) * (item.quantity || 1))
        });
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((s, c) => s + c.totalAmount, 0);

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      itemCount: data.itemCount,
      totalQty: data.totalQty,
      totalAmount: data.totalAmount,
      percentage: totalAmount > 0 ? Math.round((data.totalAmount / totalAmount) * 100) : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredOrders]);

  // Item Summary
  const itemSummary: ItemSummary[] = useMemo(() => {
    const itemMap = new Map<string, { name: string; category: string; qty: number; amount: number }>();

    filteredOrders.forEach(order => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item: any) => {
        const key = item.id || item.name;
        const existing = itemMap.get(key);
        if (existing) {
          existing.qty += (item.quantity || 1);
          existing.amount += (item.price || 0) * (item.quantity || 1);
        } else {
          itemMap.set(key, {
            name: item.name || 'Unknown',
            category: item.category || 'Uncategorized',
            qty: item.quantity || 1,
            amount: (item.price || 0) * (item.quantity || 1)
          });
        }
      });
    });

    return Array.from(itemMap.entries())
      .map(([id, data]) => ({
        id,
        ...data,
        avgPrice: data.qty > 0 ? Math.round(data.amount / data.qty) : 0
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredOrders]);

  // Order Type Summary
  const orderTypeSummary: OrderTypeSummary[] = useMemo(() => {
    const types = ['dine-in', 'takeaway', 'delivery', 'online', 'qr'];
    const total = filteredOrders.length;

    return types.map(type => {
      const typeOrders = filteredOrders.filter(o => o.orderType === type);
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
        count: typeOrders.length,
        amount: typeOrders.reduce((s, o) => s + o.total, 0),
        percentage: total > 0 ? Math.round((typeOrders.length / total) * 100) : 0
      };
    }).filter(t => t.count > 0);
  }, [filteredOrders]);

  // Credit ledger aggregates (Outstanding / Collected) for this store + time range
  // Credit payments state (Outstanding / Collected) for this store + time range
  const [creditPaymentsAgg, setCreditPaymentsAgg] = useState<{ collected: number; count: number; payments: any[] }>({
    collected: 0,
    count: 0,
    payments: []
  });

  const [totalCreditLedger, setTotalCreditLedger] = useState<{ outstanding: number }>({ outstanding: 0 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!effectiveStoreId) {
        setCreditPaymentsAgg({ collected: 0, count: 0, payments: [] });
        return;
      }
      try {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        if (timeRange === 'today') startDate = startOfDay(now);
        else if (timeRange === 'week') startDate = startOfWeek(now);
        else if (timeRange === 'month') startDate = startOfMonth(now);
        else if (timeRange === 'custom' && customDateRange?.from) {
          startDate = startOfDay(customDateRange.from);
          if (customDateRange.to) {
            endDate = new Date(customDateRange.to);
            endDate.setHours(23, 59, 59, 999);
          }
        }

        const allPayments = cloudCreditPayments || getCreditPayments();
        const storePayments = allPayments.filter(p => !effectiveStoreId || p.store_id === effectiveStoreId);
        
        let collected = 0;
        let count = 0;
        const paymentsList: any[] = [];
        
        storePayments.forEach((row: any) => {
          const rowDate = new Date(row.created_at || row.createdAt);
          const passesStart = !startDate || isAfter(rowDate, startDate) || rowDate.getTime() === startDate.getTime();
          const passesEnd = !endDate || rowDate <= endDate;
          
          if (passesStart && passesEnd) {
            collected += Number(row.amount || 0);
            count += 1;
            paymentsList.push(row);
          }
        });
        setCreditPaymentsAgg({ collected, count, payments: paymentsList });

        // Fetch Total Outstanding regardless of timeRange
        let totalOut = 0;
        const allLedger = cloudCreditLedger || getCreditLedger();
        const storeLedger = allLedger.filter(l => !effectiveStoreId || l.store_id === effectiveStoreId);
        storeLedger.forEach((row: any) => {
          totalOut += Number(row.due_amount || 0);
        });
        
        setTotalCreditLedger({ outstanding: totalOut });
      } catch (e) {
        // ignore - credit payments optional
      }
    };
    load();
    return () => { cancelled = true; };
  }, [effectiveStoreId, timeRange, orders.length, customDateRange, cloudCreditLedger, cloudCreditPayments]);

  // Payment Summary — Credit replaces Due; adds Credit Outstanding / Credit Collected
  const paymentSummary: PaymentSummary[] = useMemo(() => {
    const total = summary.totalSales;
    
    // Initialize payment aggregates for each method
    const paymentTotals: Record<string, { amount: number; count: number }> = {
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      upi: { amount: 0, count: 0 },
      credit: { amount: 0, count: 0 },
      qr: { amount: 0, count: 0 },
      access: { amount: 0, count: 0 },
    };

    // Process each order
    filteredOrders.forEach(order => {
      const method = (order.paymentMethod || '').toLowerCase().trim();
      if (method === 'qr') {
        paymentTotals.qr.amount += order.total;
        paymentTotals.qr.count += 1;
      } else if (method === 'access') {
        // Access payment: total goes to its own bucket AND to the chosen sub-method
        paymentTotals.access.amount += order.total;
        paymentTotals.access.count += 1;
        const breakdown = getPaymentBreakdownSummary(order);
        const subTotal = breakdown.amounts.cash + breakdown.amounts.card + breakdown.amounts.upi + breakdown.amounts.credit;
        if (subTotal > 0) {
          paymentTotals.cash.amount += breakdown.amounts.cash;
          paymentTotals.card.amount += breakdown.amounts.card;
          paymentTotals.upi.amount += breakdown.amounts.upi;
          paymentTotals.credit.amount += breakdown.amounts.credit;
          paymentTotals.cash.count += breakdown.counts.cash;
          paymentTotals.card.count += breakdown.counts.card;
          paymentTotals.upi.count += breakdown.counts.upi;
          paymentTotals.credit.count += breakdown.counts.credit;
        } else {
          // Fallback: no breakdown stored → put into cash
          paymentTotals.cash.amount += order.total;
          paymentTotals.cash.count += 1;
        }
      } else {
        const breakdown = getPaymentBreakdownSummary(order);
        paymentTotals.cash.amount += breakdown.amounts.cash;
        paymentTotals.card.amount += breakdown.amounts.card;
        paymentTotals.upi.amount += breakdown.amounts.upi;
        paymentTotals.credit.amount += breakdown.amounts.credit;
        paymentTotals.cash.count += breakdown.counts.cash;
        paymentTotals.card.count += breakdown.counts.card;
        paymentTotals.upi.count += breakdown.counts.upi;
        paymentTotals.credit.count += breakdown.counts.credit;
      }
    });

    // Add collected credit payments to Cash, Card, UPI and Credit Collected
    let totalCreditCollected = 0;
    let creditCollectedCount = 0;

    creditPaymentsAgg.payments.forEach(payment => {
      const payAmount = Number(payment.amount || 0);
      const payMethod = (payment.payment_method || '').toLowerCase();
      if (payAmount > 0) {
        totalCreditCollected += payAmount;
        creditCollectedCount += 1;

        if (payMethod === 'cash' || payMethod === 'card' || payMethod === 'upi') {
          paymentTotals[payMethod].amount += payAmount;
          paymentTotals[payMethod].count += 1;
        }
      }
    });

    // Credit Outstanding = Total Credit Amount - Total Credit Collected
    const creditOutstanding = Math.max(0, paymentTotals.credit.amount - totalCreditCollected);

    // Build rows in the correct order: Cash, Card, UPI, QR Order, Credit, Credit Outstanding, Credit Collected, Discount, GST
    const rows: PaymentSummary[] = [];

    // Cash
    rows.push({
      method: 'Cash',
      count: paymentTotals.cash.count,
      amount: paymentTotals.cash.amount,
      percentage: total > 0 ? Math.round((paymentTotals.cash.amount / total) * 100) : 0,
    });

    // Card
    rows.push({
      method: 'Card',
      count: paymentTotals.card.count,
      amount: paymentTotals.card.amount,
      percentage: total > 0 ? Math.round((paymentTotals.card.amount / total) * 100) : 0,
    });

    // UPI
    rows.push({
      method: 'UPI',
      count: paymentTotals.upi.count,
      amount: paymentTotals.upi.amount,
      percentage: total > 0 ? Math.round((paymentTotals.upi.amount / total) * 100) : 0,
    });

    // QR Order
    rows.push({
      method: 'QR Order',
      count: paymentTotals.qr.count,
      amount: paymentTotals.qr.amount,
      percentage: total > 0 ? Math.round((paymentTotals.qr.amount / total) * 100) : 0,
    });

    // Access Payment
    rows.push({
      method: 'Access Payment',
      count: paymentTotals.access.count,
      amount: paymentTotals.access.amount,
      percentage: total > 0 ? Math.round((paymentTotals.access.amount / total) * 100) : 0,
    });

    // Credit
    rows.push({
      method: 'Credit',
      count: paymentTotals.credit.count,
      amount: paymentTotals.credit.amount,
      percentage: total > 0 ? Math.round((paymentTotals.credit.amount / total) * 100) : 0,
    });

    // Credit Outstanding
    rows.push({
      method: 'Credit Outstanding',
      count: 0, // Not applicable
      amount: totalCreditLedger.outstanding,
      percentage: total > 0 ? Math.round((totalCreditLedger.outstanding / total) * 100) : 0,
    });

    // Credit Collected
    rows.push({
      method: 'Credit Collected',
      count: creditCollectedCount,
      amount: totalCreditCollected,
      percentage: total > 0 ? Math.round((totalCreditCollected / total) * 100) : 0,
    });

    // Discount total
    const totalDiscount = filteredOrders.reduce((s, o) => s + (Number(o.discount) || 0), 0);
    const discountCount = filteredOrders.filter(o => (Number(o.discount) || 0) > 0).length;
    rows.push({
      method: 'Discount',
      count: discountCount,
      amount: totalDiscount,
      percentage: total > 0 ? Math.round((totalDiscount / total) * 100) : 0,
    });

    // GST / Tax total
    // GST / Tax total
    const totalTax = filteredOrders.reduce((s, o) => s + (Number(o.tax) || 0), 0);
    const taxCount = filteredOrders.filter(o => (Number(o.tax) || 0) > 0).length;
    rows.push({
      method: 'GST',
      count: taxCount,
      amount: totalTax,
      percentage: total > 0 ? Math.round((totalTax / total) * 100) : 0,
    });

    // Cancelled Orders
    const cancelledAmount = filteredCancelledOrders.reduce((sum, o) => sum + o.total, 0);
    rows.push({
      method: 'Cancelled Order',
      count: filteredCancelledOrders.length,
      amount: cancelledAmount,
      percentage: total > 0 ? Math.round((cancelledAmount / total) * 100) : 0,
    });

    return rows;
  }, [summary, filteredOrders, creditPaymentsAgg, filteredCancelledOrders]);

  // Hourly Sales (for today)
  const hourlySales: HourlySales[] = useMemo(() => {
    const hours: HourlySales[] = [];
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o =>
      new Date(o.createdAt).toDateString() === today && (o.billPrinted || o.status === 'completed')
    );

    for (let i = 0; i < 24; i++) {
      const hourOrders = todayOrders.filter(o =>
        new Date(o.createdAt).getHours() === i
      );
      hours.push({
        hour: `${i.toString().padStart(2, '0')}:00`,
        orders: hourOrders.length,
        amount: hourOrders.reduce((s, o) => s + o.total, 0)
      });
    }

    return hours;
  }, [orders]);

  // Top Selling Items
  const topSellingItems = useMemo(() => {
    return itemSummary.slice(0, 10);
  }, [itemSummary]);

  // Counter Summary (by store)
  const counterSummary: CounterSummary[] = useMemo(() => {
    if (stores.length === 0) {
      return [{
        counter: 'Default Counter',
        orders: filteredOrders.length,
        amount: summary.totalSales
      }];
    }

    return stores.map(store => {
      const storeOrders = filteredOrders.filter(o => o.storeId === store.id);
      return {
        counter: store.name,
        orders: storeOrders.length,
        amount: storeOrders.reduce((s, o) => s + o.total, 0)
      };
    });
  }, [filteredOrders, stores, summary.totalSales]);

  // Cover Size Summary (party size based on table capacity)
  const coverSizeSummary = useMemo(() => {
    const coverMap = new Map<number, { count: number; amount: number }>();

    filteredOrders
      .filter(o => o.orderType === 'dine-in' && o.tableNumber)
      .forEach(order => {
        const table = tables.find(t => t.number === order.tableNumber);
        const capacity = table?.capacity || 2;
        const existing = coverMap.get(capacity) || { count: 0, amount: 0 };
        coverMap.set(capacity, {
          count: existing.count + 1,
          amount: existing.amount + order.total
        });
      });

    return Array.from(coverMap.entries())
      .map(([size, data]) => ({
        coverSize: size,
        orders: data.count,
        amount: data.amount,
        avgPerCover: data.count > 0 ? Math.round(data.amount / (data.count * size)) : 0
      }))
      .sort((a, b) => a.coverSize - b.coverSize);
  }, [filteredOrders, tables]);

  // Tip Summary
  const tipSummary = useMemo(() => {
    const ordersWithTips = filteredOrders.filter(o => {
      const tipVal = (o as any).tip;
      return tipVal && tipVal > 0;
    });
    const totalTips = ordersWithTips.reduce((s, o) => s + ((o as any).tip || 0), 0);
    return {
      totalTips,
      tipCount: ordersWithTips.length,
      avgTip: ordersWithTips.length > 0 ? Math.round(totalTips / ordersWithTips.length) : 0,
      tipPercentage: summary.totalSales > 0 ? Math.round((totalTips / summary.totalSales) * 100) : 0
    };
  }, [filteredOrders, summary.totalSales]);

  // Discount Summary
  const discountSummary = useMemo(() => {
    const ordersWithDiscount = filteredOrders.filter(o => o.discount > 0);
    const totalDiscount = ordersWithDiscount.reduce((s, o) => s + o.discount, 0);

    return {
      totalDiscount,
      discountCount: ordersWithDiscount.length,
      avgDiscount: ordersWithDiscount.length > 0 ? Math.round(totalDiscount / ordersWithDiscount.length) : 0
    };
  }, [filteredOrders]);

  return {
    summary,
    categorySummary,
    itemSummary,
    orderTypeSummary,
    paymentSummary,
    hourlySales,
    topSellingItems,
    counterSummary,
    coverSizeSummary,
    tipSummary,
    discountSummary,
    filteredOrders,
    isLoading,
    refreshData: fetchOrdersFromDB,
  };
};

