import { supabase } from '@/integrations/supabase/client';

/**
 * Log a security or data mutation action in the Supabase audit logs table.
 * Resolves the active store and its code automatically and pushes via Edge Function.
 */
export const logSecurityAction = async (
  action: string,
  tableName?: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) => {
  if (localStorage.getItem('pos_login_as_demo') === 'true') {
    console.log('[AuditLog Simulated]', { action, tableName, recordId, oldData, newData });
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Retrieve active store ID and code from localStorage
    const getStoreId = (): string | null => {
      try {
        const storeData = localStorage.getItem('pos_active_store_data');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          if (parsed?.id) return parsed.id;
          if (parsed?.storeId) return parsed.storeId;
        }
      } catch {}
      const activeStore = localStorage.getItem('pos_active_store');
      if (activeStore) {
        try { return JSON.parse(activeStore); } catch {}
      }
      return null;
    };

    const getStoreCode = (): string | null => {
      const direct = localStorage.getItem('pos_store_code');
      if (direct) return direct;
      try {
        const storeData = localStorage.getItem('pos_active_store_data');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          return parsed.storeCode || parsed.store_code || null;
        }
      } catch {}
      return null;
    };

    const storeId = getStoreId();
    const storeCode = getStoreCode();

    if (!storeId) {
      console.warn('[AuditLog] Bypassed log write: No active store_id resolved.');
      return;
    }

    // Skip when there is neither an authenticated user nor a store code
    // (e.g. after logout) — the edge function will reject with 401.
    if (!user && !storeCode) {
      return;
    }

    const logPayload = {
      userId: user?.id || null,
      action,
      tableName: tableName || null,
      recordId: recordId || null,
      oldData: oldData ? (typeof oldData === 'object' ? oldData : { value: oldData }) : null,
      newData: newData ? (typeof newData === 'object' ? newData : { value: newData }) : null,
      userAgent: navigator.userAgent
    };

    const { error } = await supabase.functions.invoke('sync-store-data', {
      body: {
        action: 'save',
        store_id: storeId,
        store_code: storeCode || undefined,
        data_type: 'audit_log',
        log: logPayload
      }
    });

    if (error) {
      console.error('[AuditLog] Edge Function call error:', error);
    }
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err);
  }
};
