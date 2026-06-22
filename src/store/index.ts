import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import ownerReducer from './slices/ownerSlice';
import storeReducer from './slices/storeSlice';
import staffReducer from './slices/staffSlice';
import approvalReducer from './slices/approvalSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    owner: ownerReducer,
    store: storeReducer,
    staff: staffReducer,
    approval: approvalReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['auth/setSession', 'auth/login/fulfilled', 'auth/fetchCurrentUser/fulfilled'],
        ignoredPaths: ['auth.session', 'auth.user', 'user.authUser'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
