import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Bell, Save, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/contexts/LocaleContext';

interface SalesResetConfig {
  enabled: boolean;
  resetMode: 'hours' | 'daily';
  resetHours: number;
  resetTime: string; // HH:MM format for daily reset
  lastResetTime: string | null;
  warningMinutes: number;
}

const DEFAULT_CONFIG: SalesResetConfig = {
  enabled: true,
  resetMode: 'hours',
  resetHours: 24,
  resetTime: '06:00',
  lastResetTime: null,
  warningMinutes: 30
};

export const SalesResetSettings: React.FC = () => {
  const { t } = useLocale();
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [config, setConfig] = useState<SalesResetConfig>(DEFAULT_CONFIG);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<SalesResetConfig>('pos_sales_reset_config');
    if (saved) {
      setConfig({ ...DEFAULT_CONFIG, ...saved });
    }
  }, [isLoaded, getSetting]);

  useEffect(() => {
    if (!config.enabled) return;

    const checkResetTimer = () => {
      let resetTime: Date;
      const now = new Date();

      if (config.resetMode === 'daily') {
        // Calculate next reset time based on daily time
        const [hours, minutes] = config.resetTime.split(':').map(Number);
        resetTime = new Date(now);
        resetTime.setHours(hours, minutes, 0, 0);
        
        // If reset time has passed today, set to tomorrow
        if (resetTime <= now) {
          resetTime.setDate(resetTime.getDate() + 1);
        }
      } else {
        // Hours-based reset
        if (!config.lastResetTime) return;
        const lastReset = new Date(config.lastResetTime);
        resetTime = new Date(lastReset.getTime() + config.resetHours * 60 * 60 * 1000);
      }

      const timeLeft = resetTime.getTime() - now.getTime();

      if (timeLeft <= 0) {
        setShowResetWarning(true);
        return;
      }

      // Calculate time until reset
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilReset(`${hoursLeft}h ${minutesLeft}m`);

      // Show warning if within warning window
      const warningMs = config.warningMinutes * 60 * 1000;
      if (timeLeft <= warningMs && timeLeft > 0) {
        setShowResetWarning(true);
      }
    };

    checkResetTimer();
    const interval = setInterval(checkResetTimer, 60000);

    return () => clearInterval(interval);
  }, [config]);

  const saveConfig = () => {
    const updatedConfig = {
      ...config,
      lastResetTime: config.lastResetTime || new Date().toISOString()
    };
    saveSetting('pos_sales_reset_config', updatedConfig);
    setConfig(updatedConfig);
    toast.success(t('dialog.salesResetSettingsSaved'));
  };

  const handleResetNow = () => {
    localStorage.setItem('pos_orders', '[]');
    
    const updatedConfig = {
      ...config,
      lastResetTime: new Date().toISOString()
    };
    saveSetting('pos_sales_reset_config', updatedConfig);
    setConfig(updatedConfig);
    setShowResetWarning(false);
    toast.success(t('dialog.salesDataReset'));
    
    window.location.reload();
  };

  const handleExtendTime = () => {
    const newLastResetTime = new Date().toISOString();
    const updatedConfig = {
      ...config,
      lastResetTime: newLastResetTime
    };
    saveSetting('pos_sales_reset_config', updatedConfig);
    setConfig(updatedConfig);
    setShowResetWarning(false);
    toast.success(t('dialog.salesResetExtended'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{t('settings.salesResetTimer')}</h3>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
          <div>
            <Label className="font-medium">{t('settings.autoResetSales')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.autoResetSalesDesc')}
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        {/* Reset Mode */}
        <div className="p-4 rounded-xl border border-border">
          <Label className="font-medium flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4" />
            {t('settings.resetMode')}
          </Label>
          <Select 
            value={config.resetMode} 
            onValueChange={(value: 'hours' | 'daily') => setConfig({ ...config, resetMode: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">{t('settings.afterXHours')}</SelectItem>
              <SelectItem value="daily">{t('settings.dailyAtTime')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Hours - Show only for hours mode */}
        {config.resetMode === 'hours' && (
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              {t('settings.resetEveryHours')}
            </Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={config.resetHours}
              onChange={(e) => setConfig({ ...config, resetHours: Number(e.target.value) })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('settings.salesWillResetAfter')} {config.resetHours} {t('common.hours')} ({t('settings.maxHours')})
            </p>
          </div>
        )}

        {/* Reset Time - Show only for daily mode */}
        {config.resetMode === 'daily' && (
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              {t('settings.dailyResetTime')}
            </Label>
            <Input
              type="time"
              value={config.resetTime}
              onChange={(e) => setConfig({ ...config, resetTime: e.target.value })}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('settings.salesWillResetAt')} {config.resetTime}
            </p>
          </div>
        )}

        {/* Warning Time */}
        <div className="p-4 rounded-xl border border-border">
          <Label className="font-medium flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" />
            {t('settings.warningBeforeReset')}
          </Label>
          <Input
            type="number"
            min={5}
            max={120}
            value={config.warningMinutes}
            onChange={(e) => setConfig({ ...config, warningMinutes: Number(e.target.value) })}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t('settings.showPopupWarning')} {config.warningMinutes} {t('settings.minutesBeforeReset')}
          </p>
        </div>

        {/* Current Status */}
        {config.enabled && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium">{t('settings.currentStatus')}</p>
            {config.lastResetTime && (
              <p className="text-xs text-muted-foreground">
                {t('settings.lastReset')}: {new Date(config.lastResetTime).toLocaleString()}
              </p>
            )}
            {timeUntilReset && (
              <p className="text-sm text-primary font-medium mt-1">
                {t('settings.nextResetIn')}: {timeUntilReset}
              </p>
            )}
            {config.resetMode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.dailyResetAt')}: {config.resetTime}
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={saveConfig} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {t('common.saveSettings')}
        </Button>

        {/* Manual Reset Button */}
        <Button 
          variant="destructive" 
          onClick={() => setShowResetWarning(true)}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('settings.resetSalesNow')}
        </Button>
      </div>

      {/* Reset Warning Dialog */}
      <AlertDialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-warning" />
              {t('settings.salesResetTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.salesResetDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleExtendTime} className="flex-1">
              {t('settings.extendTime')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetNow}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.resetNow')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
