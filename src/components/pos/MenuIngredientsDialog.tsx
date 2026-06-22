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
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { MenuItem, MenuItemIngredient, InventoryItem, getInventory, generateId } from '@/lib/store';
import { toast } from 'sonner';

interface MenuIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  onSave: (ingredients: MenuItemIngredient[]) => void;
}

export const MenuIngredientsDialog: React.FC<MenuIngredientsDialogProps> = ({
  open,
  onOpenChange,
  menuItem,
  onSave
}) => {
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (menuItem) {
      setIngredients(menuItem.ingredients || []);
    }
    setInventory(getInventory());
  }, [menuItem, open]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: generateId(), inventoryItemId: '', quantityRequired: 1, unit: 'g' }
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const updateIngredient = (id: string, field: keyof MenuItemIngredient, value: string | number) => {
    setIngredients(ingredients.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ));
  };

  const handleSave = () => {
    if (!menuItem) return;

    // Validate
    const validIngredients = ingredients.filter(i => i.inventoryItemId && i.quantityRequired > 0);
    
    onSave(validIngredients);
    toast.success(`Recipe saved for ${menuItem.name}`);
    onOpenChange(false);
  };

  if (!menuItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            Recipe for: {menuItem.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Add all inventory items needed to make one "{menuItem.name}". This will auto-deduct from inventory when sold.
          </p>

          {ingredients.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No ingredients added yet
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => {
                const invItem = inventory.find(i => i.id === ingredient.inventoryItemId);
                return (
                  <div key={ingredient.id} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs">Ingredient {index + 1}</Label>
                      <Select 
                        value={ingredient.inventoryItemId} 
                        onValueChange={(v) => updateIngredient(ingredient.id, 'inventoryItemId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map(inv => (
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
                        value={ingredient.quantityRequired}
                        onChange={(e) => updateIngredient(ingredient.id, 'quantityRequired', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Unit</Label>
                      <Select 
                        value={ingredient.unit} 
                        onValueChange={(v) => updateIngredient(ingredient.id, 'unit', v)}
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
                      onClick={() => removeIngredient(ingredient.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="outline" className="w-full gap-2" onClick={addIngredient}>
            <Plus className="w-4 h-4" />
            Add Ingredient
          </Button>

          {ingredients.length > 0 && (
            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">Recipe Summary:</p>
              <ul className="text-sm text-muted-foreground mt-1">
                {ingredients.filter(i => i.inventoryItemId).map(ing => {
                  const inv = inventory.find(i => i.id === ing.inventoryItemId);
                  return (
                    <li key={ing.id}>• {inv?.name}: {ing.quantityRequired} {ing.unit}</li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Recipe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
