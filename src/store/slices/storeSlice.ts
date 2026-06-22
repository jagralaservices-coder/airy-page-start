import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

export interface StoreRow {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  merchant_id: string | null;
  customer_id: string | null;
  owner_id: string | null;
  merchants?: { business_name: string } | null;
  customers?: { business_name: string | null; owner_name: string | null; owner_email: string | null } | null;
  created_at?: string | null;
}

interface StoreState {
  list: StoreRow[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: StoreState = { list: [], isLoading: false, isMutating: false, error: null };

async function invokeFn<T = any>(name: string, body?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message || `${name} failed`);
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const fetchStores = createAsyncThunk('store/fetchStores', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase
    .from('stores')
    .select(
      'id, name, city, is_active, merchant_id, customer_id, owner_id, created_at, merchants(business_name), customers(business_name, owner_name, owner_email)'
    )
    .order('created_at', { ascending: false });
  if (error) return rejectWithValue(error.message);
  return (data || []) as unknown as StoreRow[];
});

export const createStore = createAsyncThunk(
  'store/createStore',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try { return await invokeFn('create-store', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const updateStore = createAsyncThunk(
  'store/updateStore',
  async (payload: { store_id: string; updates: Record<string, any> }, { rejectWithValue }) => {
    try { return await invokeFn('update-store', payload); }
    catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const suspendStore = createAsyncThunk(
  'store/suspendStore',
  async (payload: { store_id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('suspend-user', {
        entity_type: 'store',
        entity_id: payload.store_id,
        reason: payload.reason ?? 'Suspended by admin',
      });
    } catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const activateStore = createAsyncThunk(
  'store/activateStore',
  async (payload: { store_id: string }, { rejectWithValue }) => {
    try {
      return await invokeFn('activate-user', { entity_type: 'store', entity_id: payload.store_id });
    } catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const deleteStore = createAsyncThunk(
  'store/deleteStore',
  async (payload: { store_id: string }, { rejectWithValue }) => {
    const { error } = await supabase.from('stores').delete().eq('id', payload.store_id);
    if (error) return rejectWithValue(error.message);
    return payload.store_id;
  }
);

const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStores.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchStores.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload; });
    b.addCase(fetchStores.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load stores';
    });

    b.addCase(deleteStore.fulfilled, (s, a) => {
      s.list = s.list.filter((r) => r.id !== a.payload);
    });

    [createStore, updateStore, suspendStore, activateStore].forEach((thunk) => {
      b.addCase(thunk.pending, (s) => { s.isMutating = true; s.error = null; });
      b.addCase(thunk.fulfilled, (s) => { s.isMutating = false; });
      b.addCase(thunk.rejected, (s, a) => {
        s.isMutating = false;
        s.error = (a.payload as string) || a.error.message || 'Operation failed';
      });
    });
  },
});

export default storeSlice.reducer;
