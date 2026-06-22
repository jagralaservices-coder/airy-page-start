import React, { useEffect, useState } from 'react';
import { Plus, PackagePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MenuItem } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptPriceWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onAdd: (item: MenuItem, price: number, quantity?: number) => void;
}

export const PromptPriceWeightDialog: React.FC<PromptPriceWeightDialogProps> = ({
  open,
  onOpenChange,
  item,
  onAdd,
}) => {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<'pcs' | 'grams'>('pcs');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setPrice('');
    setWeight('');
    setQuantity('1');
    setUnit('pcs');
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!price || Number(price) <= 0) {
      nextErrors.price = 'Price is required and must be greater than 0';
    }

    if (unit === 'grams') {
      if (!weight || Number(weight) <= 0) {
        nextErrors.weight = 'Weight in grams is required';
      }
    }

    if (!quantity || Number(quantity) <= 0) {
      nextErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate() || !item) return;

    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    let finalItem = { ...item };

    if (unit === 'grams') {
      const gramsVal = Number(weight);
      finalItem = {
        ...item,
        name: `${item.name} (${gramsVal}g)`
      };
    }

    onAdd(finalItem, priceNum, quantityNum);
    toast.success(`${finalItem.name} added to cart`);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Enter Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Product: <span className="text-foreground font-semibold">{item?.name}</span>
            </p>
          </div>

          {/* Unit selection control */}
          <div className="space-y-1.5">
            <Label>Unit Type</Label>
            <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setUnit('pcs');
                  setWeight('');
                  setErrors({});
                }}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all",
                  unit === 'pcs'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pieces (pcs)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnit('grams');
                  setErrors({});
                }}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all",
                  unit === 'grams'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Grams (g)
              </button>
            </div>
          </div>

          {/* Price input */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt-price">
              Price <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prompt-price"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setErrors((prev) => ({ ...prev, price: '' }));
              }}
              autoFocus
              min="0.01"
              step="0.01"
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
          </div>

          {/* Grams input (only in Grams mode) */}
          {unit === 'grams' && (
            <div className="space-y-1.5">
              <Label htmlFor="prompt-weight">
                Grammage / Weight in Grams (g) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prompt-weight"
                type="number"
                placeholder="e.g. 250 for 250g"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                min="1"
                step="1"
              />
              {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
              <p className="text-[11px] text-muted-foreground">
                Enter weight in grams (e.g. 250 for 250 grams).
              </p>
            </div>
          )}

          {/* Quantity input */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt-quantity">
              Quantity / Qty <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prompt-quantity"
              type="number"
              placeholder="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((prev) => ({ ...prev, quantity: '' }));
              }}
              min="1"
              step="1"
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            <p className="text-[11px] text-muted-foreground">
              {unit === 'grams'
                ? "Number of packets/items of this weight."
                : "Number of pieces to buy."}
            </p>
          </div>

          <Button className="w-full font-medium" size="lg" onClick={handleConfirm}>
            <Plus className="w-4 h-4 mr-2" /> Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
