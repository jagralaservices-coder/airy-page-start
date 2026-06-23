// Hook to force-download all store data on first login per device
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  setOrders, setInventory, setExpenses, setHeldBills, setTables,
  getOrders, getInventory, getExpenses, getHeldBills, getTables,
  Order, InventoryItem, Expense, HeldBill, Table, safeMerge
} from '@/lib/store';
import { toast } from 'sonner';

const INIT_KEY_PREFIX = 'pos_initialized_';

export const useStoreInitializer = () => {
  const initInProgress = useRef(false);

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

  /**
   * Full cloud download for a store. Called on first login per device/store combo.
   * Downloads: orders (last 30 days), inventory, expenses, held_bills, tables, settings
   */
  const fullCloudDownload = useCallback(async (
    storeId: string, 
    isStoreLogin: boolean,
    callbacks: {
      onOrders: (orders: Order[]) => void;
      onInventory: (items: InventoryItem[]) => void;
      onExpenses: (expenses: Expense[]) => void;
      onHeldBills: (bills: HeldBill[]) => void;
      onTables: (tables: Table[]) => void;
    }
  ): Promise<boolean> => {
    console.log('[StoreInit] Starting full cloud download for store:', storeId);

    // Validate store exists in Supabase
    try {
      const storeCode = getStoreCode();
      if (isStoreLogin) {
        const { data: storeDetails, error } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'fetch', store_id: storeId, data_type: 'store_details', store_code: storeCode }
        });
        if (error || !storeDetails?.success || !storeDetails?.store) {
          console.warn('[StoreInit] Store validation via edge function returned an error (perhaps not deployed yet). Continuing sync anyway.');
        }
      } else {
        const { data: store, error } = await supabase
          .from('stores')
          .select('id')
          .eq('id', storeId)
          .eq('is_active', true)
          .maybeSingle();
        if (error || !store) {
          console.error('[StoreInit] Store validation failed in direct DB:', error);
          return false;
        }
      }
    } catch (e) {
      console.warn('[StoreInit] Store existence validation failed (network error or offline):', e);
      if (!navigator.onLine) {
        console.log('[StoreInit] Offline: bypassing store existence check');
      } else {
        return false;
      }
    }

    // Verify if store has data. If it has 0 menu items, run auto-population!
    try {
      let menuCount = 0;
      if (isStoreLogin) {
        const storeCode = getStoreCode();
        const { data: menuResult } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'fetch', store_id: storeId, data_type: 'menu_items', store_code: storeCode }
        });
        if (menuResult?.items) {
          menuCount = menuResult.items.length;
        }
      } else {
        const { count, error } = await supabase
          .from('menu_items')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId);
        if (!error && count !== null) {
          menuCount = count;
        }
      }

      if (menuCount === 0) {
        console.log('[StoreInit] Store has 0 menu items. Please configure your store or populate data from server.');
      }
    } catch (e) {
      console.warn('[StoreInit] Failed to check and auto-populate store data:', e);
    }

    try {
      if (isStoreLogin) {
        // Use edge function for store login
        const storeCode = getStoreCode();
        
        // Fetch orders
        const { data: ordersResult } = await supabase.functions.invoke('sync-orders', {
          body: { action: 'fetch', store_id: storeId, store_code: storeCode }
        });
        
        if (ordersResult?.orders) {
          const orders: Order[] = ordersResult.orders.map((o: any) => ({
            id: o.id,
            billNumber: o.bill_number,
            items: o.items || [],
            subtotal: Number(o.subtotal),
            tax: Number(o.tax),
            discount: Number(o.discount),
            total: Number(o.total),
            status: o.status,
            orderType: o.order_type,
            tableNumber: o.table_number ? Number(o.table_number) : undefined,
            customerName: o.customer_name || undefined,
            customerPhone: o.customer_phone || undefined,
            paymentMethod: o.payment_method,
            paymentBreakdown: typeof o.payment_breakdown === 'string' 
              ? JSON.parse(o.payment_breakdown) 
              : (o.payment_breakdown || (o.payment_details && typeof o.payment_details === 'object' && o.payment_details.breakdown) || undefined),
            createdAt: new Date(o.created_at),
            kotPrinted: false,
            billPrinted: o.status === 'completed',
            isDirectBill: true,
            storeId: o.store_id,
          }));
          const existingOrders = getOrders();
          const mergedOrders = safeMerge(existingOrders, orders);
          setOrders(mergedOrders);
          callbacks.onOrders(mergedOrders);
          console.log('[StoreInit] Merged and saved', mergedOrders.length, 'orders');
        }
        
        // Fetch inventory, expenses, held_bills via sync-store-data
        for (const dataType of ['inventory', 'expenses', 'held_bills', 'tables'] as const) {
          try {
            const { data } = await supabase.functions.invoke('sync-store-data', {
              body: { action: 'fetch', store_id: storeId, data_type: dataType, store_code: storeCode }
            });
            
            if (data?.items) {
              switch (dataType) {
                case 'inventory': {
                  const existing = getInventory();
                  const merged = safeMerge(existing, data.items);
                  setInventory(merged);
                  callbacks.onInventory(merged);
                  break;
                }
                case 'expenses': {
                  const existing = getExpenses();
                  const merged = safeMerge(existing, data.items);
                  setExpenses(merged);
                  callbacks.onExpenses(merged);
                  break;
                }
                case 'held_bills': {
                  const existing = getHeldBills();
                  const merged = safeMerge(existing, data.items);
                  setHeldBills(merged);
                  callbacks.onHeldBills(merged);
                  break;
                }
                case 'tables': {
                  const existing = getTables();
                  const merged = safeMerge(existing, data.items);
                  setTables(merged);
                  callbacks.onTables(merged);
                  break;
                }
              }
              console.log('[StoreInit] Merged and saved', dataType);
            }
          } catch (err) {
            console.warn('[StoreInit] Failed to download', dataType, ':', err);
          }
        }

        // Fetch menu items
        try {
          const { data: menuResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'menu_items', store_code: storeCode }
          });
          if (menuResult?.items) {
            const ingredients = menuResult.ingredients || [];
            const variations = menuResult.variations || [];
            const { getMenuItems, setMenuItems, safeMerge } = await import('@/lib/store');
            const parsed = menuResult.items.map((item: any) => ({
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
              sku: item.sku || undefined,
              barcode: item.barcode || undefined,
              ingredients: ingredients.filter((ing: any) => ing.menu_item_id === item.id).map((ing: any) => ({
                id: ing.id,
                inventoryItemId: ing.inventory_item_id,
                quantityRequired: Number(ing.quantity_required),
                unit: ing.unit,
              })),
              variations: variations.filter((v: any) => v.menu_item_id === item.id).map((v: any) => ({
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
            }));
            const merged = safeMerge(getMenuItems(), parsed);
            setMenuItems(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download menu items:', e);
        }

        // Fetch categories
        try {
          const { data: catResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'categories', store_code: storeCode }
          });
          if (catResult?.items) {
            const { getCategories, setCategories, safeMerge } = await import('@/lib/store');
            const parsed = catResult.items.map((cat: any) => ({
              id: cat.category_id || cat.id,
              name: cat.name,
              nameHindi: cat.name_hindi || undefined,
              icon: cat.icon || '📦',
              color: cat.color || 'cat-food',
            }));
            const merged = safeMerge(getCategories(), parsed);
            setCategories(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download categories:', e);
        }

        // Fetch customers
        try {
          const { data: custResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'pos_customers', store_code: storeCode }
          });
          if (custResult?.items) {
            const { getCustomers, setCustomers, safeMerge } = await import('@/lib/store');
            const parsed = custResult.items.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || '',
              city: c.city || '',
              state: c.state || '',
              pincode: c.pincode || '',
              createdAt: c.created_at,
            }));
            const merged = safeMerge(getCustomers(), parsed);
            setCustomers(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download customers:', e);
        }
      } else {
        // Direct DB access for owner/admin
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Fetch orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('store_id', storeId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });
        
        if (ordersData) {
          const orders: Order[] = ordersData.map((o: any) => ({
            id: o.id,
            billNumber: o.bill_number,
            items: o.items || [],
            subtotal: Number(o.subtotal),
            tax: Number(o.tax),
            discount: Number(o.discount),
            total: Number(o.total),
            status: o.status,
            orderType: o.order_type,
            tableNumber: o.table_number ? Number(o.table_number) : undefined,
            customerName: o.customer_name || undefined,
            customerPhone: o.customer_phone || undefined,
            paymentMethod: o.payment_method,
            paymentBreakdown: typeof o.payment_breakdown === 'string' 
              ? JSON.parse(o.payment_breakdown) 
              : (o.payment_breakdown || (o.payment_details && typeof o.payment_details === 'object' && o.payment_details.breakdown) || undefined),
            createdAt: new Date(o.created_at),
            kotPrinted: false,
            billPrinted: o.status === 'completed',
            isDirectBill: true,
            storeId: o.store_id,
          }));
          const existingOrders = getOrders();
          const mergedOrders = safeMerge(existingOrders, orders);
          setOrders(mergedOrders);
          callbacks.onOrders(mergedOrders);
          console.log('[StoreInit] Merged and saved', mergedOrders.length, 'orders via direct DB');
        }

        // Fetch inventory
        const { data: invData } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('store_id', storeId);
        if (invData) {
          const items = invData.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            minStock: Number(i.min_stock),
            costPerUnit: Number(i.cost_per_unit),
            costUnit: i.cost_unit || 'pcs',
            productionYield: i.production_yield ? Number(i.production_yield) : undefined,
            productionYieldUnit: i.production_yield_unit || undefined,
            lastUpdated: new Date(i.updated_at),
          }));
          const existing = getInventory();
          const merged = safeMerge(existing, items);
          setInventory(merged);
          callbacks.onInventory(merged);
        }

        // Fetch expenses
        const { data: expData } = await supabase
          .from('expenses')
          .select('*')
          .eq('store_id', storeId);
        if (expData) {
          const expenses = expData.map((e: any) => ({
            id: e.id,
            amount: Number(e.amount),
            category: e.category,
            description: e.description || '',
            date: new Date(e.date),
            paidBy: e.paid_by || '',
          }));
          const existing = getExpenses();
          const merged = safeMerge(existing, expenses);
          setExpenses(merged);
          callbacks.onExpenses(merged);
        }

        // Fetch held bills
        const { data: hbData } = await supabase
          .from('held_bills')
          .select('*')
          .eq('store_id', storeId);
        if (hbData) {
          const bills = hbData.map((b: any) => ({
            id: b.id,
            items: b.items || [],
            tableNumber: b.table_number,
            customerName: b.customer_name || undefined,
            heldAt: new Date(b.held_at),
          }));
          const existing = getHeldBills();
          const merged = safeMerge(existing, bills);
          setHeldBills(merged);
          callbacks.onHeldBills(merged);
        }

        // Fetch menu items directly
        try {
          const { data: dbItems } = await supabase
            .from('menu_items')
            .select('*')
            .eq('store_id', storeId);
          if (dbItems) {
            const menuItemIds = dbItems.map(i => i.id);
            let ingredients: any[] = [];
            let variations: any[] = [];
            if (menuItemIds.length > 0) {
              const { data: ings } = await supabase.from('menu_item_ingredients').select('*').in('menu_item_id', menuItemIds);
              ingredients = ings || [];
              const { data: vars } = await supabase.from('menu_item_variations').select('*').in('menu_item_id', menuItemIds);
              variations = vars || [];
            }
            const { getMenuItems, setMenuItems, safeMerge } = await import('@/lib/store');
            const parsed = dbItems.map((item: any) => ({
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
              sku: item.sku || undefined,
              barcode: item.barcode || undefined,
              ingredients: ingredients.filter((ing: any) => ing.menu_item_id === item.id).map((ing: any) => ({
                id: ing.id,
                inventoryItemId: ing.inventory_item_id,
                quantityRequired: Number(ing.quantity_required),
                unit: ing.unit,
              })),
              variations: variations.filter((v: any) => v.menu_item_id === item.id).map((v: any) => ({
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
            }));
            const merged = safeMerge(getMenuItems(), parsed);
            setMenuItems(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download menu items directly:', e);
        }

        // Fetch categories directly
        try {
          const { data: dbCats } = await supabase
            .from('store_categories')
            .select('*')
            .eq('store_id', storeId);
          if (dbCats) {
            const { getCategories, setCategories, safeMerge } = await import('@/lib/store');
            const parsed = dbCats.map((cat: any) => ({
              id: cat.category_id || cat.id,
              name: cat.name,
              nameHindi: cat.name_hindi || undefined,
              icon: cat.icon || '📦',
              color: cat.color || 'cat-food',
            }));
            const merged = safeMerge(getCategories(), parsed);
            setCategories(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download categories directly:', e);
        }

        // Fetch customers directly
        try {
          const { data: dbCusts } = await supabase
            .from('pos_customers')
            .select('*')
            .eq('store_id', storeId);
          if (dbCusts) {
            const { getCustomers, setCustomers, safeMerge } = await import('@/lib/store');
            const parsed = dbCusts.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || '',
              city: c.city || '',
              state: c.state || '',
              pincode: c.pincode || '',
              createdAt: c.created_at,
            }));
            const merged = safeMerge(getCustomers(), parsed);
            setCustomers(merged);
          }
        } catch (e) {
          console.warn('[StoreInit] Failed to download customers directly:', e);
        }
      }

      const storeCode = getStoreCode();

      // Fetch credit ledger (Edge Function for store login)
      try {
        let clData: any[] | null = null;
        if (isStoreLogin) {
          const { data: clResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'credit_ledger', store_code: storeCode }
          });
          clData = clResult?.items || [];
        } else {
          const { data: dbData } = await supabase
            .from('credit_ledger')
            .select('*')
            .eq('store_id', storeId);
          clData = dbData;
        }

        if (clData) {
          const parsed = clData.map((e: any) => ({
            id: e.id,
            store_id: e.store_id,
            customer_name: e.customer_name,
            customer_phone: e.customer_phone,
            bill_number: e.bill_number,
            total_amount: Number(e.total_amount),
            paid_amount: Number(e.paid_amount),
            due_amount: Number(e.due_amount),
            payment_status: e.payment_status,
            notes: e.notes,
            created_at: new Date(e.created_at),
            updated_at: e.updated_at,
          }));
          const { getCreditLedger, setCreditLedger, safeMerge } = await import('@/lib/store');
          const merged = safeMerge(getCreditLedger() as any, parsed as any) as any[];
          setCreditLedger(merged as any);
        }
      } catch (e) {
        console.warn('[StoreInit] Failed to download credit ledger:', e);
      }

      // Fetch credit payments (Edge Function for store login)
      try {
        let cpData: any[] | null = null;
        if (isStoreLogin) {
          const { data: cpResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'credit_payments', store_code: storeCode }
          });
          cpData = cpResult?.items || [];
        } else {
          const { data: dbData } = await supabase
            .from('credit_payments')
            .select('*')
            .eq('store_id', storeId);
          cpData = dbData;
        }

        if (cpData) {
          const parsed = cpData.map((p: any) => ({
            id: p.id,
            credit_id: p.credit_id,
            store_id: p.store_id,
            amount: Number(p.amount),
            payment_method: p.payment_method,
            received_by: p.received_by,
            notes: p.notes,
            created_at: new Date(p.created_at),
            updated_at: p.updated_at,
          }));
          const { getCreditPayments, setCreditPayments, safeMerge } = await import('@/lib/store');
          const merged = safeMerge(getCreditPayments() as any, parsed as any) as any[];
          setCreditPayments(merged as any);
        }
      } catch (e) {
        console.warn('[StoreInit] Failed to download credit payments:', e);
      }

      // Fetch WhatsApp Config (Edge Function for store login)
      try {
        let waConfig: any = null;
        if (isStoreLogin) {
          const { data: waResult } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'fetch', store_id: storeId, data_type: 'whatsapp_config', store_code: storeCode }
          });
          waConfig = waResult?.config;
        } else {
          const { data: dbData } = await supabase
            .from('store_whatsapp_config')
            .select('*')
            .eq('store_id', storeId)
            .maybeSingle();
          waConfig = dbData;
        }
        if (waConfig) {
          localStorage.setItem(`pos_whatsapp_config_${storeId}`, JSON.stringify(waConfig));
        }
      } catch (e) {
        console.warn('[StoreInit] Failed to download WhatsApp config:', e);
      }

      return true;
    } catch (err) {
      console.error('[StoreInit] Full cloud download failed:', err);
      return false;
    }
  }, [getStoreCode]);

  /**
   * Initialize store session - forces full download on first login per store
   */
  const initializeStoreSession = useCallback(async (
    storeId: string,
    isStoreLogin: boolean,
    callbacks: {
      onOrders: (orders: Order[]) => void;
      onInventory: (items: InventoryItem[]) => void;
      onExpenses: (expenses: Expense[]) => void;
      onHeldBills: (bills: HeldBill[]) => void;
      onTables: (tables: Table[]) => void;
    }
  ) => {
    if (initInProgress.current) return;
    initInProgress.current = true;

    console.log('[StoreInit] Initializing store session:', storeId);
    toast.info('Syncing store data from cloud...', { duration: 3000 });

    try {
      const success = await fullCloudDownload(storeId, isStoreLogin, callbacks);
      if (success) {
        const initKey = `${INIT_KEY_PREFIX}${storeId}`;
        localStorage.setItem(initKey, new Date().toISOString());
        toast.success('Store data synced successfully!');
      } else {
        toast.error('Some store data failed to sync. App remains functional.');
      }
    } finally {
      initInProgress.current = false;
    }
  }, [fullCloudDownload]);

  /**
   * Force re-sync (clear initialization flag and re-download)
   */
  const forceResync = useCallback(async (
    storeId: string,
    isStoreLogin: boolean,
    callbacks: {
      onOrders: (orders: Order[]) => void;
      onInventory: (items: InventoryItem[]) => void;
      onExpenses: (expenses: Expense[]) => void;
      onHeldBills: (bills: HeldBill[]) => void;
      onTables: (tables: Table[]) => void;
    }
  ) => {
    const initKey = `${INIT_KEY_PREFIX}${storeId}`;
    localStorage.removeItem(initKey);
    await initializeStoreSession(storeId, isStoreLogin, callbacks);
  }, [initializeStoreSession]);

  return {
    initializeStoreSession,
    forceResync,
  };
};
