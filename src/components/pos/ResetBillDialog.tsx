import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ResetBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetBillDialog: React.FC<ResetBillDialogProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [resetBillNo, setResetBillNo] = useState('none');
  const [financialYearDay, setFinancialYearDay] = useState('1');
  const [financialYearMonth, setFinancialYearMonth] = useState('APR');

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const getEffectiveDate = () => {
    if (resetBillNo === 'none') return '';
    const monthIndex = months.indexOf(financialYearMonth);
    const year = new Date().getFullYear();
    return `${financialYearDay} ${financialYearMonth} ${year}`;
  };

  const handleSave = () => {
    if (!password) {
      toast.error('Password is required');
      return;
    }
    if (!reason) {
      toast.error('Reason is required');
      return;
    }

    const settings = {
      resetBillNo,
      financialYearDay,
      financialYearMonth,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('pos_reset_bill_settings', JSON.stringify(settings));
    toast.success('Reset Bill No. settings saved successfully');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Reset Bill No.</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Password */}
          <div className="space-y-2">
            <Label>Password <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for resetting bill number..."
            />
          </div>

          {/* Reset Bill No. */}
          <div className="space-y-2">
            <Label>Reset Bill No.</Label>
            <RadioGroup value={resetBillNo} onValueChange={setResetBillNo} className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="font-normal">Yearly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal">Monthly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="font-normal">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal">Daily</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal">None</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Start New Financial Year from */}
          <div className="space-y-2">
            <Label>Start New Financial Year from</Label>
            <div className="flex gap-3">
              <Select value={financialYearDay} onValueChange={setFinancialYearDay}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={financialYearMonth} onValueChange={setFinancialYearMonth}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Text */}
          <div className="space-y-1">
            <p className="text-sm text-primary">
              Start Bill No. from "1" effective from - {getEffectiveDate()}
            </p>
            <p className="text-sm text-primary font-medium">
              {resetBillNo === 'none' ? 'Your Bill no will continue as it is.' : `Bill number will reset ${resetBillNo}.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
        </div>
      </div>
    </div>
  );
};
