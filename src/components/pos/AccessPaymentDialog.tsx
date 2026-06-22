import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CreditCard, Smartphone, Landmark, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AccessPaySubMethod = 'cash' | 'card' | 'upi';

interface AccessPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
  onConfirm: (amount: number, subMethod: AccessPaySubMethod) => void;
}

export const AccessPaymentDialog: React.FC<AccessPaymentDialogProps> = ({
  open,
  onOpenChange,
  defaultAmount = 0,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [subMethod, setSubMethod] = useState<AccessPaySubMethod>('cash');

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount > 0 ? String(Math.round(defaultAmount)) : '');
      setSubMethod('cash');
    }
  }, [open, defaultAmount]);

  const amt = Number(amount) || 0;
  const isValid = amt > 0;

  const methods: { id: AccessPaySubMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" /> },
    { id: 'card', label: 'Card', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'upi', label: 'UPI', icon: <Smartphone className="w-5 h-5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            Access Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="access-amount">Amount</Label>
            <Input
              id="access-amount"
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSubMethod(m.id)}
                  className={cn(
                    'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                    subMethod === m.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {m.icon}
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!isValid}
            onClick={() => {
              onConfirm(amt, subMethod);
              onOpenChange(false);
            }}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Bill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
