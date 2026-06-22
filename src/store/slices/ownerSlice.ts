import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

export interface OwnerRecord {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_user_id: string | null;
  approval_status: string | null;
  is_active: boolean | null;
  subscription_tier: string | null;
  suspended_at: string | null;
  created_at: string | null;
}

interface OwnerState {
  list: OwnerRecord[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  lastAction: string | null;
}

const initialState: OwnerState = {
  list: [],
  isLoading: false,
  isMutating: false,
  error: null,
  lastAction: null,
};

async function invokeFn<T = any>(name: string, body?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message || `${name} failed`);
  return data as T;
}

export const fetchOwners = createAsyncThunk('owner/fetchOwners', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, business_name, owner_name, owner_email, owner_user_id, approval_status, is_active, subscription_tier, suspended_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return rejectWithValue(error.message);
  return (data || []) as OwnerRecord[];
});

export interface CreateOwnerPayload {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
  subscription_tier?: string;
  staff_limit?: number;
  outlet_limit?: number;
}

export const createOwner = createAsyncThunk(
  'owner/createOwner',
  async (payload: CreateOwnerPayload, { rejectWithValue }) => {
    try {
      return await invokeFn('create-owner', payload);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateOwner = createAsyncThunk(
  'owner/updateOwner',
  async (payload: { id: string; updates: Partial<OwnerRecord> }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('customers')
      .update(payload.updates as any)
      .eq('id', payload.id)
      .select()
      .maybeSingle();
    if (error) return rejectWithValue(error.message);
    return data as OwnerRecord;
  }
);

export const suspendOwner = createAsyncThunk(
  'owner/suspendOwner',
  async (payload: { user_id: string; customer_id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('suspend-user', { ...payload, entity: 'owner' });
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const activateOwner = createAsyncThunk(
  'owner/activateOwner',
  async (payload: { user_id: string; customer_id: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('activate-user', { ...payload, entity: 'owner' });
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const approveOwner = createAsyncThunk(
  'owner/approveOwner',
  async (payload: { customer_id: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('approve-owner', payload);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const rejectOwner = createAsyncThunk(
  'owner/rejectOwner',
  async (payload: { customer_id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('reject-owner', payload);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const ownerSlice = createSlice({
  name: 'owner',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOwners.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchOwners.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload; });
    b.addCase(fetchOwners.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load owners';
    });

    const mutations = [createOwner, updateOwner, suspendOwner, activateOwner, approveOwner, rejectOwner];
    mutations.forEach((thunk) => {
      b.addCase(thunk.pending, (s) => { s.isMutating = true; s.error = null; s.lastAction = thunk.typePrefix; });
      b.addCase(thunk.fulfilled, (s) => { s.isMutating = false; });
      b.addCase(thunk.rejected, (s, a) => {
        s.isMutating = false;
        s.error = (a.payload as string) || a.error.message || 'Operation failed';
      });
    });
  },
});

export default ownerSlice.reducer;
