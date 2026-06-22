import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, Building, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoreItem {
  id: string;
  store_name: string;
  store_code: string | null;
  address: string | null;
}

interface OwnerStoreSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStore: (store: StoreItem | null) => void;
}

export const OwnerStoreSelectionDialog: React.FC<OwnerStoreSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectStore,
}) => {
  const { userRole, customer } = useSupabaseAuth();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userRole?.customer_id) {
      fetchStores();
    }
  }, [isOpen, userRole?.customer_id]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_name, store_code, address')
        .eq('customer_id', userRole?.customer_id || '')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching stores:', error);
        toast.error('Failed to load stores');
        return;
      }

      setStores(data || []);
      
      // Check if there's a previously selected store
      const savedStoreId = localStorage.getItem('owner_selected_store_id');
      if (savedStoreId && data?.some(s => s.id === savedStoreId)) {
        setSelectedStoreId(savedStoreId);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store: StoreItem) => {
    setSelectedStoreId(store.id);
  };

  const handleConfirm = () => {
    const selectedStore = stores.find(s => s.id === selectedStoreId);
    if (selectedStore) {
      localStorage.setItem('owner_selected_store_id', selectedStore.id);
      localStorage.setItem('owner_selected_store_name', selectedStore.store_name);
      localStorage.setItem('pos_active_store', JSON.stringify(selectedStore.id));
      onSelectStore(selectedStore);
      toast.success(`Viewing data for ${selectedStore.store_name}`);
    }
    onClose();
  };

  const handleViewAllStores = () => {
    localStorage.removeItem('owner_selected_store_id');
    localStorage.removeItem('owner_selected_store_name');
    localStorage.removeItem('pos_active_store');
    onSelectStore(null);
    toast.success('Viewing data for all stores');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Select Store</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Choose which store's data you want to view
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stores found
            </div>
          ) : (
            <>
              {/* All Stores Option */}
              <button
                onClick={() => setSelectedStoreId(null)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                  selectedStoreId === null
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Building className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">All Stores</p>
                  <p className="text-xs text-muted-foreground">View combined data</p>
                </div>
                {selectedStoreId === null && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>

              {/* Individual Stores */}
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                    selectedStoreId === store.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Store className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{store.store_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {store.store_code ? `Code: ${store.store_code}` : 'No code'}
                      {store.address && ` • ${store.address}`}
                    </p>
                  </div>
                  {selectedStoreId === store.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={selectedStoreId === null ? handleViewAllStores : handleConfirm}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
