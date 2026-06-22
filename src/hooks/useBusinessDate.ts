import { useMemo } from 'react';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';

/**
 * Returns the current business date based on the configured reset time.
 * If current time is before the reset time, business date = yesterday.
 * E.g. resetTime = "06:00", current = 02:00 AM → business date = yesterday
 */
export function useBusinessDate() {
  const { settings, loaded } = usePaymentSettings();

  const businessDate = useMemo(() => {
    const now = new Date();
    const [resetHour, resetMin] = (settings.businessDateResetTime || '06:00').split(':').map(Number);
    
    const resetToday = new Date(now);
    resetToday.setHours(resetHour, resetMin, 0, 0);

    // If current time is before reset time, business date is yesterday
    if (now < resetToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    return now.toISOString().split('T')[0];
  }, [settings.businessDateResetTime, loaded]);

  return { businessDate, loaded };
}
