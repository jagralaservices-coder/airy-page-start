import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized hook for reading/writing store settings.
 *
 * - Owner/Admin login: read/write directly via DB (RLS)
 * - Store/Staff (store-code) login: proxy through backend function (sync-store-data)
 *
 * Always mirrors to localStorage for offline fallback.
 */
export function useStoreSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const getStoreId = useCallback((): string | null => {
    const ownerSelected = localStorage.getItem('owner_selected_store_id');
    if (ownerSelected) return ownerSelected;

    try {
      const activeStore = localStorage.getItem('pos_active_store');
      if (activeStore) {
        const parsed = JSON.parse(activeStore);
        if (parsed) return parsed;
      }
    } catch {}

    const storeId = localStorage.getItem('pos_store_id');
    if (storeId) return storeId;

    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      try {
        return JSON.parse(storeData).id || null;
      } catch {
        return null;
      }
    }

    const storeLogin = localStorage.getItem('store_login');
    if (storeLogin) {
      try {
        return JSON.parse(storeLogin).store_id || null;
      } catch {
        return null;
      }
    }

    return null;
  }, []);

  const getStoreCode = useCallback((): string | null => {
    const direct = localStorage.getItem('pos_store_code');
    if (direct) return direct;

    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) {
      try {
        const parsed = JSON.parse(storeData);
        return parsed?.storeCode || parsed?.store_code || null;
      } catch {
        return null;
      }
    }

    const storeLogin = localStorage.getItem('pos_store_login_data');
    if (storeLogin) {
      try {
        const parsed = JSON.parse(storeLogin);
        return parsed?.store_code || null;
      } catch {
        return null;
      }
    }

    return null;
  }, []);

  const hasJwtSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      return !!data.session?.access_token;
    } catch {
      return false;
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    const localKeys = [
      'displaySettings',
      'pos_kot_settings',
      'printers_config',
      'pos_bill_config',
      'pos_sales_reset_config',
      'pos_restaurant_config',
      'pos_settings_notifications',
      'pos_settings_security',
      'pos_settings_printer',
      'pos_settings_billing',
      'billingSystemSettings',
    ];

    const loaded: Record<string, any> = {};
    localKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          loaded[key] = JSON.parse(val);
        } catch {
          loaded[key] = val;
        }
      }
    });

    setSettings(loaded);
  }, []);

  const fetchViaFunction = useCallback(async () => {
    const store_id = getStoreId();
    if (!store_id) return null;

    const store_code = getStoreCode();

    const { data, error } = await supabase.functions.invoke('sync-store-data', {
      body: {
        action: 'fetch',
        store_id,
        store_code,
        data_type: 'settings',
      },
    });

    if (error) {
      console.error('[useStoreSettings] Function fetch failed:', error);
      return null;
    }

    const rows = (data as any)?.items || [];
    const out: Record<string, any> = {};
    rows.forEach((r: any) => {
      if (r?.setting_key) out[r.setting_key] = r.setting_value;
    });

    return out;
  }, [getStoreId, getStoreCode]);

  const saveViaFunction = useCallback(async (key: string, value: any) => {
    const store_id = getStoreId();
    if (!store_id) return;

    const store_code = getStoreCode();

    const { error } = await supabase.functions.invoke('sync-store-data', {
      body: {
        action: 'save',
        store_id,
        store_code,
        data_type: 'settings',
        settings: { [key]: value },
      },
    });

    if (error) {
      console.error('[useStoreSettings] Function save failed:', error);
    }
  }, [getStoreId, getStoreCode]);

  // Load all settings for current store
  const loadSettings = useCallback(async () => {
    const storeId = getStoreId();
    if (!storeId) {
      setIsLoaded(true);
      return;
    }

    try {
      // If offline, go straight to localStorage
      if (!navigator.onLine) {
        loadFromLocalStorage();
        return;
      }

      const jwt = await hasJwtSession();

      // Path A: JWT user (owner/admin/staff logged in)
      if (jwt) {
        const { data, error } = await supabase
          .from('store_settings')
          .select('setting_key, setting_value')
          .eq('store_id', storeId);

        if (error) {
          console.error('Failed to load store settings from DB:', error);
          loadFromLocalStorage();
          return;
        }

        const dbSettings: Record<string, any> = {};
        data?.forEach((row) => {
          dbSettings[row.setting_key] = row.setting_value;
        });

        // Fallback to localStorage for any missing keys
        const localKeys = [
          'displaySettings',
          'pos_kot_settings',
          'printers_config',
          'pos_bill_config',
          'pos_sales_reset_config',
          'pos_restaurant_config',
          'pos_settings_notifications',
          'pos_settings_security',
          'pos_settings_printer',
          'pos_settings_billing',
          'billingSystemSettings',
        ];

        localKeys.forEach((key) => {
          if (dbSettings[key] === undefined) {
            const local = localStorage.getItem(key);
            if (local) {
              try {
                dbSettings[key] = JSON.parse(local);
              } catch {
                dbSettings[key] = local;
              }
            }
          }
        });

        setSettings(dbSettings);
        return;
      }

      // Path B: store-code session (no JWT)
      const fnSettings = await fetchViaFunction();
      if (fnSettings) {
        const merged = { ...fnSettings };
        Object.keys(settings || {}).forEach((k) => {
          if (merged[k] === undefined) merged[k] = (settings as any)[k];
        });
        setSettings(merged);
        return;
      }

      // Function failure fallback
      loadFromLocalStorage();
    } catch (err) {
      console.error('Error loading settings:', err);
      loadFromLocalStorage();
    } finally {
      setIsLoaded(true);
    }
  }, [getStoreId, hasJwtSession, fetchViaFunction, loadFromLocalStorage, settings]);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSetting = useCallback(
    <T = any,>(key: string, defaultValue?: T): T => {
      return (settings[key] ?? defaultValue ?? (undefined as any)) as T;
    },
    [settings]
  );

  const saveSetting = useCallback(
    async (key: string, value: any) => {
      const storeId = getStoreId();

      // Always update localStorage as fallback
      localStorage.setItem(key, JSON.stringify(value));

      // Update local state
      setSettings((prev) => ({ ...prev, [key]: value }));

      // Dispatch storage event for cross-component reactivity
      window.dispatchEvent(new StorageEvent('storage', { key }));

      if (!storeId) return;

      // If offline, stop here
      if (!navigator.onLine) return;

      const jwt = await hasJwtSession();

      // JWT path (DB)
      if (jwt) {
        const { error } = await supabase
          .from('store_settings')
          .upsert(
            {
              store_id: storeId,
              setting_key: key,
              setting_value: value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'store_id,setting_key' }
          );

        if (error) {
          console.error('Failed to save setting to DB:', error);
        }
        return;
      }

      // Store-code path (function)
      await saveViaFunction(key, value);
    },
    [getStoreId, hasJwtSession, saveViaFunction]
  );

  return {
    settings,
    getSetting,
    saveSetting,
    isLoaded,
    reloadSettings: loadSettings,
  };
}

