// Auto-Production Utility - Automatically produce items from components when stock is insufficient

import { InventoryItem, getInventory, setInventory } from './store';
import { convertToBaseUnit, formatQuantityDisplay } from './inventoryUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductionResult {
  produced: boolean;
  itemName: string;
  quantityProduced: number;
  unit: string;
  componentsUsed: { name: string; quantity: number; unit: string }[];
  message: string;
}

interface ComponentInfo {
  childInventoryId: string;
  quantityRequired: number;
  unit: string;
}

/**
 * Check if an inventory item can be auto-produced from its components
 * Returns the maximum quantity that can be produced
 */
export const canAutoProduceItem = (
  inventoryItem: InventoryItem,
  inventory: InventoryItem[],
  componentsMap: Record<string, ComponentInfo[]>,
  requiredQuantity: number
): { canProduce: boolean; maxProducible: number; limitingFactor?: string } => {
  // Get components for this item
  const components = componentsMap[inventoryItem.id] || inventoryItem.components || [];
  
  if (components.length === 0) {
    return { canProduce: false, maxProducible: 0, limitingFactor: 'No recipe defined' };
  }

  let maxProducible = Infinity;
  let limitingFactor = '';

  for (const component of components) {
    const childItem = inventory.find(i => i.id === component.childInventoryId);
    if (!childItem) {
      return { canProduce: false, maxProducible: 0, limitingFactor: `Component ${component.childInventoryId} not found` };
    }

    // Convert component quantity to base unit
    const componentQtyNeeded = convertToBaseUnit(component.quantityRequired, component.unit);
    
    // Calculate how many times we can produce based on this component
    // childItem.quantity is already in base units
    const possibleBatches = childItem.quantity / componentQtyNeeded;
    
    if (possibleBatches < maxProducible) {
      maxProducible = possibleBatches;
      limitingFactor = childItem.name;
    }
  }

  // Convert to actual producible quantity (in base units)
  // Each batch produces 1 unit worth of the item based on recipe
  // We need to figure out how much 1 "batch" produces
  // For now, assume the recipe produces enough for the component ratios
  
  // Calculate the production unit size from the recipe
  // If recipe says: Oil 30g + Premix 500g = makes X amount of White Batter
  // We need a "yield" field. For now, let's assume the sum of components = yield
  const totalComponentsPerBatch = components.reduce((sum, c) => {
    return sum + convertToBaseUnit(c.quantityRequired, c.unit);
  }, 0);

  const maxQuantityProducible = maxProducible * totalComponentsPerBatch;
  const canProduce = maxQuantityProducible >= requiredQuantity;

  return { 
    canProduce, 
    maxProducible: maxQuantityProducible,
    limitingFactor: canProduce ? undefined : `${limitingFactor} (insufficient)`
  };
};

/**
 * Auto-produce an inventory item from its components
 * This will deduct components and add to the parent item's stock
 */
export const autoProduceFromComponents = async (
  inventoryItemId: string,
  requiredQuantity: number,
  inventory: InventoryItem[],
  componentsMap: Record<string, ComponentInfo[]>
): Promise<ProductionResult | null> => {
  const inventoryItem = inventory.find(i => i.id === inventoryItemId);
  if (!inventoryItem) {
    console.log('[AutoProduce] Item not found:', inventoryItemId);
    return null;
  }

  const components = componentsMap[inventoryItemId] || inventoryItem.components || [];
  
  if (components.length === 0) {
    console.log('[AutoProduce] No recipe for:', inventoryItem.name);
    return null;
  }

  // Calculate total yield per batch (sum of components = yield)
  const yieldPerBatch = components.reduce((sum, c) => {
    return sum + convertToBaseUnit(c.quantityRequired, c.unit);
  }, 0);

  // How many batches do we need?
  const batchesNeeded = Math.ceil(requiredQuantity / yieldPerBatch);
  
  console.log('[AutoProduce] Need', requiredQuantity, inventoryItem.unit, 'of', inventoryItem.name);
  console.log('[AutoProduce] Yield per batch:', yieldPerBatch, '- Batches needed:', batchesNeeded);

  // Check if we have enough of each component
  const componentsUsed: { name: string; quantity: number; unit: string }[] = [];
  
  for (const component of components) {
    const childItem = inventory.find(i => i.id === component.childInventoryId);
    if (!childItem) {
      console.log('[AutoProduce] Component not found:', component.childInventoryId);
      return null;
    }

    const componentQtyNeeded = convertToBaseUnit(component.quantityRequired, component.unit) * batchesNeeded;
    
    if (childItem.quantity < componentQtyNeeded) {
      console.log('[AutoProduce] Insufficient component:', childItem.name, 'have:', childItem.quantity, 'need:', componentQtyNeeded);
      toast.warning(`Cannot auto-produce ${inventoryItem.name}`, {
        description: `Insufficient ${childItem.name}: have ${formatQuantityDisplay(childItem.quantity, childItem.unit)}, need ${formatQuantityDisplay(componentQtyNeeded, childItem.unit)}`,
      });
      return null;
    }

    componentsUsed.push({
      name: childItem.name,
      quantity: componentQtyNeeded,
      unit: childItem.unit
    });
  }

  // All components available - proceed with production
  const updatedInventory = [...inventory];
  
  // Deduct components
  for (const component of components) {
    const componentQtyNeeded = convertToBaseUnit(component.quantityRequired, component.unit) * batchesNeeded;
    const childItemIndex = updatedInventory.findIndex(i => i.id === component.childInventoryId);
    if (childItemIndex !== -1) {
      updatedInventory[childItemIndex] = {
        ...updatedInventory[childItemIndex],
        quantity: updatedInventory[childItemIndex].quantity - componentQtyNeeded,
        lastUpdated: new Date()
      };
    }
  }

  // Add produced quantity to parent item
  const parentItemIndex = updatedInventory.findIndex(i => i.id === inventoryItemId);
  const quantityProduced = yieldPerBatch * batchesNeeded;
  
  if (parentItemIndex !== -1) {
    updatedInventory[parentItemIndex] = {
      ...updatedInventory[parentItemIndex],
      quantity: updatedInventory[parentItemIndex].quantity + quantityProduced,
      lastUpdated: new Date()
    };
  }

  // Save to localStorage
  setInventory(updatedInventory);

  const result: ProductionResult = {
    produced: true,
    itemName: inventoryItem.name,
    quantityProduced,
    unit: inventoryItem.unit,
    componentsUsed,
    message: `Auto-produced ${formatQuantityDisplay(quantityProduced, inventoryItem.unit)} of ${inventoryItem.name}`
  };

  console.log('[AutoProduce] Success:', result);
  
  toast.success(`🏭 Auto-Produced: ${inventoryItem.name}`, {
    description: `${formatQuantityDisplay(quantityProduced, inventoryItem.unit)} from components`,
    duration: 5000,
  });

  return result;
};

/**
 * Check and auto-produce inventory items before deduction
 * Call this before reducing stock
 */
export const ensureInventoryAvailable = async (
  inventoryItemId: string,
  requiredQuantity: number
): Promise<{ available: boolean; autoProduced: boolean }> => {
  const inventory = getInventory();
  const inventoryItem = inventory.find(i => i.id === inventoryItemId);
  
  if (!inventoryItem) {
    return { available: false, autoProduced: false };
  }

  // If we have enough stock, no need to produce
  if (inventoryItem.quantity >= requiredQuantity) {
    return { available: true, autoProduced: false };
  }

  // Need to produce more
  const shortfall = requiredQuantity - inventoryItem.quantity;
  console.log('[EnsureInventory]', inventoryItem.name, 'shortfall:', shortfall);

  // Load components from database
  const { data: componentsData } = await supabase
    .from('inventory_components')
    .select('*');
  
  const componentsMap: Record<string, ComponentInfo[]> = {};
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

  // Try to auto-produce
  const result = await autoProduceFromComponents(
    inventoryItemId,
    shortfall,
    inventory,
    componentsMap
  );

  if (result?.produced) {
    return { available: true, autoProduced: true };
  }

  return { available: false, autoProduced: false };
};
