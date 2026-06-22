import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MinusCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';

interface WithdrawalDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CashSettings {
  enableCashWithdrawal: boolean;
  requireApprovalWithdrawal: boolean;
  maxWithdrawalLimit: number;
  dailyWithdrawalLimit: number;
  trackCashFlow: boolean;
  allowNegativeBalance: boolean;
}

const defaultSettings: CashSettings = {
  enableCashWithdrawal: true,
  requireApprovalWithdrawal: true,
  maxWithdrawalLimit: 10000,
  dailyWithdrawalLimit: 50000,
  trackCashFlow: true,
  allowNegativeBalance: false
};

export const WithdrawalDialog: React.FC<WithdrawalDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useLocale();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [settings, setSettings] = useState<CashSettings>(defaultSettings);
  const [todayWithdrawals, setTodayWithdrawals] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('cash_settings');
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    }
    
    // Load today's withdrawals
    const withdrawals = JSON.parse(localStorage.getItem('cash_withdrawals') || '[]');
    const today = new Date().toDateString();
    const todayTotal = withdrawals
      .filter((w: any) => new Date(w.date).toDateString() === today)
      .reduce((sum: number, w: any) => sum + w.amount, 0);
    setTodayWithdrawals(todayTotal);
  }, [isOpen]);

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      toast.error(t('msg.enterValidAmount'));
      return;
    }

    if (!reason.trim()) {
      toast.error(t('msg.enterReason'));
      return;
    }

    if (!category) {
      toast.error(t('msg.selectCategory'));
      return;
    }

    if (amountNum > settings.maxWithdrawalLimit) {
      toast.error(`${t('msg.exceedsLimit')} ₹${settings.maxWithdrawalLimit}`);
      return;
    }

    if (todayWithdrawals + amountNum > settings.dailyWithdrawalLimit) {
      toast.error(`${t('msg.exceedsDailyLimit')} ₹${settings.dailyWithdrawalLimit}`);
      return;
    }

    // Save withdrawal
    const withdrawals = JSON.parse(localStorage.getItem('cash_withdrawals') || '[]');
    const newWithdrawal = {
      id: Date.now().toString(),
      amount: amountNum,
      reason,
      category,
      date: new Date().toISOString(),
      status: settings.requireApprovalWithdrawal ? 'pending' : 'approved',
      staffName: localStorage.getItem('pos_current_biller') || 'Unknown'
    };
    withdrawals.push(newWithdrawal);
    localStorage.setItem('cash_withdrawals', JSON.stringify(withdrawals));

    // Update cash balance
    if (!settings.requireApprovalWithdrawal) {
      const currentBalance = parseFloat(localStorage.getItem('cash_balance') || '0');
      localStorage.setItem('cash_balance', (currentBalance - amountNum).toString());
    }

    if (settings.requireApprovalWithdrawal) {
      toast.success(t('msg.withdrawalSubmitted'));
    } else {
      toast.success(`₹${amountNum} ${t('msg.withdrawnSuccess')}`);
    }

    setAmount('');
    setReason('');
    setCategory('');
    onClose();
  };

  if (!settings.enableCashWithdrawal) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-destructive" />
              {t('withdrawal.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('withdrawal.disabled')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('withdrawal.contactManager')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MinusCircle className="w-5 h-5 text-destructive" />
            {t('withdrawal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Limits Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('withdrawal.maxSingle')}</span>
              <span className="font-medium">₹{settings.maxWithdrawalLimit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('withdrawal.todayWithdrawals')}</span>
              <span className="font-medium">₹{todayWithdrawals.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('withdrawal.dailyRemaining')}</span>
              <span className="font-medium text-success">₹{(settings.dailyWithdrawalLimit - todayWithdrawals).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">{t('common.amount')} (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder={t('withdrawal.enterAmount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="category">{t('withdrawal.category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('withdrawal.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petty-cash">{t('withdrawal.pettyCash')}</SelectItem>
                <SelectItem value="supplier-payment">{t('withdrawal.supplierPayment')}</SelectItem>
                <SelectItem value="salary-advance">{t('withdrawal.salaryAdvance')}</SelectItem>
                <SelectItem value="utilities">{t('withdrawal.utilities')}</SelectItem>
                <SelectItem value="maintenance">{t('withdrawal.maintenance')}</SelectItem>
                <SelectItem value="other">{t('withdrawal.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">{t('withdrawal.reason')}</Label>
            <Textarea
              id="reason"
              placeholder={t('withdrawal.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {settings.requireApprovalWithdrawal && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning-foreground flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t('withdrawal.approvalRequired')}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} className="bg-destructive hover:bg-destructive/90">
            {settings.requireApprovalWithdrawal ? t('withdrawal.requestWithdrawal') : t('withdrawal.withdraw')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
