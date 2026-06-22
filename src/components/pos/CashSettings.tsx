import React, { useState } from 'react';
import { ArrowLeft, Wallet, PlusCircle, MinusCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashSettingsProps {
  onBack: () => void;
}

const CashSettings: React.FC<CashSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cash_settings');
    return saved ? JSON.parse(saved) : {
      enableCashWithdrawal: true,
      enableCashTopUp: true,
      requireApprovalWithdrawal: true,
      requireApprovalTopUp: false,
      maxWithdrawalLimit: 10000,
      maxTopUpLimit: 50000,
      dailyWithdrawalLimit: 50000,
      dailyTopUpLimit: 100000,
      trackCashFlow: true,
      allowNegativeBalance: false
    };
  });

  const handleSave = () => {
    localStorage.setItem('cash_settings', JSON.stringify(settings));
    toast.success('Cash settings saved successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Withdrawal & Cash Top-up Settings</h1>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Withdrawal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MinusCircle className="w-5 h-5 text-destructive" />
              Cash Withdrawal Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Cash Withdrawal</Label>
                <p className="text-sm text-muted-foreground">Allow staff to withdraw cash from register</p>
              </div>
              <Switch
                checked={settings.enableCashWithdrawal}
                onCheckedChange={(checked) => setSettings({ ...settings, enableCashWithdrawal: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval for Withdrawal</Label>
                <p className="text-sm text-muted-foreground">Manager approval needed for withdrawals</p>
              </div>
              <Switch
                checked={settings.requireApprovalWithdrawal}
                onCheckedChange={(checked) => setSettings({ ...settings, requireApprovalWithdrawal: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Max Single Withdrawal (₹)</Label>
                <Input
                  type="number"
                  value={settings.maxWithdrawalLimit}
                  onChange={(e) => setSettings({ ...settings, maxWithdrawalLimit: Number(e.target.value) })}
                  placeholder="10000"
                />
              </div>
              <div>
                <Label>Daily Withdrawal Limit (₹)</Label>
                <Input
                  type="number"
                  value={settings.dailyWithdrawalLimit}
                  onChange={(e) => setSettings({ ...settings, dailyWithdrawalLimit: Number(e.target.value) })}
                  placeholder="50000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top-up Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="w-5 h-5 text-success" />
              Cash Top-up Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Cash Top-up</Label>
                <p className="text-sm text-muted-foreground">Allow adding cash to register</p>
              </div>
              <Switch
                checked={settings.enableCashTopUp}
                onCheckedChange={(checked) => setSettings({ ...settings, enableCashTopUp: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval for Top-up</Label>
                <p className="text-sm text-muted-foreground">Manager approval needed for top-ups</p>
              </div>
              <Switch
                checked={settings.requireApprovalTopUp}
                onCheckedChange={(checked) => setSettings({ ...settings, requireApprovalTopUp: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Max Single Top-up (₹)</Label>
                <Input
                  type="number"
                  value={settings.maxTopUpLimit}
                  onChange={(e) => setSettings({ ...settings, maxTopUpLimit: Number(e.target.value) })}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>Daily Top-up Limit (₹)</Label>
                <Input
                  type="number"
                  value={settings.dailyTopUpLimit}
                  onChange={(e) => setSettings({ ...settings, dailyTopUpLimit: Number(e.target.value) })}
                  placeholder="100000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Cash Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-primary" />
              General Cash Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Track Cash Flow</Label>
                <p className="text-sm text-muted-foreground">Maintain detailed cash transaction log</p>
              </div>
              <Switch
                checked={settings.trackCashFlow}
                onCheckedChange={(checked) => setSettings({ ...settings, trackCashFlow: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Negative Balance</Label>
                <p className="text-sm text-muted-foreground">Allow register balance to go negative</p>
              </div>
              <Switch
                checked={settings.allowNegativeBalance}
                onCheckedChange={(checked) => setSettings({ ...settings, allowNegativeBalance: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashSettings;
