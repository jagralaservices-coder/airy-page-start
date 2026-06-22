import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

export interface StaffRow {
  id: string;
  user_id: string | null;
  store_id: string | null;
  customer_id: string | null;
  role: string;
  is_active: boolean;
  staff_code?: string | null;
  created_at?: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
  stores?: { name?: string | null; store_name?: string | null } | null;
}

interface StaffState {
  list: StaffRow[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: StaffState = { list: [], isLoading: false, isMutating: false, error: null };

async function invokeFn<T = any>(name: string, body?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message || `${name} failed`);
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const fetchStaff = createAsyncThunk(
  'staff/fetchStaff',
  async (filter: { store_id?: string; customer_id?: string } | undefined, { rejectWithValue }) => {
    let q = supabase
      .from('user_roles')
      .select('*, stores(name)')
      .in('role', ['staff', 'store_manager', 'cashier']);
    if (filter?.store_id) q = q.eq('store_id', filter.store_id);
    if (filter?.customer_id) q = q.eq('customer_id', filter.customer_id);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return rejectWithValue(error.message);

    const rows = (data || []) as any[];
    const ids = rows.map((r) => r.user_id).filter(Boolean);
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      rows.forEach((r) => { r.profiles = map.get(r.user_id) || null; });
    }
    return rows as StaffRow[];
  }
);

export const createStaff = createAsyncThunk(
  'staff/createStaff',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try { return await invokeFn('create-staff', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const updateStaff = createAsyncThunk(
  'staff/updateStaff',
  async (payload: { user_role_id: string; updates: Record<string, any> }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('user_roles')
      .update(payload.updates as any)
      .eq('id', payload.user_role_id)
      .select()
      .maybeSingle();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const suspendStaff = createAsyncThunk(
  'staff/suspendStaff',
  async (payload: { user_role_id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('suspend-user', {
        entity_type: 'staff',
        entity_id: payload.user_role_id,
        reason: payload.reason ?? 'Suspended by admin',
      });
    } catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const activateStaff = createAsyncThunk(
  'staff/activateStaff',
  async (payload: { user_role_id: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('activate-user', { entity_type: 'staff', entity_id: payload.user_role_id });
    } catch (e: any) { return rejectWithValue(e.message); }
  }
);

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStaff.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchStaff.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload; });
    b.addCase(fetchStaff.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load staff';
    });

    [createStaff, updateStaff, suspendStaff, activateStaff].forEach((thunk) => {
      b.addCase(thunk.pending, (s) => { s.isMutating = true; s.error = null; });
      b.addCase(thunk.fulfilled, (s) => { s.isMutating = false; });
      b.addCase(thunk.rejected, (s, a) => {
        s.isMutating = false;
        s.error = (a.payload as string) || a.error.message || 'Operation failed';
      });
    });
  },
});

export default staffSlice.reducer;
