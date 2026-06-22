import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  Store, Plus, Edit, Trash2, X, MapPin, Phone, Check, Copy, Eye, EyeOff,
  Search, RefreshCw, Monitor, Smartphone, BarChart3, Package, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COUNTRY_CONFIG = {
  'India': { currency: 'INR', taxType: 'GST', defaultTax: 0, symbol: '₹' },
  'Oman': { currency: 'OMR', taxType: 'VAT', defaultTax: 0, symbol: 'ر.ع.' },
  'Saudi Arabia': { currency: 'SAR', taxType: 'VAT', defaultTax: 0, symbol: '﷼' },
  'Germany': { currency: 'EUR', taxType: 'VAT', defaultTax: 0, symbol: '€' },
} as const;

type CountryName = keyof typeof COUNTRY_CONFIG;

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'syncing', label: 'Syncing' },
  { key: 'offline', label: 'Offline' },
];

// Mini bar chart component
const MiniBarChart: React.FC<{ data: number[]; color?: string }> = ({ data, color = 'bg-primary' }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((val, i) => (
        <div
          key={i}
          className={cn('w-4 rounded-sm transition-all', color)}
          style={{ height: `${Math.max((val / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  );
};

export const StoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStoreId, addStore, updateStore, deleteStore, getStoreSales, orders, menuItems } = usePOS();
  const [showAddStore, setShowAddStore] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [deletingStoreName, setDeletingStoreName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showCopyDataDialog, setShowCopyDataDialog] = useState(false);
  const [newlyCreatedStore, setNewlyCreatedStore] = useState<any>(null);
  const [createdStoreInfo, setCreatedStoreInfo] = useState<{ name: string; email: string; password: string; storeCode?: string } | null>(null);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [newStore, setNewStore] = useState({
    name: '', email: '', address: '', phone: '', password: '',
    businessType: 'restaurant' as 'restaurant' | 'retail',
    country: 'India' as CountryName,
    taxPercentage: 0,
  });
  const [editStore, setEditStore] = useState({
    name: '', address: '', phone: '',
    businessType: 'restaurant' as 'restaurant' | 'retail',
    country: 'India' as CountryName,
    taxPercentage: 0,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copyingData, setCopyingData] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCountryChange = (country: CountryName, isEdit = false) => {
    const config = COUNTRY_CONFIG[country];
    if (isEdit) {
      setEditStore(prev => ({ ...prev, country, taxPercentage: config.defaultTax }));
    } else {
      setNewStore(prev => ({ ...prev, country, taxPercentage: config.defaultTax }));
    }
  };

  const handleAddStore = () => {
    if (!newStore.name) { toast.error('Store name is required'); return; }
    if (!newStore.email.trim()) { toast.error('Store email is required'); return; }
    if (!newStore.password || newStore.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    const config = COUNTRY_CONFIG[newStore.country];
    const created = addStore({
      name: newStore.name, email: newStore.email.trim().toLowerCase(), password: newStore.password,
      address: newStore.address || undefined, phone: newStore.phone || undefined,
      businessType: newStore.businessType, country: newStore.country,
      currencyCode: config.currency, taxType: config.taxType, taxPercentage: newStore.taxPercentage,
    });
    setCreatedStoreInfo({ name: created.name, email: newStore.email.trim().toLowerCase(), password: created.password, storeCode: created.storeCode });
    setNewlyCreatedStore(created);
    setNewStore({ name: '', email: '', address: '', phone: '', password: '', businessType: 'restaurant', country: 'India', taxPercentage: 0 });
    setShowAddStore(false);
    if (menuItems.length > 0) { setShowCopyDataDialog(true); } else { setShowSuccessDialog(true); }
  };

  const handleCopyData = async () => {
    if (!newlyCreatedStore) return;
    setCopyingData(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const copiedItems = menuItems.map(item => ({
        name: item.name, name_hindi: item.nameHindi || null, price: item.price,
        category: item.category, is_available: item.isAvailable,
        store_id: newlyCreatedStore.id, preparation_time: item.preparationTime || null,
        sku: item.sku || null, description: null,
      }));
      if (copiedItems.length > 0) {
        const { error } = await supabase.from('menu_items').insert(copiedItems);
        if (error) throw error;
        toast.success(`${copiedItems.length} menu items copied to new store!`);
      }
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Menu copy failed. Please add manually.');
    } finally {
      setCopyingData(false);
      setShowCopyDataDialog(false);
      setShowSuccessDialog(true);
    }
  };

  const handleSkipCopy = () => { setShowCopyDataDialog(false); setShowSuccessDialog(true); };

  const handleEditStore = () => {
    if (!editingStore || !editStore.name) { toast.error('Store name is required'); return; }
    const config = COUNTRY_CONFIG[editStore.country];
    
    const updates: any = {
      name: editStore.name, address: editStore.address || undefined,
      phone: editStore.phone || undefined, businessType: editStore.businessType,
      country: editStore.country, currencyCode: config.currency,
      taxType: config.taxType, taxPercentage: editStore.taxPercentage,
    };

    if (editStore.password && editStore.password.trim()) {
      if (editStore.password.trim().length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      updates.password = editStore.password.trim();
    }

    updateStore(editingStore.id, updates);
    toast.success('Store updated!');
    setShowEditStore(false);
    setEditingStore(null);
  };

  const handleDeleteStore = async () => {
    if (!deletingStoreId) return;

    const storeStillInList = stores.some(store => store.id === deletingStoreId);
    if (!storeStillInList) {
      deleteStore(deletingStoreId);
      toast.success('Stale store entry removed');
      setShowDeleteConfirm(false);
      setDeletingStoreId(null);
      setDeletingStoreName('');
      return;
    }

    setIsDeleting(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('delete-store', {
        body: { store_id: deletingStoreId }
      });

      if (error || !data?.success) {
        const message = data?.error || error?.message || 'Failed to delete store';

        if (message === 'Store not found') {
          deleteStore(deletingStoreId);
          toast.success('Store was already deleted and has been removed from this device');
        } else {
          toast.error(message);
        }
      } else {
        deleteStore(deletingStoreId);
        toast.success(data.message || 'Store deleted successfully');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete store');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingStoreId(null);
      setDeletingStoreName('');
    }
  };

  const openDeleteDialog = (store: any) => {
    setDeletingStoreId(store.id);
    setDeletingStoreName(store.name);
    setShowDeleteConfirm(true);
  };

  const openEditDialog = (store: any) => {
    setEditingStore(store);
    setEditStore({
      name: store.name, address: store.address || '', phone: store.phone || '',
      businessType: store.businessType || 'restaurant',
      country: (store.country || 'India') as CountryName,
      taxPercentage: store.taxPercentage ?? 0,
      password: '',
    });
    setShowEditStore(true);
  };

  const getTotalStoreSales = (storeId: string): number => {
    return orders.filter(o => o.storeId === storeId && o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
  };

  const getStoreOrderCount = (storeId: string): number => {
    return orders.filter(o => o.storeId === storeId && o.status === 'completed').length;
  };

  // Generate mock chart data per store
  const getStoreChartData = (storeId: string): number[] => {
    const seed = storeId.charCodeAt(0) + storeId.charCodeAt(1);
    return Array.from({ length: 7 }, (_, i) => Math.floor(Math.abs(Math.sin(seed + i * 2.5)) * 80 + 20));
  };

  // Simulated store status
  const getStoreStatus = (store: any): 'online' | 'syncing' | 'offline' => {
    if (activeStore?.id === store.id) return 'online';
    const hash = store.id.charCodeAt(0) % 3;
    if (hash === 0) return 'online';
    if (hash === 1) return 'syncing';
    return 'offline';
  };

  const getStatusBadge = (status: 'online' | 'syncing' | 'offline') => {
    const configs = {
      online: { dot: 'bg-success', text: 'text-success', label: 'ONLINE' },
      syncing: { dot: 'bg-warning', text: 'text-warning', label: 'SYNCING' },
      offline: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'OFFLINE' },
    };
    const c = configs[status];
    return (
      <span className={cn('flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2 py-1 rounded-full bg-card', c.text)}>
        <span className={cn('w-2 h-2 rounded-full', c.dot, status === 'syncing' && 'animate-pulse')} />
        {c.label}
      </span>
    );
  };

  // Simulated devices per store
  const getDevices = (storeId: string) => {
    const seed = storeId.charCodeAt(2) || 0;
    const devices = [
      { name: `Terminal #1 (Front)`, status: 'READY' as const },
      { name: `Terminal #2 (Front)`, status: 'READY' as const },
      { name: `Handheld #4 (Mobile)`, status: seed % 2 === 0 ? 'READY' as const : 'CHARGING' as const },
    ];
    return devices;
  };

  const getStoreStaffCount = (storeId: string) => {
    const seed = (storeId.charCodeAt(0) + storeId.charCodeAt(3)) % 8 + 2;
    const total = seed + 4;
    return { active: seed, total };
  };

  const filteredStores = stores.filter(store => {
    const status = getStoreStatus(store);
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'active' && status === 'online') ||
      (activeTab === 'syncing' && status === 'syncing') ||
      (activeTab === 'offline' && status === 'offline');
    const matchesSearch = !searchQuery || 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.storeCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderStoreFormFields = (formData: typeof newStore | typeof editStore, setFormData: any, isEdit = false) => {
    const config = COUNTRY_CONFIG[formData.country];
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Store Name *</label>
          <Input placeholder="Store Name" value={formData.name} onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))} className="h-11" />
        </div>
        {!isEdit && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Login Email *</label>
            <Input type="email" placeholder="store@example.com" value={(formData as typeof newStore).email} onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))} className="h-11" />
          </div>
        )}
        {!isEdit && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password *</label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={(formData as typeof newStore).password} onChange={(e) => setFormData((prev: any) => ({ ...prev, password: e.target.value }))} className="h-11 pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        {isEdit && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Change Password (Optional)</label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Leave blank to keep current password" value={(formData as any).password || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, password: e.target.value }))} className="h-11 pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Type *</label>
            <Select value={formData.businessType} onValueChange={(v) => setFormData((prev: any) => ({ ...prev, businessType: v }))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">🍽️ Restaurant</SelectItem>
                <SelectItem value="retail">🏪 Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Country *</label>
            <Select value={formData.country} onValueChange={(v) => handleCountryChange(v as CountryName, isEdit)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="India">🇮🇳 India</SelectItem>
                <SelectItem value="Oman">🇴🇲 Oman</SelectItem>
                <SelectItem value="Saudi Arabia">🇸🇦 Saudi Arabia</SelectItem>
                <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Currency</p>
            <p className="font-semibold text-sm">{config.symbol} {config.currency}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Tax Type</p>
            <p className="font-semibold text-sm">{config.taxType}</p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">{config.taxType} Percentage (%)</label>
          <Input type="number" min="0" max="100" step="0.5" value={formData.taxPercentage} onChange={(e) => setFormData((prev: any) => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))} className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Address</label>
          <Input placeholder="Store Address" value={formData.address} onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))} className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone</label>
          <Input placeholder="+91 9876543210" value={formData.phone} onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))} className="h-11" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">Stores</h1>
          <Button size="icon" className="rounded-xl h-9 w-9 bg-primary" onClick={() => setShowAddStore(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border rounded-xl h-10"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Store Cards */}
      <div className="px-4 py-4 space-y-4 pb-24">
        {filteredStores.map((store) => {
          const isActive = activeStore?.id === store.id;
          const todaySales = getStoreSales(store.id);
          const orderCount = getStoreOrderCount(store.id);
          const status = getStoreStatus(store);
          const chartData = getStoreChartData(store.id);
          const devices = getDevices(store.id);
          const staff = getStoreStaffCount(store.id);
          const region = (store as any).address || 'Local';

          return (
            <div
              key={store.id}
              className={cn(
                'bg-card rounded-2xl border border-border p-5 transition-all',
                isActive && 'ring-1 ring-primary/50'
              )}
              onClick={() => setActiveStoreId(store.id)}
            >
              {/* Store Header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{store.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    ✉️ {store.loginEmail || 'No email'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Region: {region.substring(0, 20)}
                  </p>
                </div>
                {getStatusBadge(status)}
              </div>

              {/* Mini Chart */}
              <div className="my-4">
                <MiniBarChart data={chartData} color={status === 'offline' ? 'bg-muted-foreground/30' : 'bg-primary'} />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue Today</p>
                  <p className={cn('text-lg font-bold', status === 'offline' ? 'text-muted-foreground' : 'text-success')}>
                    {formatCurrency(todaySales)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders</p>
                  <p className="text-lg font-bold text-foreground">{orderCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Staff</p>
                  <p className={cn('text-lg font-bold', staff.active === 0 ? 'text-destructive' : 'text-success')}>
                    {staff.active}/{staff.total}
                  </p>
                </div>
              </div>

              {/* Sync & Manager Info (only for active/online stores) */}
              {status === 'online' && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 border-t border-border pt-3">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3" /> Last sync: 2m ago
                    </span>
                    <span>Manager: {store.name.charAt(0)}. Manager</span>
                  </div>

                  {/* Devices */}
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Devices</p>
                    <div className="space-y-1.5">
                      {devices.map((device, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-foreground">
                            {device.name.includes('Handheld') ? <Smartphone className="w-3.5 h-3.5 text-muted-foreground" /> : <Monitor className="w-3.5 h-3.5 text-muted-foreground" />}
                            {device.name}
                          </span>
                          <span className={cn(
                            'text-xs font-semibold',
                            device.status === 'READY' ? 'text-success' : 'text-warning'
                          )}>
                            {device.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs flex-1"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(store); }}
                    >
                      <Settings className="w-3 h-3 mr-1" /> Manage
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs flex-1"
                      onClick={(e) => { e.stopPropagation(); navigate('/reports'); }}
                    >
                      <BarChart3 className="w-3 h-3 mr-1" /> Analytics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs flex-1 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(store); }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filteredStores.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Stores</h3>
            <p className="text-sm mb-4">Add your first store to get started</p>
            <Button onClick={() => setShowAddStore(true)}><Plus className="w-4 h-4 mr-2" /> Add Store</Button>
          </div>
        )}
      </div>

      {/* ===== DIALOGS (unchanged logic) ===== */}

      {/* Add Store Dialog */}
      {showAddStore && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Create New Store</h2>
              <button onClick={() => setShowAddStore(false)} className="p-2 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {renderStoreFormFields(newStore, setNewStore, false)}
            <p className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-lg mt-4">Store ID (Login ID) will be auto-generated after creation</p>
            <Button onClick={handleAddStore} className="w-full h-11 mt-4"><Plus className="w-4 h-4 mr-2" /> Create Store</Button>
          </div>
        </div>
      )}

      {/* Edit Store Dialog */}
      {showEditStore && editingStore && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Edit Store</h2>
              <button onClick={() => setShowEditStore(false)} className="p-2 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {renderStoreFormFields(editStore, setEditStore, true)}
            <Button onClick={handleEditStore} className="w-full h-11 mt-4"><Edit className="w-4 h-4 mr-2" /> Update Store</Button>
          </div>
        </div>
      )}

      {/* Copy Data Dialog */}
      {showCopyDataDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Copy className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Copy Menu to New Store?</h2>
            <p className="text-muted-foreground mb-6">Copy current store's menu ({menuItems.length} items) to new store?</p>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-medium mb-2">Will be copied:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Menu Items ({menuItems.length})</li>
                <li>✅ Categories & Prices</li>
                <li>❌ Orders & Sales</li>
                <li>❌ Inventory</li>
              </ul>
            </div>
            <div className="space-y-3">
              <Button onClick={handleCopyData} className="w-full h-11" disabled={copyingData}>{copyingData ? 'Copying...' : 'Yes, Copy Menu'}</Button>
              <Button variant="outline" onClick={handleSkipCopy} className="w-full h-11" disabled={copyingData}>No, Create Empty Store</Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && createdStoreInfo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Store Created Successfully!</h2>
            <p className="text-muted-foreground mb-6">{createdStoreInfo.name}</p>
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-2">Store ID</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl font-bold font-mono tracking-wider text-primary">{createdStoreInfo.storeCode || 'Creating...'}</span>
                {createdStoreInfo.storeCode && (
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdStoreInfo.storeCode!); toast.success('Store ID copied!'); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">Store Login Email</p>
              <div className="flex items-center justify-center gap-3">
              <span className="text-base font-bold text-primary break-all">{createdStoreInfo.email}</span>
              <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdStoreInfo.email); toast.success('Store email copied!'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Store Password</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl font-bold font-mono tracking-wider">{showCreatedPassword ? createdStoreInfo.password : '••••••••'}</span>
                <Button variant="ghost" size="icon" onClick={() => setShowCreatedPassword(!showCreatedPassword)}>
                  {showCreatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdStoreInfo.password); toast.success('Password copied!'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use Email + Password to login</p>
            </div>
            <Button onClick={() => { setShowSuccessDialog(false); setShowCreatedPassword(false); }} className="w-full h-11">Done</Button>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Delete Store?</h2>
            <p className="text-muted-foreground mb-2">
              Are you sure you want to delete <strong>{deletingStoreName}</strong>?
            </p>
            <p className="text-sm text-destructive mb-6">
              This will permanently delete all orders, menu items, inventory, staff, and settings for this store. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <Button
                variant="destructive"
                onClick={handleDeleteStore}
                className="w-full h-11"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Store'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); setDeletingStoreId(null); }}
                className="w-full h-11"
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
