import React, { useState, useEffect } from 'react';
import { formatCurrency, MenuItem, MenuItemVariation } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariationSelectorSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MenuItem, variation?: MenuItemVariation, quantity?: number) => void;
}

export const VariationSelectorSheet: React.FC<VariationSelectorSheetProps> = ({
  item,
  isOpen,
  onClose,
  onSelect,
}) => {
  const [selectedVariation, setSelectedVariation] = useState<MenuItemVariation | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Get all available variations
  const variations = item?.variations?.filter(v => v.isAvailable) || [];

  // Reset state when dialog opens - no auto-selection
  useEffect(() => {
    if (isOpen) {
      setSelectedVariation(null);
      setQuantity(1);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!item) return;
    onSelect(item, selectedVariation || undefined, quantity);
    setSelectedVariation(null);
    setQuantity(1);
    onClose();
  };

  const handleCancel = () => {
    setSelectedVariation(null);
    setQuantity(1);
    onClose();
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  // Don't render Dialog at all if no item - this keeps hook count stable
  // because we're not doing early return, we're just not rendering Dialog
  return (
    <Dialog open={isOpen && !!item} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {item && (
          <>
            {/* Header */}
            <DialogHeader className="p-4 pb-2 border-b border-border">
              <DialogTitle className="text-base font-medium flex items-center justify-between">
                <span>{item.name} | ₹{item.price.toFixed(2)}</span>
              </DialogTitle>
            </DialogHeader>

            {/* Variation Options */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">Variation</p>
              
              <div className="flex flex-wrap gap-3">
                {variations.map((variation) => (
                  <button
                    key={variation.id}
                    onClick={() => setSelectedVariation(variation)}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[100px] px-4 py-3 rounded-md border-2 transition-all",
                      selectedVariation?.id === variation.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted/50 border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm font-semibold uppercase">
                      {variation.name}
                    </span>
                    <span className={cn(
                      "text-sm font-bold",
                      selectedVariation?.id === variation.id ? "text-primary-foreground" : "text-foreground"
                    )}>
                      ₹{variation.price}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Quantity</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={incrementQuantity}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 p-4 pt-2 border-t border-border">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!selectedVariation}
                className="bg-primary hover:bg-primary/90"
              >
                Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
