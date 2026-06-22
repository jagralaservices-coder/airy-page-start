import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityAction } from '@/lib/auditLogger';

export type UserRole = 'super_admin' | 'admin' | 'owner' | 'store_manager' | 'staff';

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  customer_id: string | null;
  merchant_id?: string | null;
  store_id: string | null;
  staff_code?: string | null;
  ref_code?: string | null;
  pin: string | null;
  is_active: boolean;
}

export interface CustomerData {
  id: string;
  business_name: string;
  owner_name: string;
  subscription_plan: string;
  subscription_tier: string;
  subscription_end: string;
  is_active: boolean;
  max_stores: number;
}

export interface StoreData {
  id: string;
  customer_id: string;
  store_name: string;
  address: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRoleData | null;
  customer: CustomerData | null;
  store: StoreData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error: string | null, data?: any }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isOwner: () => boolean;
  isStoreManager: () => boolean;
  isStaff: () => boolean;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRoleData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearRoleState = useCallback(() => {
    setUserRole(null);
    setCustomer(null);
    setStore(null);
  }, []);

  const clearLegacyLoginState = useCallback(() => {
    localStorage.removeItem('logged_in_staff');
    localStorage.removeItem('store_login');
    localStorage.removeItem('pos_store_session');
    localStorage.removeItem('pos_store_login_data');
    localStorage.removeItem('pos_active_store');
    localStorage.removeItem('pos_is_store_login');
    localStorage.removeItem('pos_store_code');
    localStorage.removeItem('pos_staff_session');
    localStorage.removeItem('pos_active_staff');
    localStorage.removeItem('pos_active_store_data');
  }, []);

  const fetchUserData = useCallback(async (userId: string, authUser?: User | null): Promise<UserRoleData | null> => {
    try {
      if (localStorage.getItem('pos_login_as_demo') === 'true') {
        const mockRole = {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          user_id: '11111111-1111-1111-1111-111111111111',
          role: 'owner' as UserRole,
          customer_id: '22222222-2222-2222-2222-222222222222',
          store_id: '33333333-3333-3333-3333-333333333333',
          is_active: true,
          pin: '1234'
        };
        setUserRole(mockRole);
        setCustomer({
          id: '22222222-2222-2222-2222-222222222222',
          business_name: 'MAXORA Bakery',
          owner_name: 'Mock Owner',
          subscription_plan: 'yearly',
          subscription_tier: 'premium',
          subscription_end: '2030-01-01',
          is_active: true,
          max_stores: 5
        });
        setStore({
          id: '33333333-3333-3333-3333-333333333333',
          customer_id: '22222222-2222-2222-2222-222222222222',
          store_name: 'Main Outlet',
          address: '123 Main St, Mumbai'
        });
        return mockRole;
      }

      // If we are offline, directly restore from cache backups
      if (!navigator.onLine) {
        console.log('[Auth] Offline: restoring user role and store from backup cache');
        const roleBackup = localStorage.getItem('pos_user_role_backup');
        const customerBackup = localStorage.getItem('pos_customer_backup');
        const storeBackup = localStorage.getItem('pos_store_backup');
        if (roleBackup) {
          try {
            const parsedRole = JSON.parse(roleBackup);
            setUserRole(parsedRole);
            if (customerBackup) setCustomer(JSON.parse(customerBackup));
            if (storeBackup) setStore(JSON.parse(storeBackup));
            return parsedRole;
          } catch (e) {
            console.error('[Auth] Failed to parse cached backups', e);
          }
        }
        return null;
      }

      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (roleError) {
        throw roleError;
      }

      const rolePriority: Record<string, number> = {
        super_admin: 0,
        admin: 1,
        owner: 2,
        store_manager: 3,
        staff: 4,
        cashier: 9,
      };
      const roleData = (roleRows || [])
        .slice()
        .sort((a: any, b: any) => (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99))[0];

      if (roleData) {
        const roleRecord = roleData as unknown as UserRoleData;
        setUserRole(roleRecord);
        localStorage.setItem('pos_user_role_backup', JSON.stringify(roleRecord));

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .maybeSingle();

        if (roleRecord.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', roleRecord.customer_id)
            .maybeSingle();
          
          if (!customerError && customerData) {
            setCustomer(customerData as unknown as CustomerData);
            localStorage.setItem('pos_customer_backup', JSON.stringify(customerData));
          } else {
            setCustomer(null);
          }
        } else {
          setCustomer(null);
        }

        if (roleRecord.store_id) {
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('id, merchant_id, name, address, phone, email, business_type, country, currency_code, tax_type, tax_percentage, is_active, created_at, updated_at')
            .eq('id', roleRecord.store_id)
            .maybeSingle();
          
          if (!storeError && storeData) {
            const normalizedStore = {
              ...storeData,
              customer_id: (storeData as any).merchant_id,
              store_name: (storeData as any).name,
              store_code: (storeData as any).id?.slice(0, 8).toUpperCase(),
            };
            setStore(normalizedStore as unknown as StoreData);
            localStorage.setItem('pos_store_backup', JSON.stringify(normalizedStore));
            if (roleRecord.role === 'store_manager' || roleRecord.role === 'staff') {
              const generatedStoreCode = (storeData as any).id?.slice(0, 8).toUpperCase();
              localStorage.setItem('pos_active_store', storeData.id);
              localStorage.setItem('pos_store_code', generatedStoreCode);
              localStorage.setItem('pos_active_store_data', JSON.stringify({
                id: storeData.id,
                storeId: storeData.id,
                storeName: (storeData as any).name,
                storeAddress: storeData.address,
                storePhone: storeData.phone,
                customerId: (storeData as any).merchant_id,
                merchant_id: (storeData as any).merchant_id,
                storeCode: generatedStoreCode,
                store_code: generatedStoreCode,
                subscription_tier: 'basic',
                business_type: (storeData as any).business_type || 'restaurant',
              }));
            }

            if (roleRecord.role === 'staff') {
              localStorage.setItem('pos_staff_session', JSON.stringify({
                id: userId,
                user_id: userId,
                name: profileData?.full_name || authUser?.user_metadata?.full_name || authUser?.email || 'Staff',
                email: profileData?.email || authUser?.email || null,
                role: roleRecord.role,
                store_id: storeData.id,
                customer_id: (storeData as any).merchant_id,
                merchant_id: (storeData as any).merchant_id,
                staff_code: roleRecord.staff_code || null,
              }));
            } else {
              localStorage.removeItem('pos_staff_session');
            }
          } else {
            setStore(null);
            localStorage.removeItem('pos_active_store_data');
            localStorage.removeItem('pos_staff_session');
          }
        } else {
          setStore(null);
          localStorage.removeItem('pos_active_store_data');
          localStorage.removeItem('pos_staff_session');
        }

        return roleRecord;
      } else {
        clearRoleState();
        return null;
      }
    } catch (error: unknown) {
      console.warn('[Auth] Failed to fetch user role, checking cached backups:', error);
      
      const roleBackup = localStorage.getItem('pos_user_role_backup');
      const customerBackup = localStorage.getItem('pos_customer_backup');
      const storeBackup = localStorage.getItem('pos_store_backup');
      
      if (roleBackup) {
        try {
          const parsedRole = JSON.parse(roleBackup);
          setUserRole(parsedRole);
          if (customerBackup) setCustomer(JSON.parse(customerBackup));
          if (storeBackup) setStore(JSON.parse(storeBackup));
          return parsedRole;
        } catch (e) {
          console.error('[Auth] Failed to parse cached role backup', e);
        }
      }

      clearRoleState();
      return null;
    }
  }, [clearRoleState]);

  useEffect(() => {
    let isMounted = true;

    if (localStorage.getItem('pos_login_as_demo') === 'true') {
      setUser({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'owner@MAXORA.com',
        user_metadata: { full_name: 'Mock Owner' }
      } as any);
      setSession({
        access_token: 'mock-token',
        user: { id: '11111111-1111-1111-1111-111111111111', email: 'owner@MAXORA.com' }
      } as any);
      setUserRole({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: '11111111-1111-1111-1111-111111111111',
        role: 'owner',
        customer_id: '22222222-2222-2222-2222-222222222222',
        store_id: '33333333-3333-3333-3333-333333333333',
        is_active: true,
        pin: '1234'
      });
      setCustomer({
        id: '22222222-2222-2222-2222-222222222222',
        business_name: 'MAXORA Bakery',
        owner_name: 'Mock Owner',
        subscription_plan: 'yearly',
        subscription_tier: 'premium',
        subscription_end: '2030-01-01',
        is_active: true,
        max_stores: 5
      });
      setStore({
        id: '33333333-3333-3333-3333-333333333333',
        customer_id: '22222222-2222-2222-2222-222222222222',
        store_name: 'Main Outlet',
        address: '123 Main St, Mumbai'
      });
      setIsLoading(false);
      return;
    }

    const isSessionExpired = (s: Session | null | undefined): boolean => {
      if (!s) return true;
      const expiresAt = (s as any).expires_at as number | undefined; // seconds since epoch
      if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
        // No expiry info — treat as fresh; supabase client will refresh as needed
        return false;
      }
      // 30s safety window so we don't restore a token about to die
      return expiresAt * 1000 <= Date.now() + 30_000;
    };

    const dropSessionBackups = () => {
      localStorage.removeItem('pos_session_backup');
      localStorage.removeItem('pos_user_backup');
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      let finalSession = nextSession;
      let finalUser = nextSession?.user ?? null;

      const sessionActive = localStorage.getItem('pos_session_active') === 'true';

      if (localStorage.getItem('pos_login_as_demo') === 'true') {
        finalSession = {
          access_token: 'mock-token',
          user: { id: '11111111-1111-1111-1111-111111111111', email: 'owner@MAXORA.com' }
        } as any;
        finalUser = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'owner@MAXORA.com',
          user_metadata: { full_name: 'Mock Owner' }
        } as any;
      } else if (!finalSession) {
        // If there's a cached session backup, restore it to prevent automatic logout when offline or refreshing
        const sessionBackupStr = localStorage.getItem('pos_session_backup');
        const userBackupStr = localStorage.getItem('pos_user_backup');
        if (sessionBackupStr && userBackupStr && (sessionActive || localStorage.getItem('pos_login_as_demo') === 'true')) {
          try {
            const cached: Session = JSON.parse(sessionBackupStr);
            if (isSessionExpired(cached)) {
              // Expired cached token — discard, do not restore (prevents silent 401 loops)
              console.warn('[Auth] Cached session expired — clearing backup, requiring re-auth');
              dropSessionBackups();
              localStorage.removeItem('pos_session_active');
            } else {
              console.log('[Auth] Restoring session from backup cache (preserves login)');
              finalSession = cached;
              finalUser = JSON.parse(userBackupStr);
            }
          } catch (e) {
            console.error('[Auth] Failed to parse session backup', e);
            dropSessionBackups();
          }
        }
      } else {
        // Cache backup copies of session/user when loaded successfully (only if not expired)
        if (!isSessionExpired(finalSession)) {
          try {
            localStorage.setItem('pos_session_backup', JSON.stringify(finalSession));
            localStorage.setItem('pos_user_backup', JSON.stringify(finalUser));
          } catch (e) {
            console.error('[Auth] Failed to cache session backup', e);
          }
        } else {
          dropSessionBackups();
        }
      }

      setSession(finalSession);
      setUser(finalUser);

      if (!finalUser) {
        clearRoleState();
        setIsLoading(false);
        return;
      }

      window.setTimeout(() => {
        void fetchUserData(finalUser.id, finalUser).finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[Auth] PASSWORD_RECOVERY event received');
          localStorage.setItem('is_password_recovery', 'true');
          if (window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password';
          }
          return;
        }

        const sessionActive = localStorage.getItem('pos_session_active') === 'true';
        if (event === 'SIGNED_OUT' && (sessionActive || localStorage.getItem('pos_login_as_demo') === 'true')) {
          console.log('[Auth] Prevented automatic sign out event');
          // Intercept SIGNED_OUT and don't clear session if it should be active
          return;
        }

        if (localStorage.getItem('pos_is_signing_up_staff') === 'true') {
          console.log('[Auth] Ignored auth change during background staff signup');
          return;
        }

        applySession(nextSession);
      }
    );

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Do NOT force sign-out on transient refresh errors — keep user logged in.
        console.warn('[Auth] getSession warning (keeping session):', error.message);
        
        // If there's a transient error, try to restore from backup instead of passing null session
        const sessionActive = localStorage.getItem('pos_session_active') === 'true';
        if (sessionActive) {
          const sessionBackupStr = localStorage.getItem('pos_session_backup');
          if (sessionBackupStr) {
            try {
              const cachedSession = JSON.parse(sessionBackupStr);
              if (isSessionExpired(cachedSession)) {
                console.warn('[Auth] getSession error and cached session expired — signing out cleanly');
                dropSessionBackups();
                localStorage.removeItem('pos_session_active');
                applySession(null);
                return;
              }
              applySession(cachedSession);
              return;
            } catch (e) {
              console.error('[Auth] Failed to parse backup session during error', e);
            }
          }
        }
      }
      applySession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearRoleState, fetchUserData]);

  const loginAsDemo = () => {
    localStorage.setItem('pos_login_as_demo', 'true');
    localStorage.setItem('pos_session_active', 'true');
    setUser({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'owner@MAXORA.com',
      user_metadata: { full_name: 'Mock Owner' }
    } as any);
    setSession({
      access_token: 'mock-token',
      user: { id: '11111111-1111-1111-1111-111111111111', email: 'owner@MAXORA.com' }
    } as any);
    setUserRole({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_id: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
      customer_id: '22222222-2222-2222-2222-222222222222',
      store_id: '33333333-3333-3333-3333-333333333333',
      is_active: true,
      pin: '1234'
    });
    setCustomer({
      id: '22222222-2222-2222-2222-222222222222',
      business_name: 'MAXORA Bakery',
      owner_name: 'Mock Owner',
      subscription_plan: 'yearly',
      subscription_tier: 'premium',
      subscription_end: '2030-01-01',
      is_active: true,
      max_stores: 5
    });
    setStore({
      id: '33333333-3333-3333-3333-333333333333',
      customer_id: '22222222-2222-2222-2222-222222222222',
      store_name: 'Main Outlet',
      address: '123 St, Mumbai'
    });
    
    // Ensure localStorage has the items needed
    localStorage.setItem('permissions_requested', 'true');
    localStorage.setItem('pos_active_store', '33333333-3333-3333-3333-333333333333');
    localStorage.setItem('pos_active_store_data', JSON.stringify({
      id: '33333333-3333-3333-3333-333333333333',
      storeId: '33333333-3333-3333-3333-333333333333',
      storeName: 'Main Outlet',
      storeAddress: '123 St, Mumbai',
      storePhone: '+91 98765 43210',
      customerId: '22222222-2222-2222-2222-222222222222',
      storeCode: '12345678'
    }));
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      // Clear all cached backup session data before logging in
      localStorage.removeItem('pos_session_backup');
      localStorage.removeItem('pos_user_backup');
      localStorage.removeItem('pos_user_role_backup');
      localStorage.removeItem('pos_customer_backup');
      localStorage.removeItem('pos_store_backup');

      clearLegacyLoginState();

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please try again.' };
        }
        return { error: error.message };
      }

      if (!authData.user) {
        return { error: 'Login failed. Please try again.' };
      }

      const roleRecord = await fetchUserData(authData.user.id, authData.user);

      if (!roleRecord) {
        await supabase.auth.signOut();
        return { error: 'No active account found for this email. Please contact admin.' };
      }

      if (!roleRecord.is_active) {
        await supabase.auth.signOut();
        return { error: 'Your account has been suspended. Please contact the administrator.' };
      }

      if ((roleRecord.role === 'store_manager' || roleRecord.role === 'staff') && !roleRecord.store_id) {
        await supabase.auth.signOut();
        clearRoleState();
        return { error: 'This account is not linked to any store.' };
      }

      logSecurityAction('LOGIN', 'profiles', authData.user.id);
      localStorage.setItem('pos_session_active', 'true');
      return { error: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { error: message || 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<{ error: string | null, data?: any }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Save current session
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;
      
      try {
        if (currentSession) {
          localStorage.setItem('pos_is_signing_up_staff', 'true');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            }
          }
        });

        // Restore session if we had one (to prevent auto-login kicking out the admin)
        if (currentSession) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          });
        }

        if (error) {
        if (error.message.includes('already registered')) {
          return { error: 'This email is already registered. Please login instead.' };
        }
        return { error: error.message };
      }

        return { error: null, data };
      } finally {
        localStorage.removeItem('pos_is_signing_up_staff');
      }
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logSecurityAction('LOGOUT', 'profiles', user.id);
      }
    } catch (e) {
      console.error('Failed to log logout action:', e);
    }

    localStorage.removeItem('pos_login_as_demo');
    localStorage.removeItem('pos_session_active');
    // Clear all cached backups on explicit logout
    localStorage.removeItem('pos_session_backup');
    localStorage.removeItem('pos_user_backup');
    localStorage.removeItem('pos_user_role_backup');
    localStorage.removeItem('pos_customer_backup');
    localStorage.removeItem('pos_store_backup');
    // Clear permission cache so the next user doesn't inherit features
    localStorage.removeItem('maxora.features.v1');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    clearLegacyLoginState();
    clearRoleState();
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole.role);
  };

  const isSuperAdmin = () => {
    return hasRole(['super_admin']);
  };
  const isAdmin = () => hasRole(['admin', 'super_admin']);
  const isOwner = () => hasRole(['owner']);
  const isStoreManager = () => hasRole(['store_manager']);
  const isStaff = () => hasRole(['staff']);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      customer,
      store,
      isLoading,
      isAuthenticated: !!user && !!session,
      login,
      signup,
      logout,
      resetPassword,
      hasRole,
      isSuperAdmin,
      isAdmin,
      isOwner,
      isStoreManager,
      isStaff,
      loginAsDemo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
