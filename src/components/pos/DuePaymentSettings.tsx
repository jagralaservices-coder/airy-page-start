import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Bell, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface DuePaymentConfig {
  enableDuePayments: boolean;
  maxDueAmount: number;
  maxDueDays: number;
  requirePhoneForDue: boolean;
  requireApprovalAboveLimit: boolean;
  approvalLimitAmount: number;
  enableReminders: boolean;
  reminderDays: number[];
  blockOrderOnOverdue: boolean;
  overdueBlockDays: number;
  enablePartialPayment: boolean;
  minPartialPaymentPercent: number;
  enableLateFee: boolean;
  lateFeePercent: number;
  lateFeeAfterDays: number;
}

interface DuePaymentSettingsProps {
  onBack: () => void;
}

const defaultSettings: DuePaymentConfig = {
  enableDuePayments: true,
  maxDueAmount: 10000,
  maxDueDays: 30,
  requirePhoneForDue: true,
  requireApprovalAboveLimit: true,
  approvalLimitAmount: 5000,
  enableReminders: true,
  reminderDays: [7, 14, 21],
  blockOrderOnOverdue: true,
  overdueBlockDays: 45,
  enablePartialPayment: true,
  minPartialPaymentPercent: 25,
  enableLateFee: false,
  lateFeePercent: 2,
  lateFeeAfterDays: 30
};

const DuePaymentSettings: React.FC<DuePaymentSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<DuePaymentConfig>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem('due_payment_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse due payment settings', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: DuePaymentConfig) => {
    setSettings(newSettings);
    localStorage.setItem('due_payment_settings', JSON.stringify(newSettings));
    toast.success('Due payment settings saved');
  };

  const handleToggle = (key: keyof DuePaymentConfig, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleNumberChange = (key: keyof DuePaymentConfig, value: number) => {
    saveSettings({ ...settings, [key]: value });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Due Payment Settings</h1>
            <p className="text-sm text-muted-foreground">Configure credit and due payment rules</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Due Payment Rules
            </CardTitle>
            <CardDescription>Configure how due payments work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Due Payments</Label>
                <p className="text-sm text-muted-foreground">Allow customers to pay later</p>
              </div>
              <Switch
                checked={settings.enableDuePayments}
                onCheckedChange={(v) => handleToggle('enableDuePayments', v)}
              />
            </div>

            {settings.enableDuePayments && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maximum Due Amount (₹)</Label>
                    <Input
                      type="number"
                      value={settings.maxDueAmount}
                      onChange={(e) => handleNumberChange('maxDueAmount', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">Max credit limit per customer</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Due Days</Label>
                    <Input
                      type="number"
                      value={settings.maxDueDays}
                      onChange={(e) => handleNumberChange('maxDueDays', parseInt(e.target.value) || 7)}
                      min={1}
                      max={90}
                    />
                    <p className="text-xs text-muted-foreground">Days before payment is overdue</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Require Phone Number</Label>
                    <p className="text-sm text-muted-foreground">Phone is mandatory for due payments</p>
                  </div>
                  <Switch
                    checked={settings.requirePhoneForDue}
                    onCheckedChange={(v) => handleToggle('requirePhoneForDue', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Require Approval Above Limit</Label>
                    <p className="text-sm text-muted-foreground">Manager approval for large dues</p>
                  </div>
                  <Switch
                    checked={settings.requireApprovalAboveLimit}
                    onCheckedChange={(v) => handleToggle('requireApprovalAboveLimit', v)}
                  />
                </div>
                {settings.requireApprovalAboveLimit && (
                  <div className="space-y-2">
                    <Label>Approval Limit Amount (₹)</Label>
                    <Input
                      type="number"
                      value={settings.approvalLimitAmount}
                      onChange={(e) => handleNumberChange('approvalLimitAmount', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reminders & Blocking */}
        {settings.enableDuePayments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Reminders & Restrictions
              </CardTitle>
              <CardDescription>Configure payment reminders and blocking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Payment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Send reminder notifications</p>
                </div>
                <Switch
                  checked={settings.enableReminders}
                  onCheckedChange={(v) => handleToggle('enableReminders', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Block Orders on Overdue</Label>
                  <p className="text-sm text-muted-foreground">Prevent new orders for overdue customers</p>
                </div>
                <Switch
                  checked={settings.blockOrderOnOverdue}
                  onCheckedChange={(v) => handleToggle('blockOrderOnOverdue', v)}
                />
              </div>
              {settings.blockOrderOnOverdue && (
                <div className="space-y-2">
                  <Label>Block After Days Overdue</Label>
                  <Input
                    type="number"
                    value={settings.overdueBlockDays}
                    onChange={(e) => handleNumberChange('overdueBlockDays', parseInt(e.target.value) || 30)}
                    min={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Partial Payment & Late Fee */}
        {settings.enableDuePayments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Payment Options
              </CardTitle>
              <CardDescription>Configure partial payments and late fees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Partial Payment</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to pay in parts</p>
                </div>
                <Switch
                  checked={settings.enablePartialPayment}
                  onCheckedChange={(v) => handleToggle('enablePartialPayment', v)}
                />
              </div>
              {settings.enablePartialPayment && (
                <div className="space-y-2">
                  <Label>Minimum Partial Payment (%)</Label>
                  <Input
                    type="number"
                    value={settings.minPartialPaymentPercent}
                    onChange={(e) => handleNumberChange('minPartialPaymentPercent', parseInt(e.target.value) || 10)}
                    min={10}
                    max={100}
                  />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Late Fee</Label>
                  <p className="text-sm text-muted-foreground">Charge fee for overdue payments</p>
                </div>
                <Switch
                  checked={settings.enableLateFee}
                  onCheckedChange={(v) => handleToggle('enableLateFee', v)}
                />
              </div>
              {settings.enableLateFee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Late Fee Percentage (%)</Label>
                    <Input
                      type="number"
                      value={settings.lateFeePercent}
                      onChange={(e) => handleNumberChange('lateFeePercent', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apply After Days</Label>
                    <Input
                      type="number"
                      value={settings.lateFeeAfterDays}
                      onChange={(e) => handleNumberChange('lateFeeAfterDays', parseInt(e.target.value) || 30)}
                      min={1}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DuePaymentSettings;
