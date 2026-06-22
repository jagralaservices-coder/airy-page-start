import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package, Factory } from 'lucide-react';
import { InventoryItem, InventoryComponent, getInventory, setInventory, generateId } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatQuantityDisplay } from '@/lib/inventoryUtils';

interface InventoryComponentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem: InventoryItem | null;
  onSave: () => void;
}

export const InventoryComponentsDialog: React.FC<InventoryComponentsDialogProps> = ({
  open,
  onOpenChange,
  inventoryItem,
  onSave
}) => {
  const [components, setComponents] = useState<InventoryComponent[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [productionYield, setProductionYield] = useState<number>(0);
  const [productionYieldUnit, setProductionYieldUnit] = useState<string>('g');

  useEffect(() => {
    const loadComponents = async () => {
      if (!inventoryItem) return;
      
      setAllInventory(getInventory());
      
      // Load production yield from localStorage
      setProductionYield(inventoryItem.productionYield || 0);
      setProductionYieldUnit(inventoryItem.productionYieldUnit || inventoryItem.unit || 'g');
      
      // Load components from database
      const { data, error } = await supabase
        .from('inventory_components')
        .select('*')
        .eq('parent_inventory_id', inventoryItem.id);

      if (!error && data) {
        const loadedComponents: InventoryComponent[] = data.map(c => ({
          id: c.id,
          childInventoryId: c.child_inventory_id,
          quantityRequired: Number(c.quantity_required),
          unit: c.unit
        }));
        setComponents(loadedComponents);
      } else {
        // Fallback to localStorage
        setComponents(inventoryItem.components || []);
      }
    };

    if (open) {
      loadComponents();
    }
  }, [inventoryItem, open]);

  // Filter out current item from available inventory
  const availableInventory = allInventory.filter(i => i.id !== inventoryItem?.id);

  const addComponent = () => {
    setComponents([
      ...components,
      { id: generateId(), childInventoryId: '', quantityRequired: 1, unit: 'g' }
    ]);
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const updateComponent = (id: string, field: keyof InventoryComponent, value: string | number) => {
    setComponents(components.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleSave = async () => {
    if (!inventoryItem) return;
    
    setLoading(true);

    // Validate
    const validComponents = components.filter(c => c.childInventoryId && c.quantityRequired > 0);
    
    try {
      // Delete existing components in database
      await supabase
        .from('inventory_components')
        .delete()
        .eq('parent_inventory_id', inventoryItem.id);

      // Insert new components
      if (validComponents.length > 0) {
        const componentsToInsert = validComponents.map(c => ({
          parent_inventory_id: inventoryItem.id,
          child_inventory_id: c.childInventoryId,
          quantity_required: c.quantityRequired,
          unit: c.unit
        }));

        const { error } = await supabase
          .from('inventory_components')
          .insert(componentsToInsert);

        if (error) {
          console.error('Error saving components:', error);
          toast.error('Failed to save components to database');
        }
      }

      // Calculate production yield in base units
      const yieldFactor = productionYieldUnit.toLowerCase() === 'kg' || productionYieldUnit.toLowerCase() === 'ltr' ? 1000 : 1;
      const yieldInBaseUnit = productionYield * yieldFactor;

      // Calculate the new cost per unit based on components
      const inventory = getInventory();
      let totalCost = 0;
      
      validComponents.forEach(c => {
        const compItem = inventory.find(i => i.id === c.childInventoryId);
        if (compItem) {
          // Determine component's cost per base unit (g, ml, pcs)
          let costPerBaseUnit = compItem.costPerUnit;
          const cUnit = compItem.costUnit || compItem.unit;
          if (cUnit === 'kg' || cUnit === 'ltr') {
            costPerBaseUnit = compItem.costPerUnit / 1000;
          }
          
          // Determine component's required quantity in base unit
          let compQtyInBase = c.quantityRequired;
          if (c.unit === 'kg' || c.unit === 'ltr') {
            compQtyInBase = c.quantityRequired * 1000;
          }
          
          totalCost += costPerBaseUnit * compQtyInBase;
        }
      });

      let effectiveYield = yieldInBaseUnit;
      if (effectiveYield <= 0) {
        let totalWeightBase = 0;
        validComponents.forEach(c => {
          let compQtyInBase = c.quantityRequired;
          if (c.unit === 'kg' || c.unit === 'ltr') compQtyInBase = c.quantityRequired * 1000;
          totalWeightBase += compQtyInBase;
        });
        effectiveYield = totalWeightBase;
      }

      let newCostPerUnit = inventoryItem.costPerUnit;
      if (effectiveYield > 0) {
        // Cost per single base unit
        const costPerBaseUnit = totalCost / effectiveYield;
        
        // Convert to the item's configured costUnit
        const myCostUnit = inventoryItem.costUnit || inventoryItem.unit;
        if (myCostUnit === 'kg' || myCostUnit === 'ltr') {
          newCostPerUnit = costPerBaseUnit * 1000;
        } else {
          newCostPerUnit = costPerBaseUnit;
        }
        // Round to 2 decimal places
        newCostPerUnit = Number(newCostPerUnit.toFixed(2));
      }

      // Also update localStorage for offline/fast access
      const updatedInventory = inventory.map(item => 
        item.id === inventoryItem.id 
          ? { 
              ...item, 
              components: validComponents, 
              productionYield: yieldInBaseUnit,
              productionYieldUnit: productionYieldUnit,
              costPerUnit: newCostPerUnit,
              lastUpdated: new Date() 
            }
          : item
      );
      
      setInventory(updatedInventory);
      toast.success(`Recipe saved for ${inventoryItem.name}`);
      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving components:', err);
      toast.error('Failed to save components');
    } finally {
      setLoading(false);
    }
  };

  if (!inventoryItem) return null;

  // Dynamically calculate estimated cost
  let totalComponentCost = 0;
  let totalComponentWeightBase = 0;
  
  components.filter(c => c.childInventoryId && c.quantityRequired > 0).forEach(c => {
    const compItem = allInventory.find(inv => inv.id === c.childInventoryId);
    if (compItem) {
      let costPerBaseUnit = compItem.costPerUnit;
      const cUnit = compItem.costUnit || compItem.unit;
      if (cUnit === 'kg' || cUnit === 'ltr') costPerBaseUnit = compItem.costPerUnit / 1000;
      
      let compQtyInBase = c.quantityRequired;
      if (c.unit === 'kg' || c.unit === 'ltr') compQtyInBase = c.quantityRequired * 1000;
      
      totalComponentCost += costPerBaseUnit * compQtyInBase;
      totalComponentWeightBase += compQtyInBase;
    }
  });

  const yieldFactor = productionYieldUnit.toLowerCase() === 'kg' || productionYieldUnit.toLowerCase() === 'ltr' ? 1000 : 1;
  const yieldInBaseUnit = productionYield * yieldFactor;
  const effectiveYield = yieldInBaseUnit > 0 ? yieldInBaseUnit : totalComponentWeightBase;
  
  let estimatedCostPerUnit = inventoryItem.costPerUnit;
  if (effectiveYield > 0) {
    const costPerBaseUnit = totalComponentCost / effectiveYield;
    const myCostUnit = inventoryItem?.costUnit || inventoryItem?.unit || 'kg';
    if (myCostUnit === 'kg' || myCostUnit === 'ltr') {
      estimatedCostPerUnit = costPerBaseUnit * 1000;
    } else {
      estimatedCostPerUnit = costPerBaseUnit;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Components for: {inventoryItem.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Add sub-components that make up this inventory item. For example, if "{inventoryItem.name}" requires Oil + Premix + Water, add them below.
          </p>

          {components.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No components added yet
            </div>
          ) : (
            <div className="space-y-3">
              {components.map((component, index) => (
                <div key={component.id} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Component {index + 1}</Label>
                    <Select 
                      value={component.childInventoryId} 
                      onValueChange={(v) => updateComponent(component.id, 'childInventoryId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInventory.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name} ({inv.quantity} {inv.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      value={component.quantityRequired}
                      onChange={(e) => updateComponent(component.id, 'quantityRequired', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Unit</Label>
                    <Select 
                      value={component.unit} 
                      onValueChange={(v) => updateComponent(component.id, 'unit', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="ltr">ltr</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
                    onClick={() => removeComponent(component.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full gap-2" onClick={addComponent}>
            <Plus className="w-4 h-4" />
            Add Component
          </Button>

          {/* Production Yield Section */}
          {components.length > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="w-5 h-5 text-primary" />
                <Label className="font-semibold text-primary">Production Yield</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                In upar wale components se kitna {inventoryItem.name} banta hai? (e.g., 530g components se 1 KG batter)
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Yield Quantity</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={productionYield || ''}
                    onChange={(e) => setProductionYield(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Unit</Label>
                  <Select 
                    value={productionYieldUnit} 
                    onValueChange={setProductionYieldUnit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="ltr">ltr</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {effectiveYield > 0 && (
                <div className="mt-3 p-2 bg-background rounded text-sm">
                  <span className="text-muted-foreground">Recipe: </span>
                  <span className="font-medium">
                    {components.map((c, i) => {
                      const invItem = allInventory.find(inv => inv.id === c.childInventoryId);
                      return invItem ? `${c.quantityRequired}${c.unit} ${invItem.name}${i < components.length - 1 ? ' + ' : ''}` : '';
                    }).join('')}
                  </span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-bold text-primary">
                    {formatQuantityDisplay(effectiveYield, inventoryItem.unit)} {inventoryItem.name}
                  </span>
                  <div className="mt-2 pt-2 border-t border-border">
                    <span className="text-muted-foreground font-medium">Estimated Cost: </span>
                    <span className="font-bold text-green-600">₹{estimatedCostPerUnit.toFixed(2)} / {(inventoryItem.costUnit || inventoryItem.unit).toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Recipe'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
