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

interface CustomItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItem, quantity: number) => void;
  categoryId: string;
}

export const CustomItemDialog: React.FC<CustomItemDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
  categoryId,
}) => {
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setProductName('');
    setPrice('');
    setQuantity('1');
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!productName.trim()) nextErrors.productName = 'Product name is required';
    if (!price || Number(price) <= 0) nextErrors.price = 'Rate / Price must be greater than 0';
    if (!quantity || Number(quantity) <= 0) nextErrors.quantity = 'Quantity must be greater than 0';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;

    const customItem: MenuItem = {
      id: `other_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: productName.trim(),
      price: Number(price),
      category: categoryId === 'all' ? 'others' : categoryId,
      isAvailable: true,
    };

    onAdd(customItem, Math.max(1, Math.floor(Number(quantity))));
    toast.success(`${productName.trim()} added to cart`);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Add Custom Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="custom-product-name">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="custom-product-name"
              placeholder="Enter product name"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                setErrors((prev) => ({ ...prev, productName: '' }));
              }}
              autoFocus
            />
            {errors.productName && <p className="text-xs text-destructive">{errors.productName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-product-price">
                Rate / Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-product-price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: '' }));
                }}
                min="0"
                step="0.01"
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-product-quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-product-quantity"
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
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
