import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'owner' | 'store_manager' | 'staff' | 'cashier';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  customerId: string | null;
  storeId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  role: null,
  customerId: null,
  storeId: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
    if (error) return rejectWithValue(error.message);
    return { user: data.user, session: data.session };
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await supabase.auth.signOut();
  return true;
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) return { user: null, session: null, role: null, customerId: null, storeId: null };

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role, customer_id, store_id, is_active')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (error) return rejectWithValue(error.message);

    const priority: Record<string, number> = {
      super_admin: 0, admin: 1, owner: 2, store_manager: 3, staff: 4, cashier: 9,
    };
    const top = (roles || []).slice().sort(
      (a: any, b: any) => (priority[a.role] ?? 99) - (priority[b.role] ?? 99)
    )[0];

    return {
      user: session.user,
      session,
      role: (top?.role as AppRole) ?? null,
      customerId: top?.customer_id ?? null,
      storeId: top?.store_id ?? null,
    };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ user: User | null; session: Session | null }>) {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.isAuthenticated = !!action.payload.user;
    },
    setRole(
      state,
      action: PayloadAction<{ role: AppRole | null; customerId: string | null; storeId: string | null }>
    ) {
      state.role = action.payload.role;
      state.customerId = action.payload.customerId;
      state.storeId = action.payload.storeId;
    },
    clearAuth(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(login.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.session = a.payload.session;
      s.isAuthenticated = !!a.payload.user;
    });
    b.addCase(login.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Login failed';
    });
    b.addCase(logout.fulfilled, () => initialState);
    b.addCase(fetchCurrentUser.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchCurrentUser.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.session = a.payload.session;
      s.role = a.payload.role;
      s.customerId = a.payload.customerId;
      s.storeId = a.payload.storeId;
      s.isAuthenticated = !!a.payload.user;
    });
    b.addCase(fetchCurrentUser.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load user';
    });
  },
});

export const { setSession, setRole, clearAuth } = authSlice.actions;
export default authSlice.reducer;
