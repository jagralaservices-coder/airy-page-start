import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/store';
import { Banknote, CreditCard, Smartphone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

interface PartPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (payments: { method: string; amount: number }[]) => void;
}

export const PartPaymentDialog: React.FC<PartPaymentDialogProps> = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
}) => {
  const { t } = useLocale();
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setCashAmount(0);
      setCardAmount(0);
      setUpiAmount(0);
      setCreditAmount(0);
      setSubmitError(null);
    }
  }, [open]);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const totalTarget = round2(totalAmount);
  const totalPaid = round2(cashAmount + cardAmount + upiAmount + creditAmount);
  const remaining = round2(totalTarget - totalPaid);
  const isValid = Math.abs(remaining) < 0.01;

  const updateAmount = (setter: (n: number) => void) => (raw: string) => {
    const n = Number(raw);
    setter(!Number.isFinite(n) || n < 0 ? 0 : round2(n));
    setSubmitError(null);
  };

  const handleQuickSplit = (method1: 'cash' | 'card' | 'upi' | 'credit', method2: 'cash' | 'card' | 'upi' | 'credit') => {
    const half = Math.floor(totalAmount / 2);
    const otherHalf = totalAmount - half;
    
    setCashAmount(method1 === 'cash' ? half : method2 === 'cash' ? otherHalf : 0);
    setCardAmount(method1 === 'card' ? half : method2 === 'card' ? otherHalf : 0);
    setUpiAmount(method1 === 'upi' ? half : method2 === 'upi' ? otherHalf : 0);
    setCreditAmount(method1 === 'credit' ? half : method2 === 'credit' ? otherHalf : 0);
    setSubmitError(null);
  };

  const handleConfirm = () => {
    // Defensive: never rely solely on the disabled button
    if (totalPaid <= 0) {
      setSubmitError('Enter at least one payment amount.');
      return;
    }
    if (!isValid) {
      setSubmitError(
        remaining > 0
          ? `Payment short by ${formatCurrency(Math.abs(remaining))}. Breakdown must equal ${formatCurrency(totalTarget)}.`
          : `Payment exceeds bill by ${formatCurrency(Math.abs(remaining))}. Breakdown must equal ${formatCurrency(totalTarget)}.`
      );
      return;
    }

    const payments: { method: string; amount: number }[] = [];
    if (cashAmount > 0) payments.push({ method: 'cash', amount: round2(cashAmount) });
    if (cardAmount > 0) payments.push({ method: 'card', amount: round2(cardAmount) });
    if (upiAmount > 0) payments.push({ method: 'upi', amount: round2(upiAmount) });
    if (creditAmount > 0) payments.push({ method: 'credit', amount: round2(creditAmount) });

    const sum = round2(payments.reduce((s, p) => s + p.amount, 0));
    if (Math.abs(sum - totalTarget) >= 0.01) {
      setSubmitError(`Breakdown (${formatCurrency(sum)}) does not match bill total (${formatCurrency(totalTarget)}).`);
      return;
    }

    setSubmitError(null);
    onConfirm(payments);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('partPayment.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total Amount */}
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">{t('partPayment.totalAmount')}</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>

          {/* Quick Split Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('partPayment.quickSplit')}</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('cash', 'upi')}
                className="text-xs"
              >
                {t('pos.cash')} + {t('pos.upi')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('cash', 'card')}
                className="text-xs"
              >
                {t('pos.cash')} + {t('pos.card')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('card', 'upi')}
                className="text-xs"
              >
                {t('pos.card')} + {t('pos.upi')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('cash', 'credit')}
                className="text-xs"
              >
                {t('pos.cash')} + Credit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('card', 'credit')}
                className="text-xs"
              >
                {t('pos.card')} + Credit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSplit('upi', 'credit')}
                className="text-xs"
              >
                {t('pos.upi')} + Credit
              </Button>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('partPayment.orEnterAmounts')}</p>
            
            {/* Cash */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('pos.cash')}</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cashAmount || ''}
                onChange={(e) => updateAmount(setCashAmount)(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>

            {/* Card */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{t('pos.card')}</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cardAmount || ''}
                onChange={(e) => updateAmount(setCardAmount)(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>

            {/* UPI */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span className="text-sm">{t('pos.upi')}</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={upiAmount || ''}
                onChange={(e) => updateAmount(setUpiAmount)(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>

            {/* Credit */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Credit</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={creditAmount || ''}
                onChange={(e) => updateAmount(setCreditAmount)(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t('partPayment.totalEntered')}</span>
              <span className="font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            <div className={cn(
              "flex justify-between text-sm font-medium",
              remaining > 0 ? "text-destructive" : remaining < 0 ? "text-orange-500" : "text-green-600"
            )}>
              <span>{remaining > 0 ? t('partPayment.remaining') : remaining < 0 ? t('partPayment.excess') : t('partPayment.balanced')}</span>
              <span>{formatCurrency(Math.abs(remaining))}</span>
            </div>
          </div>

          {/* Validation error */}
          {submitError && (
            <div
              role="alert"
              className="p-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs"
            >
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isValid || totalPaid === 0}
            >
              {t('partPayment.confirmPayment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
