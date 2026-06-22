import React, { useState, useEffect } from 'react';
import { Timer, QrCode, RefreshCw, Eye, Volume2, Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentSoundSettings } from './PaymentSoundSettings';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface PaymentUXConfig {
  autoCloseAfterPayment: boolean;
  autoCloseDelaySeconds: number;
  qrExpiryMinutes: number;
  autoRefreshExpiredQr: boolean;
  showCountdown: boolean;
  showGrossNet: 'gross' | 'net';
  businessDateResetTime: string;
}

const DEFAULT_CONFIG: PaymentUXConfig = {
  autoCloseAfterPayment: false,
  autoCloseDelaySeconds: 3,
  qrExpiryMinutes: 5,
  autoRefreshExpiredQr: true,
  showCountdown: true,
  showGrossNet: 'gross',
  businessDateResetTime: '06:00',
};

export const PaymentUXSettings: React.FC = () => {
  const { getSetting, saveSetting } = useStoreSettings();
  const { canAccess } = useSubscription();
  const hasQrOrders = canAccess('qrOrders');
  const [config, setConfig] = useState<PaymentUXConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await getSetting('payment_ux_settings');
        if (saved) setConfig({ ...DEFAULT_CONFIG, ...(saved as Partial<PaymentUXConfig>) });
      } catch {}
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('payment_ux_settings', config);
      toast.success('Payment UX settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const update = (partial: Partial<PaymentUXConfig>) => setConfig(prev => ({ ...prev, ...partial }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Payment UX Settings</h2>
      </div>

      {/* Auto-Close After Payment */}
      <div className="p-4 rounded-xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium flex items-center gap-2"><Timer className="w-4 h-4" /> Auto-Close After Payment</Label>
            <p className="text-sm text-muted-foreground">Automatically close payment dialog after success</p>
          </div>
          <Switch checked={config.autoCloseAfterPayment} onCheckedChange={v => update({ autoCloseAfterPayment: v })} />
        </div>
        {config.autoCloseAfterPayment && (
          <div className="flex items-center gap-2 pl-6">
            <Label className="text-sm">Delay (seconds):</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={config.autoCloseDelaySeconds}
              onChange={e => update({ autoCloseDelaySeconds: parseInt(e.target.value) || 3 })}
              className="w-20"
            />
          </div>
        )}
      </div>

      {/* QR Expiry Settings - Gold+ feature */}
      {hasQrOrders && (
      <div className="p-4 rounded-xl border border-border space-y-3">
        <Label className="font-medium flex items-center gap-2"><QrCode className="w-4 h-4" /> QR Code Settings</Label>
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-sm">QR Expiry (minutes)</Label>
            <Select value={config.qrExpiryMinutes.toString()} onValueChange={v => update({ qrExpiryMinutes: parseInt(v) })}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 min</SelectItem>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm flex items-center gap-2"><RefreshCw className="w-3 h-3" /> Auto-Refresh Expired QR</Label>
          </div>
          <Switch checked={config.autoRefreshExpiredQr} onCheckedChange={v => update({ autoRefreshExpiredQr: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm flex items-center gap-2"><Eye className="w-3 h-3" /> Show Countdown Timer</Label>
          </div>
          <Switch checked={config.showCountdown} onCheckedChange={v => update({ showCountdown: v })} />
        </div>
      </div>
      )}

      {/* Display Settings */}
      <div className="p-4 rounded-xl border border-border space-y-3">
        <Label className="font-medium">Display Preferences</Label>
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-sm">Show Amounts As</Label>
            <Select value={config.showGrossNet} onValueChange={(v: 'gross' | 'net') => update({ showGrossNet: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gross">Gross</SelectItem>
                <SelectItem value="net">Net</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Business Day Reset</Label>
            <Input
              type="time"
              value={config.businessDateResetTime}
              onChange={e => update({ businessDateResetTime: e.target.value })}
              className="w-28"
            />
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="p-4 rounded-xl border border-border">
        <PaymentSoundSettings />
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Payment Settings'}
      </Button>
    </div>
  );
};
