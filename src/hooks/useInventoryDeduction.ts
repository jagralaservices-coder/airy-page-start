import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  category?: string;
}

/**
 * Hook to auto-deduct inventory when orders are completed.
 * Links menu items to inventory via `menu_item_ingredients` table.
 * Shows low stock alerts when items fall below min_stock.
 */
export const useInventoryDeduction = () => {
  const { canAccess } = useSubscription();
  const hasRecipeDeduction = canAccess('recipeInventory');
  
  /**
   * Deduct inventory for a completed order's items
   */
  const deductInventoryForOrder = useCallback(async (
    storeId: string,
    items: OrderItem[]
  ): Promise<{ success: boolean; lowStockItems: string[] }> => {
    const lowStockItems: string[] = [];

    // Basic plan: no auto-deduction on sale
    if (!hasRecipeDeduction) {
      return { success: true, lowStockItems: [] };
    }
    
    try {
      for (const item of items) {
        // Find linked ingredients for this menu item
        const { data: ingredients, error: ingError } = await supabase
          .from('menu_item_ingredients')
          .select('inventory_item_id, quantity_required, unit')
          .eq('menu_item_id', item.id);

        if (ingError || !ingredients || ingredients.length === 0) continue;

        for (const ingredient of ingredients) {
          const totalDeduction = ingredient.quantity_required * item.quantity;

          // Get current stock
          const { data: invItem, error: invError } = await supabase
            .from('inventory_items')
            .select('id, name, quantity, min_stock, unit')
            .eq('id', ingredient.inventory_item_id)
            .eq('store_id', storeId)
            .maybeSingle();

          if (invError || !invItem) continue;

          const newQuantity = Number(invItem.quantity) - totalDeduction;

          // Update stock
          await supabase
            .from('inventory_items')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', invItem.id)
            .eq('store_id', storeId);

          // Check low stock
          if (newQuantity <= Number(invItem.min_stock)) {
            lowStockItems.push(invItem.name);
          }
        }
      }

      // Show low stock alerts
      if (lowStockItems.length > 0) {
        toast.warning(
          `Low Stock Alert: ${lowStockItems.slice(0, 3).join(', ')}${lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}`,
          { duration: 6000 }
        );
      }

      return { success: true, lowStockItems };
    } catch (err) {
      console.error('[InventoryDeduction] Error:', err);
      return { success: false, lowStockItems: [] };
    }
  }, []);

  /**
   * Check all inventory items for low stock
   */
  const checkLowStock = useCallback(async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, min_stock, unit')
        .eq('store_id', storeId);

      if (error || !data) return [];

      return data.filter(item => Number(item.quantity) <= Number(item.min_stock))
        .map(item => ({
          id: item.id,
          name: item.name,
          currentStock: Number(item.quantity),
          minStock: Number(item.min_stock),
          unit: item.unit,
        }));
    } catch {
      return [];
    }
  }, []);

  /**
   * Get reorder suggestions based on usage patterns
   */
  const getReorderSuggestions = useCallback(async (storeId: string) => {
    try {
      const lowItems = await checkLowStock(storeId);
      return lowItems.map(item => ({
        ...item,
        suggestedQuantity: Math.max(item.minStock * 2 - item.currentStock, item.minStock),
      }));
    } catch {
      return [];
    }
  }, [checkLowStock]);

  return {
    deductInventoryForOrder,
    checkLowStock,
    getReorderSuggestions,
  };
};
