import { useState, useEffect, useCallback, useRef } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface SalesResetConfig {
  enabled: boolean;
  resetMode: 'hours' | 'daily';
  resetHours: number;
  resetTime: string; // HH:mm for daily mode
  lastResetTime: string | null;
  warningMinutes: number;
}

const DEFAULT_CONFIG: SalesResetConfig = {
  enabled: true,
  resetMode: 'daily',
  resetHours: 24,
  resetTime: '06:00',
  lastResetTime: null,
  warningMinutes: 30,
};

export const useSalesResetWarning = () => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [config, setConfig] = useState<SalesResetConfig>(DEFAULT_CONFIG);
  const [showWarning, setShowWarning] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [formattedResetTime, setFormattedResetTime] = useState('06:00 AM');
  const lastAlertDateRef = useRef<string>('');

  const formatTime12Hour = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = ((hours + 11) % 12) + 1;
    return `${hour12.toString().padStart(2, '0')}:${(minutes ?? 0).toString().padStart(2, '0')} ${period}`;
  }, []);

  const getAlertMinutes = useCallback(() => {
    const dedicated = getSetting<number>('sale_reset_alert_minutes_before');
    if (dedicated !== undefined && dedicated !== null) return Number(dedicated) || 30;

    const restaurantConfig = getSetting<Record<string, any>>('pos_restaurant_config', {});
    return Number(restaurantConfig?.saleResetAlertMinutes) || 30;
  }, [getSetting]);

  const getResetTime = useCallback((currentConfig: SalesResetConfig, now: Date) => {
    if (currentConfig.resetMode === 'daily') {
      const [hours, minutes] = currentConfig.resetTime.split(':').map(Number);
      const resetTime = new Date(now);
      resetTime.setHours(hours, minutes, 0, 0);

      // If today's reset time has already passed, schedule the next reset for tomorrow.
      // This prevents overdue popups from appearing for the rest of the day.
      if (resetTime.getTime() <= now.getTime()) {
        resetTime.setDate(resetTime.getDate() + 1);
      }

      return resetTime;
    }

    const lastReset = new Date(currentConfig.lastResetTime || now.toISOString());
    return new Date(lastReset.getTime() + currentConfig.resetHours * 60 * 60 * 1000);
  }, []);

  // Load config from store settings
  useEffect(() => {
    if (!isLoaded) return;

    const saved = getSetting<SalesResetConfig>('pos_sales_reset_config');
    if (saved) {
      const merged = { ...DEFAULT_CONFIG, ...saved, warningMinutes: getAlertMinutes() };

      // Auto-initialize lastResetTime if null
      if (!merged.lastResetTime) {
        merged.lastResetTime = new Date().toISOString();
        saveSetting('pos_sales_reset_config', merged);
        console.log('[SalesReset] Auto-initialized lastResetTime:', merged.lastResetTime);
      }

      setConfig(merged);
    } else {
      // No config saved at all — initialize with defaults
      const init = { ...DEFAULT_CONFIG, lastResetTime: new Date().toISOString() };
      saveSetting('pos_sales_reset_config', init);
      setConfig({ ...init, warningMinutes: getAlertMinutes() });
      console.log('[SalesReset] Initialized default config');
    }
  }, [isLoaded, getAlertMinutes, getSetting, saveSetting]);

  // Also sync warningMinutes when restaurant config changes
  useEffect(() => {
    if (!isLoaded) return;
    const mins = getAlertMinutes();
    if (mins !== config.warningMinutes) {
      setConfig(prev => ({ ...prev, warningMinutes: mins }));
    }
  }, [config.warningMinutes, getAlertMinutes, isLoaded]);

  // Timer check — runs every 30 seconds
  useEffect(() => {
    if (!config.enabled) return;

    const check = () => {
      const now = new Date();
      let nextConfig = config;

      if (!config.lastResetTime) {
        nextConfig = { ...config, lastResetTime: now.toISOString() };
        saveSetting('pos_sales_reset_config', nextConfig);
        setConfig(nextConfig);
        console.log('[SalesReset] Auto-initialized lastResetTime:', nextConfig.lastResetTime);
      }

      const resetTime = getResetTime(nextConfig, now);
      const alertMinutes = nextConfig.warningMinutes || 30;
      const alertTime = new Date(resetTime.getTime() - alertMinutes * 60 * 1000);
      const timeLeft = Math.max(0, resetTime.getTime() - now.getTime());
      const today = now.toDateString();
      const minutesLeft = Math.ceil(timeLeft / 60000);

      setFormattedResetTime(formatTime12Hour(`${resetTime.getHours().toString().padStart(2, '0')}:${resetTime.getMinutes().toString().padStart(2, '0')}`));
      setTimeUntilReset(minutesLeft <= 0 ? '0m' : minutesLeft >= 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft}m`);

      console.log('[SalesReset] Check:', {
        now: now.toLocaleTimeString(),
        resetTime: resetTime.toLocaleTimeString(),
        alertTime: alertTime.toLocaleTimeString(),
        timeLeftMin: minutesLeft,
        warningMinutes: alertMinutes,
        lastAlertDate: lastAlertDateRef.current,
        today,
        popupTriggered: now >= alertTime && lastAlertDateRef.current !== today,
      });

      if (now >= alertTime && lastAlertDateRef.current !== today) {
        console.log('[SalesReset] ⚠️ Triggering warning popup!');
        lastAlertDateRef.current = today;
        localStorage.setItem('pos_sales_reset_last_alert_date', today);
        setShowWarning(true);
      }
    };

    lastAlertDateRef.current = localStorage.getItem('pos_sales_reset_last_alert_date') || '';
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [config, formatTime12Hour, getResetTime, saveSetting]);

  const handleResetNow = useCallback(() => {
    localStorage.setItem('pos_orders', '[]');
    const updatedConfig = { ...config, lastResetTime: new Date().toISOString() };
    saveSetting('pos_sales_reset_config', updatedConfig);
    setConfig(updatedConfig);
    setShowWarning(false);
    window.location.reload();
  }, [config, saveSetting]);

  const handleExtendTime = useCallback((minutesToAdd: number = 30, manualTime?: string) => {
    const now = new Date();
    const currentReset = getResetTime(config, now);
    const extendedReset = manualTime
      ? (() => {
          const [hours, minutes] = manualTime.split(':').map(Number);
          const manualDate = new Date(now);
          manualDate.setHours(hours, minutes, 0, 0);
          return manualDate;
        })()
      : new Date(currentReset.getTime() + minutesToAdd * 60 * 1000);

    const updatedConfig = {
      ...config,
      resetTime: config.resetMode === 'daily'
        ? `${extendedReset.getHours().toString().padStart(2, '0')}:${extendedReset.getMinutes().toString().padStart(2, '0')}`
        : config.resetTime,
      lastResetTime: config.resetMode === 'hours'
        ? new Date(extendedReset.getTime() - config.resetHours * 60 * 60 * 1000).toISOString()
        : config.lastResetTime,
    };

    saveSetting('pos_sales_reset_config', updatedConfig);
    setConfig(updatedConfig);
    setShowWarning(false);
    console.log('[SalesReset] Extended reset time:', {
      currentTime: now.toLocaleTimeString(),
      resetTime: extendedReset.toLocaleTimeString(),
      minutesToAdd,
      manualTime,
    });
  }, [config, getResetTime, saveSetting]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    showWarning,
    timeUntilReset,
    formattedResetTime,
    config,
    handleResetNow,
    handleExtendTime,
    dismissWarning,
  };
};
