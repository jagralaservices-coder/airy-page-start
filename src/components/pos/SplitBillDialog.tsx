import React, { useState } from 'react';
import { formatCurrency } from '@/lib/store';
import { Plus, Trash2, Banknote, CreditCard, Smartphone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

interface SplitCustomer {
  id: string;
  name: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | null;
}

interface SplitBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (splits: SplitCustomer[]) => void;
}

export const SplitBillDialog: React.FC<SplitBillDialogProps> = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm
}) => {
  const { t } = useLocale();
  const [splits, setSplits] = useState<SplitCustomer[]>([
    { id: '1', name: `${t('common.customer')} 1`, amount: totalAmount / 2, paymentMethod: null },
    { id: '2', name: `${t('common.customer')} 2`, amount: totalAmount / 2, paymentMethod: null },
  ]);

  const allocatedAmount = splits.reduce((sum, s) => sum + s.amount, 0);
  const remainingAmount = totalAmount - allocatedAmount;

  const addCustomer = () => {
    setSplits([
      ...splits,
      { 
        id: Date.now().toString(), 
        name: `${t('common.customer')} ${splits.length + 1}`, 
        amount: remainingAmount > 0 ? remainingAmount : 0, 
        paymentMethod: null 
      }
    ]);
  };

  const removeCustomer = (id: string) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter(s => s.id !== id));
  };

  const updateSplit = (id: string, field: keyof SplitCustomer, value: any) => {
    setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const splitEqually = () => {
    const equalAmount = totalAmount / splits.length;
    setSplits(splits.map(s => ({ ...s, amount: Math.round(equalAmount * 100) / 100 })));
  };

  const handleConfirm = () => {
    if (Math.abs(remainingAmount) > 1) return; // Allow 1 rupee tolerance
    if (splits.some(s => !s.paymentMethod)) return;
    onConfirm(splits);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('splitBill.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total Info */}
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="font-medium">{t('splitBill.totalBill')}</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Split Equally Button */}
          <Button variant="outline" onClick={splitEqually} className="w-full">
            {t('splitBill.splitEqually')} ({splits.length} {t('splitBill.ways')})
          </Button>

          {/* Customer Splits */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {splits.map((split, idx) => (
              <div key={split.id} className="p-3 border border-border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <Input
                    value={split.name}
                    onChange={e => updateSplit(split.id, 'name', e.target.value)}
                    className="flex-1 h-8"
                    placeholder={t('splitBill.customerName')}
                  />
                  {splits.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomer(split.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-16">{t('splitBill.amount')}</span>
                  <Input
                    type="number"
                    value={split.amount}
                    onChange={e => updateSplit(split.id, 'amount', Number(e.target.value))}
                    className="flex-1 h-8"
                  />
                </div>

                {/* Payment Method */}
                <div className="flex gap-2">
                  {[
                    { id: 'cash', icon: Banknote, label: t('pos.cash') },
                    { id: 'card', icon: CreditCard, label: t('pos.card') },
                    { id: 'upi', icon: Smartphone, label: t('pos.upi') },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => updateSplit(split.id, 'paymentMethod', method.id)}
                      className={cn(
                        'flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 border-2 transition-all text-xs',
                        split.paymentMethod === method.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <method.icon className="w-3.5 h-3.5" />
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add Customer */}
          <Button variant="outline" onClick={addCustomer} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('splitBill.addCustomer')}
          </Button>

          {/* Remaining Amount */}
          <div className={cn(
            'flex justify-between items-center p-3 rounded-lg',
            Math.abs(remainingAmount) < 1 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            <span className="font-medium">{t('partPayment.remaining')}</span>
            <span className="font-bold">{formatCurrency(remainingAmount)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={Math.abs(remainingAmount) > 1 || splits.some(s => !s.paymentMethod)}
              className="flex-1"
            >
              {t('splitBill.confirmSplit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
