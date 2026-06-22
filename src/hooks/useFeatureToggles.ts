import { useState, useEffect, useCallback } from 'react';

export interface FeatureToggles {
  tableEnabled: boolean;
  kotEnabled: boolean;
  deliveryEnabled: boolean;
  takeawayEnabled: boolean;
  dineInEnabled: boolean;
  billingMode: 'restaurant' | 'general';
}

const DEFAULT_TOGGLES: FeatureToggles = {
  tableEnabled: true,
  kotEnabled: true,
  deliveryEnabled: true,
  takeawayEnabled: true,
  dineInEnabled: true,
  billingMode: 'restaurant',
};

const STORAGE_KEY = 'pos_feature_toggles';

export function useFeatureToggles() {
  const [toggles, setToggles] = useState<FeatureToggles>(DEFAULT_TOGGLES);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setToggles({ ...DEFAULT_TOGGLES, ...JSON.parse(saved) });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) load();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [load]);

  const saveToggles = useCallback((updated: FeatureToggles) => {
    setToggles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  const updateToggle = useCallback((key: keyof FeatureToggles, value: any) => {
    setToggles(prev => {
      const updated = { ...prev, [key]: value };
      // Auto-disable restaurant-only features in general mode
      if (key === 'billingMode' && value === 'general') {
        updated.kotEnabled = false;
        updated.tableEnabled = false;
        // Keep takeaway and dine-in enabled for general store
        updated.takeawayEnabled = true;
        updated.dineInEnabled = true;
        // Delivery stays as user configured (optional addon)
      }
      if (key === 'billingMode' && value === 'restaurant') {
        updated.kotEnabled = true;
        updated.tableEnabled = true;
        updated.dineInEnabled = true;
        updated.takeawayEnabled = true;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
      return updated;
    });
  }, []);

  return { toggles, loaded, updateToggle, saveToggles };
}
