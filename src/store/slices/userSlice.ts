import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserState {
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = { profile: null, isLoading: false, error: null };

export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (error) return rejectWithValue(error.message);
    return data as ProfileData | null;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<ProfileData | null>) {
      state.profile = action.payload;
    },
    clearProfile(state) {
      state.profile = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProfile.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchProfile.fulfilled, (s, a) => { s.isLoading = false; s.profile = a.payload; });
    b.addCase(fetchProfile.rejected, (s, a) => {
      s.isLoading = false;
      s.error = (a.payload as string) || a.error.message || 'Failed to load profile';
    });
  },
});

export const { setProfile, clearProfile } = userSlice.actions;
export default userSlice.reducer;
