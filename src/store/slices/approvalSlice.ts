import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

export interface PendingCustomer {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
}
export interface PendingStore {
  id: string;
  store_name?: string | null;
  name?: string | null;
  created_at: string;
  customers?: { owner_name: string | null; business_name: string | null } | null;
}
export interface PendingStaff {
  id: string;
  user_id: string | null;
  role: string;
  created_at: string;
  stores?: { store_name?: string | null; name?: string | null } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface ApprovalState {
  owners: PendingCustomer[];
  stores: PendingStore[];
  staff: PendingStaff[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: ApprovalState = {
  owners: [], stores: [], staff: [],
  isLoading: false, isMutating: false, error: null,
};

async function invokeFn<T = any>(name: string, body?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message || `${name} failed`);
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const fetchPendingApprovals = createAsyncThunk(
  'approval/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const [c, st, sf] = await Promise.all([
        supabase.from('customers').select('id, business_name, owner_name, owner_email, created_at').eq('approval_status', 'pending'),
        supabase.from('stores').select('id, name, created_at, customers(owner_name, business_name)').eq('is_active', false),
        supabase.from('user_roles').select('id, user_id, role, created_at, stores(name)').eq('is_active', false).in('role', ['staff', 'store_manager']),
      ]);
      if (c.error) throw c.error;
      if (st.error) throw st.error;
      if (sf.error) throw sf.error;

      const staffRows = (sf.data || []) as any[];
      const userIds = staffRows.map((r) => r.user_id).filter(Boolean);
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const map = new Map((profs || []).map((p: any) => [p.id, p]));
        staffRows.forEach((r) => { r.profiles = map.get(r.user_id) || null; });
      }

      return {
        owners: (c.data || []) as unknown as PendingCustomer[],
        stores: (st.data || []) as unknown as PendingStore[],
        staff: staffRows as unknown as PendingStaff[],
      };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const approveOwner = createAsyncThunk(
  'approval/approveOwner',
  async (payload: { customer_id: string; owner_email?: string }, { rejectWithValue }) => {
    try { return await invokeFn('approve-owner', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);
export const rejectOwner = createAsyncThunk(
  'approval/rejectOwner',
  async (payload: { customer_id: string; reason?: string }, { rejectWithValue }) => {
    try { return await invokeFn('reject-owner', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);
export const approveStore = createAsyncThunk(
  'approval/approveStore',
  async (payload: { store_id: string }, { rejectWithValue }) => {
    try { return await invokeFn('approve-store', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);
export const rejectStore = createAsyncThunk(
  'approval/rejectStore',
  async (payload: { store_id: string; reason?: string }, { rejectWithValue }) => {
    try { return await invokeFn('reject-store', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);
export const approveStaff = createAsyncThunk(
  'approval/approveStaff',
  async (payload: { user_role_id: string }, { rejectWithValue }) => {
    try { return await invokeFn('approve-staff', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);
export const rejectStaff = createAsyncThunk(
  'approval/rejectStaff',
  async (payload: { user_role_id: string; reason?: string }, { rejectWithValue }) => {
    try { return await invokeFn('reject-staff', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);

const approvalSlice = createSlice({
  name: 'approval',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchPendingApprovals.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchPendingApprovals.fulfilled, (s, a) => {
      s.isLoading = false;
      s.owners = a.payload.owners;
      s.stores = a.payload.stores;
      s.staff = a.payload.staff;
    });
    b.addCase(fetchPendingApprovals.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load approvals';
    });

    [approveOwner, rejectOwner, approveStore, rejectStore, approveStaff, rejectStaff].forEach((thunk) => {
      b.addCase(thunk.pending, (s) => { s.isMutating = true; s.error = null; });
      b.addCase(thunk.fulfilled, (s) => { s.isMutating = false; });
      b.addCase(thunk.rejected, (s, a) => {
        s.isMutating = false;
        s.error = (a.payload as string) || a.error.message || 'Operation failed';
      });
    });
  },
});

export default approvalSlice.reducer;
