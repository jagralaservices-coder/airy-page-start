import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface SelectedStore {
  id: string;
  store_name: string;
  store_code: string | null;
  address: string | null;
}

export const useOwnerStore = () => {
  const { userRole, isAuthenticated } = useSupabaseAuth();
  const isOwner = userRole?.role === 'owner' || userRole?.role === 'admin' || userRole?.role === 'super_admin';
  
  const [selectedStore, setSelectedStore] = useState<SelectedStore | null>(() => {
    const storeId = localStorage.getItem('owner_selected_store_id');
    const storeName = localStorage.getItem('owner_selected_store_name');
    if (storeId && storeName) {
      return {
        id: storeId,
        store_name: storeName,
        store_code: null,
        address: null
      };
    }
    return null;
  });

  const [shouldShowStoreSelection, setShouldShowStoreSelection] = useState(false);

  // Check if owner needs to select store on first login
  useEffect(() => {
    if (isOwner && isAuthenticated) {
      const hasSelectedStore = localStorage.getItem('owner_store_selection_done');
      const existingStoreId =
        localStorage.getItem('owner_selected_store_id') ||
        localStorage.getItem('pos_active_store');
      const storeLoginData = localStorage.getItem('pos_active_store_data');
      // Skip dialog if a store is already selected/active (e.g. store-code login)
      if (!hasSelectedStore && !existingStoreId && !storeLoginData) {
        setShouldShowStoreSelection(true);
      } else if (!hasSelectedStore && (existingStoreId || storeLoginData)) {
        // Mark as done so it never re-prompts when a store is already active
        localStorage.setItem('owner_store_selection_done', 'true');
      }
    }
  }, [isOwner, isAuthenticated]);

  const selectStore = useCallback((store: SelectedStore | null) => {
    if (store) {
      localStorage.setItem('owner_selected_store_id', store.id);
      localStorage.setItem('owner_selected_store_name', store.store_name);
      localStorage.setItem('pos_active_store', JSON.stringify(store.id));
      setSelectedStore(store);
    } else {
      localStorage.removeItem('owner_selected_store_id');
      localStorage.removeItem('owner_selected_store_name');
      localStorage.removeItem('pos_active_store');
      setSelectedStore(null);
    }
    localStorage.setItem('owner_store_selection_done', 'true');
    setShouldShowStoreSelection(false);
  }, []);

  const getSelectedStoreId = useCallback((): string | null => {
    return selectedStore?.id || null;
  }, [selectedStore]);

  const getSelectedStoreName = useCallback((): string => {
    return selectedStore?.store_name || 'All Stores';
  }, [selectedStore]);

  const clearStoreSelection = useCallback(() => {
    localStorage.removeItem('owner_selected_store_id');
    localStorage.removeItem('owner_selected_store_name');
    localStorage.removeItem('owner_store_selection_done');
    setSelectedStore(null);
  }, []);

  const dismissStoreSelection = useCallback(() => {
    localStorage.setItem('owner_store_selection_done', 'true');
    setShouldShowStoreSelection(false);
  }, []);

  return {
    selectedStore,
    selectedStoreId: selectedStore?.id || null,
    selectedStoreName: selectedStore?.store_name || 'All Stores',
    shouldShowStoreSelection,
    isOwner,
    selectStore,
    getSelectedStoreId,
    getSelectedStoreName,
    clearStoreSelection,
    dismissStoreSelection
  };
};
