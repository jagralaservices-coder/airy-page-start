import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentStoreId, getCurrentStoreCode } from './useCloudData';
import { Order, MenuItem, InventoryItem } from '@/lib/store';
import { toUUID } from './useOrderSync'; // Assuming we keep toUUID or move it to a util file

// Generic edge function call for mutations
export const mutateCloudData = async (action: 'save' | 'delete' | 'update', dataType: string, payload: any) => {
  if (localStorage.getItem('pos_login_as_demo') === 'true') return null;
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error('No active store ID');

  const body: any = { action, store_id: storeId, data_type: dataType, ...payload };
  const storeCode = getCurrentStoreCode();
  if (storeCode) body.store_code = storeCode;

  const { data, error } = await supabase.functions.invoke('sync-store-data', { body });
  
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  
  return data;
};

export const useSaveOrderMutation = () => {
  const queryClient = useQueryClient();
  const storeId = getCurrentStoreId();

  return useMutation({
    mutationFn: async (orders: Order[]) => {
      // In fully cloud-based, we use sync-orders edge function or direct insert
      const storeCode = getCurrentStoreCode();
      const functionOrders = orders.map((order: any) => ({
        ...order,
        store_id: storeId,
        paymentDetails: order.paymentBreakdown || order.payment_breakdown 
          ? { breakdown: order.paymentBreakdown || order.payment_breakdown } 
          : (order.paymentDetails || order.payment_details || null),
      }));

      const { data, error } = await supabase.functions.invoke('sync-orders', {
        body: { action: 'save', store_id: storeId, store_code: storeCode, orders: functionOrders }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudData', storeId, 'orders'] });
    },
  });
};

export const useUpdateOrderMutation = () => {
  const queryClient = useQueryClient();
  const storeId = getCurrentStoreId();

  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string, updates: any }) => {
      // For updates, we can either re-save the whole order or just update status via direct supabase call (if admin)
      // For now, let's use the edge function save with just the updated order
      // Assuming POSContext will provide the full order object.
      // Wait, direct edge function for update? The sync-orders edge function only has 'save' and 'fetch'.
      // If we just upsert the whole order via saveOrderMutation, it handles updates.
      throw new Error('Not implemented: use useSaveOrderMutation instead');
    },
  });
};

// Generic mutation for store data (inventory, expenses, held_bills, categories, pos_customers)
export const useSaveCloudDataMutation = (dataType: string) => {
  const queryClient = useQueryClient();
  const storeId = getCurrentStoreId();

  return useMutation({
    mutationFn: async (items: any[]) => {
      return mutateCloudData('save', dataType, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudData', storeId, dataType] });
    },
  });
};

export const useUpdateCloudDataMutation = (dataType: string) => {
  const queryClient = useQueryClient();
  const storeId = getCurrentStoreId();

  return useMutation({
    mutationFn: async (payload: { item_id: string, updates: any, ingredients?: any[], variations?: any[] }) => {
      return mutateCloudData('update', dataType, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudData', storeId, dataType] });
    },
  });
};

export const useDeleteCloudDataMutation = (dataType: string) => {
  const queryClient = useQueryClient();
  const storeId = getCurrentStoreId();

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      return mutateCloudData('delete', dataType, { item_ids: itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudData', storeId, dataType] });
    },
  });
};
