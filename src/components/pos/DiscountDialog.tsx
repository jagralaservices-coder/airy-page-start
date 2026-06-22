import React, { useState } from 'react';
import { X, Tag, Percent, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/contexts/LocaleContext';

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  currentDiscount: number;
  onApplyDiscount: (amount: number, reason: string) => void;
}

// Sample coupon codes
const COUPON_CODES: Record<string, { type: 'fixed' | 'percentage'; value: number }> = {
  'SAVE10': { type: 'percentage', value: 10 },
  'SAVE20': { type: 'percentage', value: 20 },
  'FLAT50': { type: 'fixed', value: 50 },
  'FLAT100': { type: 'fixed', value: 100 },
  'WELCOME': { type: 'percentage', value: 15 },
};

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  open,
  onOpenChange,
  subtotal,
  currentDiscount,
  onApplyDiscount
}) => {
  const { t } = useLocale();
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [reason, setReason] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const calculatedDiscount = discountType === 'percentage' 
    ? (subtotal * discountValue) / 100 
    : discountValue;

  const finalAmount = subtotal - calculatedDiscount;

  const handleApplyCoupon = () => {
    const code = couponCode.toUpperCase().trim();
    const coupon = COUPON_CODES[code];
    
    if (!coupon) {
      toast.error(t('msg.invalidCoupon'));
      return;
    }

    setDiscountType(coupon.type);
    setDiscountValue(coupon.value);
    setAppliedCoupon(code);
    setReason(`${t('discount.couponCode')}: ${code}`);
    toast.success(t('msg.couponApplied').replace('{code}', code));
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountValue(0);
    setReason('');
    setCouponCode('');
  };

  const handleClear = () => {
    setCouponCode('');
    setDiscountValue(0);
    setReason('');
    setAppliedCoupon(null);
  };

  const handleSave = () => {
    if (calculatedDiscount > subtotal) {
      toast.error(t('msg.discountExceedsSubtotal'));
      return;
    }
    onApplyDiscount(calculatedDiscount, reason);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('discount.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subtotal Info */}
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="text-sm text-muted-foreground">{t('common.subtotal')}</span>
            <span className="font-bold">{formatCurrency(subtotal)}</span>
          </div>

          {/* Coupon Code Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('discount.couponCode')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t('discount.enterCoupon')}
                  className="pl-10"
                  disabled={!!appliedCoupon}
                />
              </div>
              {appliedCoupon ? (
                <Button variant="outline" onClick={handleRemoveCoupon}>
                  {t('discount.clear')}
                </Button>
              ) : (
                <Button onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                  {t('discount.apply')}
                </Button>
              )}
            </div>
            {appliedCoupon && (
              <p className="text-xs text-success">✓ {t('discount.couponAppliedText').replace('{code}', appliedCoupon)}</p>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">{t('discount.or')}</span>
            </div>
          </div>

          {/* Custom Discount Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('discount.customDiscount')}</label>
            
            {/* Reason */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('discount.mentionReason')}</label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('discount.reasonPlaceholder')}
                disabled={!!appliedCoupon}
              />
            </div>

            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType('percentage')}
                disabled={!!appliedCoupon}
                className={cn(
                  'flex-1 h-10 rounded-lg flex items-center justify-center gap-2 border-2 transition-all',
                  discountType === 'percentage'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50',
                  appliedCoupon && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Percent className="w-4 h-4" />
                {t('discount.percentage')}
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                disabled={!!appliedCoupon}
                className={cn(
                  'flex-1 h-10 rounded-lg flex items-center justify-center gap-2 border-2 transition-all',
                  discountType === 'fixed'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50',
                  appliedCoupon && 'opacity-50 cursor-not-allowed'
                )}
              >
                ₹ {t('discount.fixed')}
              </button>
            </div>

            {/* Discount Value */}
            <div className="relative">
              <Input
                type="number"
                value={discountValue || ''}
                onChange={e => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === 'percentage' ? t('discount.enterPercent') : t('discount.enterAmount')}
                className="pr-12"
                disabled={!!appliedCoupon}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {discountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('discount.coreAmount')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('discount.discountAmount')}</span>
              <span className="text-destructive font-medium">-{formatCurrency(calculatedDiscount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-2">
              <span>{t('discount.finalAmount')}</span>
              <span className="text-primary">{formatCurrency(finalAmount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
