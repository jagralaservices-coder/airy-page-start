import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './SupabaseAuthContext';
import { toast } from 'sonner';

export type ImpersonationType = 'merchant' | 'store' | null;

interface ImpersonationState {
  type: ImpersonationType;
  id: string; // customer_id or store_id
  name: string;
}

interface ImpersonationContextProps {
  impersonationState: ImpersonationState | null;
  startImpersonation: (type: ImpersonationType, id: string, name: string) => Promise<void>;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextProps | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabaseAuth();
  const [impersonationState, setImpersonationState] = useState<ImpersonationState | null>(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pos_impersonation_state');
    if (savedState) {
      try {
        setImpersonationState(JSON.parse(savedState));
      } catch (e) {
        console.error("Failed to parse impersonation state", e);
      }
    }
  }, []);

  const logImpersonationStart = async (type: ImpersonationType, id: string) => {
    if (!user) return;
    try {
      if (type === 'merchant') {
        await supabase.from('merchant_access_logs').insert({
          admin_id: user.id,
          merchant_id: id,
          reason: 'Emergency Support/Impersonation',
          device: navigator.userAgent
        });
      } else if (type === 'store') {
        await supabase.from('store_access_logs').insert({
          admin_id: user.id,
          store_id: id,
          reason: 'Emergency Support/Impersonation',
          device: navigator.userAgent
        });
      }
      
      // Also write to audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'IMPERSONATE',
        table_name: type === 'merchant' ? 'customers' : 'stores',
        record_id: id,
        new_value: { status: 'started' },
        device: navigator.userAgent
      });
    } catch (err) {
      console.error("Failed to log impersonation", err);
    }
  };

  const logImpersonationStop = async (state: ImpersonationState) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'IMPERSONATE',
        table_name: state.type === 'merchant' ? 'customers' : 'stores',
        record_id: state.id,
        new_value: { status: 'stopped' },
        device: navigator.userAgent
      });
    } catch (err) {
      console.error("Failed to log impersonation stop", err);
    }
  }

  const startImpersonation = async (type: ImpersonationType, id: string, name: string) => {
    const newState: ImpersonationState = { type, id, name };
    setImpersonationState(newState);
    localStorage.setItem('pos_impersonation_state', JSON.stringify(newState));
    toast.success(`Started impersonating ${name}`);
    await logImpersonationStart(type, id);
    
    // Redirect logic handled by the caller (e.g., to /dashboard or /pos)
  };

  const stopImpersonation = () => {
    if (impersonationState) {
      logImpersonationStop(impersonationState);
    }
    setImpersonationState(null);
    localStorage.removeItem('pos_impersonation_state');
    toast.info("Stopped impersonation. Returning to Admin Dashboard.");
    window.location.href = '/admin/dashboard';
  };

  return (
    <ImpersonationContext.Provider value={{
      impersonationState,
      startImpersonation,
      stopImpersonation,
      isImpersonating: !!impersonationState
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};
