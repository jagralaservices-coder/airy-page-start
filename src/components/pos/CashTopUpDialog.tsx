import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';

interface CashTopUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CashSettings {
  enableCashTopUp: boolean;
  requireApprovalTopUp: boolean;
  maxTopUpLimit: number;
  dailyTopUpLimit: number;
  trackCashFlow: boolean;
}

const defaultSettings: CashSettings = {
  enableCashTopUp: true,
  requireApprovalTopUp: false,
  maxTopUpLimit: 50000,
  dailyTopUpLimit: 100000,
  trackCashFlow: true
};

export const CashTopUpDialog: React.FC<CashTopUpDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useLocale();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [settings, setSettings] = useState<CashSettings>(defaultSettings);
  const [todayTopUps, setTodayTopUps] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('cash_settings');
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    }
    
    // Load today's top-ups
    const topUps = JSON.parse(localStorage.getItem('cash_topups') || '[]');
    const today = new Date().toDateString();
    const todayTotal = topUps
      .filter((t: any) => new Date(t.date).toDateString() === today)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    setTodayTopUps(todayTotal);
    
    // Load current balance
    setCurrentBalance(parseFloat(localStorage.getItem('cash_balance') || '0'));
  }, [isOpen]);

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      toast.error(t('msg.enterValidAmount'));
      return;
    }

    if (!source) {
      toast.error(t('msg.selectSource'));
      return;
    }

    if (amountNum > settings.maxTopUpLimit) {
      toast.error(`${t('msg.exceedsLimit')} ₹${settings.maxTopUpLimit}`);
      return;
    }

    if (todayTopUps + amountNum > settings.dailyTopUpLimit) {
      toast.error(`${t('msg.exceedsDailyLimit')} ₹${settings.dailyTopUpLimit}`);
      return;
    }

    // Save top-up
    const topUps = JSON.parse(localStorage.getItem('cash_topups') || '[]');
    const newTopUp = {
      id: Date.now().toString(),
      amount: amountNum,
      source,
      notes,
      date: new Date().toISOString(),
      status: settings.requireApprovalTopUp ? 'pending' : 'approved',
      staffName: localStorage.getItem('pos_current_biller') || 'Unknown'
    };
    topUps.push(newTopUp);
    localStorage.setItem('cash_topups', JSON.stringify(topUps));

    // Update cash balance
    if (!settings.requireApprovalTopUp) {
      const newBalance = currentBalance + amountNum;
      localStorage.setItem('cash_balance', newBalance.toString());
    }

    if (settings.requireApprovalTopUp) {
      toast.success(t('msg.topUpSubmitted'));
    } else {
      toast.success(`₹${amountNum} ${t('msg.addedToCashRegister')}`);
    }

    setAmount('');
    setSource('');
    setNotes('');
    onClose();
  };

  if (!settings.enableCashTopUp) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-success" />
              {t('topUp.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('topUp.disabled')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('topUp.contactManager')}</p>
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
            <PlusCircle className="w-5 h-5 text-success" />
            {t('topUp.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Limits & Balance Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('topUp.currentBalance')}</span>
              <span className="font-medium text-primary">₹{currentBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('topUp.maxSingle')}</span>
              <span className="font-medium">₹{settings.maxTopUpLimit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('topUp.todayTopUps')}</span>
              <span className="font-medium">₹{todayTopUps.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('topUp.dailyRemaining')}</span>
              <span className="font-medium text-success">₹{(settings.dailyTopUpLimit - todayTopUps).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">{t('common.amount')} (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder={t('topUp.enterAmount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="source">{t('topUp.source')}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('topUp.selectSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opening-float">{t('topUp.openingFloat')}</SelectItem>
                <SelectItem value="bank-withdrawal">{t('topUp.bankWithdrawal')}</SelectItem>
                <SelectItem value="owner-deposit">{t('topUp.ownerDeposit')}</SelectItem>
                <SelectItem value="change-fund">{t('topUp.changeFund')}</SelectItem>
                <SelectItem value="petty-cash-return">{t('topUp.pettyCashReturn')}</SelectItem>
                <SelectItem value="other">{t('topUp.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">{t('topUp.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('topUp.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {settings.requireApprovalTopUp && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning-foreground flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t('topUp.approvalRequired')}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} className="bg-success hover:bg-success/90 text-success-foreground">
            {settings.requireApprovalTopUp ? t('topUp.requestTopUp') : t('topUp.addCash')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashTopUpDialog;
