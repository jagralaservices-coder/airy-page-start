import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MenuItem, MenuItemVariation } from '@/lib/store';
import { Plus, Trash2, GripVertical, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VariationManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  onSave: (variations: MenuItemVariation[]) => void;
}

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'ltr', label: 'Liter (ltr)' },
  { value: 'plate', label: 'Plate' },
  { value: 'serving', label: 'Serving' },
  { value: 'half', label: 'Half' },
  { value: 'full', label: 'Full' },
];

const isWeightVolumeUnit = (unit: string) => ['g', 'kg', 'ml', 'ltr'].includes(unit);

const parseVariationName = (fullName: string, unit: string) => {
  if (isWeightVolumeUnit(unit)) {
    // Check for parenthesized format: "Default (500g)"
    const regex = new RegExp(`\\(([^)]+)\\s*${unit}\\)$`, 'i');
    const match = fullName.match(regex);
    if (match) {
      const weightVal = match[1].trim();
      const nameVal = fullName.slice(0, match.index).trim();
      return { name: nameVal, weight: weightVal };
    }
    // Check if the whole name is just a weight: "500g"
    if (fullName.toLowerCase().endsWith(unit.toLowerCase())) {
      const weightVal = fullName.slice(0, -unit.length).trim();
      if (!isNaN(Number(weightVal))) {
        return { name: '', weight: weightVal };
      }
    }
  }
  return { name: fullName, weight: '' };
};

const formatVariationName = (name: string, weight: string, unit: string) => {
  const trimmedName = name.trim();
  const trimmedWeight = weight.trim();
  if (isWeightVolumeUnit(unit) && trimmedWeight) {
    return trimmedName ? `${trimmedName} (${trimmedWeight}${unit})` : `${trimmedWeight}${unit}`;
  }
  return trimmedName || 'Default';
};

export const VariationManagementDialog: React.FC<VariationManagementDialogProps> = ({
  open,
  onOpenChange,
  menuItem,
  onSave,
}) => {
  const [variations, setVariations] = useState<Array<{
    id?: string;
    name: string;
    weight: string;
    price: string;
    sku: string;
    unit: string;
    isAvailable: boolean;
    stock: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && menuItem) {
      loadVariations();
    }
  }, [open, menuItem]);

  const loadVariations = async () => {
    if (!menuItem) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_item_variations')
        .select('*')
        .eq('menu_item_id', menuItem.id)
        .order('sort_order');

      if (error) throw error;

      if (data && data.length > 0) {
        setVariations(data.map(v => {
          const unit = v.unit || 'pcs';
          const { name: cleanName, weight: parsedWeight } = parseVariationName(v.name, unit);
          return {
            id: v.id,
            name: cleanName,
            weight: parsedWeight,
            price: String(v.price),
            sku: v.sku || '',
            unit,
            isAvailable: v.is_available,
            stock: v.stock !== null ? String(v.stock) : ''
          };
        }));
      } else {
        // Add default variation from base item
        const isPrompt = menuItem.preparationTime === 998 || menuItem.preparationTime === 999;
        setVariations([{
          name: 'Default',
          weight: '',
          price: isPrompt ? '' : String(menuItem.price),
          sku: menuItem.sku || '',
          unit: 'pcs',
          isAvailable: true,
          stock: menuItem.stock !== undefined ? String(menuItem.stock) : ''
        }]);
      }
    } catch (error) {
      console.error('Error loading variations:', error);
      setVariations([]);
    }
    setLoading(false);
  };

  const addVariation = () => {
    setVariations(prev => [...prev, {
      name: '',
      weight: '',
      price: '',
      sku: '',
      unit: 'pcs',
      isAvailable: true,
      stock: ''
    }]);
  };

  const removeVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: string, value: string | boolean) => {
    setVariations(prev => prev.map((v, i) => 
      i === index ? { ...v, [field]: value } : v
    ));
  };

  const handleSave = async () => {
    if (!menuItem) return;
    
    const isPrompt = menuItem.preparationTime === 998 || menuItem.preparationTime === 999;
    // Validate: Either name or weight must be filled, and price is required (unless prompt item)
    const validVariations = variations.filter(v => (v.name.trim() || v.weight.trim()) && (isPrompt ? true : v.price));
    if (validVariations.length === 0) {
      toast.error(isPrompt ? 'Please add at least one valid variation' : 'Please add at least one valid variation with a price');
      return;
    }

    setLoading(true);
    try {
      // Delete existing variations
      await supabase
        .from('menu_item_variations')
        .delete()
        .eq('menu_item_id', menuItem.id);

      // Insert new variations
      const variationsToInsert = validVariations.map((v, idx) => {
        const unit = v.unit || 'pcs';
        const formattedName = formatVariationName(v.name, v.weight, unit);
        return {
          menu_item_id: menuItem.id,
          name: formattedName,
          price: isPrompt ? 0 : parseFloat(v.price),
          sku: v.sku.trim() || null,
          unit,
          is_available: v.isAvailable,
          stock: v.stock ? parseInt(v.stock) : null,
          sort_order: idx
        };
      });

      const { error } = await supabase
        .from('menu_item_variations')
        .insert(variationsToInsert);

      if (error) throw error;

      // Convert to MenuItemVariation format
      const savedVariations: MenuItemVariation[] = validVariations.map((v, idx) => {
        const unit = v.unit || 'pcs';
        const formattedName = formatVariationName(v.name, v.weight, unit);
        return {
          id: v.id || `temp-${idx}`,
          menuItemId: menuItem.id,
          name: formattedName,
          price: isPrompt ? 0 : parseFloat(v.price),
          sku: v.sku.trim() || undefined,
          unit,
          isAvailable: v.isAvailable,
          stock: v.stock ? parseInt(v.stock) : undefined,
          sortOrder: idx
        };
      });

      onSave(savedVariations);
      toast.success('Variations saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving variations:', error);
      toast.error('Failed to save variations');
    }
    setLoading(false);
  };

  if (!menuItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Manage Variations - {menuItem.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Add product variations like sizes (500ml, 1L) or portions (Half, Full) with different prices.
          </p>

          {/* Variations List */}
          <div className="space-y-3">
            {variations.map((variation, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg"
              >
                <GripVertical className="w-4 h-4 mt-3 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Input
                    placeholder="Name (e.g., Packet)"
                    value={variation.name}
                    onChange={(e) => updateVariation(index, 'name', e.target.value)}
                    className="col-span-1"
                  />
                  {isWeightVolumeUnit(variation.unit) ? (
                    <Input
                      type="number"
                      placeholder="Grams (g)"
                      value={variation.weight}
                      onChange={(e) => updateVariation(index, 'weight', e.target.value)}
                      className="col-span-1"
                    />
                  ) : (
                    <div className="hidden sm:flex items-center justify-center text-muted-foreground/30 text-xs select-none">
                      N/A
                    </div>
                  )}
                  {menuItem.preparationTime === 998 || menuItem.preparationTime === 999 ? (
                    <Input
                      placeholder="Prompted"
                      value=""
                      disabled
                      className="col-span-1 bg-secondary text-muted-foreground opacity-70 cursor-not-allowed text-xs"
                    />
                  ) : (
                    <Input
                      type="number"
                      placeholder="Price"
                      value={variation.price}
                      onChange={(e) => updateVariation(index, 'price', e.target.value)}
                      className="col-span-1"
                    />
                  )}
                  <Select
                    value={variation.unit}
                    onValueChange={(value) => updateVariation(index, 'unit', value)}
                  >
                    <SelectTrigger className="col-span-1">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="SKU (optional)"
                    value={variation.sku}
                    onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                    className="col-span-1"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariation(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Variation Button */}
          <Button
            variant="outline"
            onClick={addVariation}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Variation
          </Button>

          {/* Example */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Example:</p>
            <p className="text-muted-foreground">
              For "Water" item, add variations like:<br />
              • 500ml - ₹10 (ml unit)<br />
              • 1 Liter - ₹20 (ltr unit)<br />
              • 2 Liter - ₹35 (ltr unit)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Variations'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
