import React, { useState, useEffect } from 'react';
import { 
  Search, Store, Settings, ChevronRight, Building, Copy, Check,
  RefreshCw, LayoutGrid, Package, Users, BarChart3, MessageCircle,
  Truck, ChefHat, Wallet, FileText, Radio, Crown, ShoppingBag, UtensilsCrossed,
  Puzzle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';
import { ADDON_KEYS, type AddonKey } from '@/lib/subscriptionConfig';

interface Customer {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  ref_code: string | null;
  is_active: boolean;
  approval_status: string;
  subscription_tier: string;
  business_type: string;
  enabled_addons?: string[];
  staff_limit?: number;
  outlet_limit?: number;
}

interface StoreItem {
  id: string;
  store_name: string;
  store_code: string | null;
  ref_code: string | null;
  address: string | null;
  is_active: boolean;
}

const getPersonalId = (uuid: string): string => {
  if (!uuid) return '';
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numericId = Math.abs(hash % 900000) + 100000;
  return numericId.toString();
};

const SUBSCRIPTION_TIERS = [
  { value: 'basic', label: 'Basic', color: 'bg-slate-100 text-slate-600 border border-slate-200 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5' },
  { value: 'gold', label: 'Gold', color: 'bg-amber-50 text-amber-600 border border-amber-250 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5' },
  { value: 'platinum', label: 'Platinum', color: 'bg-violet-50 text-violet-750 border border-violet-250 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5' },
];

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-600' },
  { value: 'retail', label: 'Retail Store', icon: ShoppingBag, color: 'text-blue-600' },
];

const ADDON_LABELS: Record<AddonKey, string> = {
  delivery_tracking: 'Delivery Tracking',
  multi_outlet: 'Multi-Outlet Management',
  api_integrations: 'API Integrations',
  staff_limit_increase: 'Staff Limit Increase',
  expense_tracking: 'Expense Tracking',
  alerts_notifications: 'Alerts & Notifications',
  auto_stock_system: 'Auto Stock Requirement (AI)',
  advanced_inventory_recipes: 'Advanced Inventory + Recipes',
  qr_menu_ordering: 'QR Menu Ordering',
  table_management: 'Table Management',
  swiggy_zomato: 'Swiggy/Zomato Integration',
  advanced_reports: 'Advanced Reports',
  central_dashboard: 'Central Dashboard',
};

const STORE_FEATURE_SETTINGS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Analytics and reports' },
  { key: 'pos', label: 'POS Billing', icon: Store, description: 'Point of sale' },
  { key: 'orders', label: 'Orders', icon: FileText, description: 'Order management' },
  { key: 'menu', label: 'Menu', icon: Package, description: 'Menu items' },
  { key: 'tables', label: 'Tables', icon: LayoutGrid, description: 'Table layout' },
  { key: 'inventory', label: 'Inventory', icon: Package, description: 'Stock management' },
  { key: 'staff', label: 'Staff', icon: Users, description: 'Staff management' },
  { key: 'reports', label: 'Reports', icon: BarChart3, description: 'Detailed reports' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, description: 'Expense tracking' },
  { key: 'delivery', label: 'Delivery', icon: Truck, description: 'Delivery orders' },
  { key: 'kitchen', label: 'Kitchen Display', icon: ChefHat, description: 'KDS view' },
  
  { key: 'chat', label: 'Team Chat', icon: MessageCircle, description: 'Internal messaging' },
];

export const AdminCustomerManagement: React.FC = () => {
  const { t } = useLocale();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerStores, setCustomerStores] = useState<StoreItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAddonsDialog, setShowAddonsDialog] = useState(false);
  const [addonCustomer, setAddonCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('id, business_name, owner_name, owner_email, phone, ref_code, is_active, approval_status, subscription_tier, business_type, enabled_addons, staff_limit, outlet_limit')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } else {
      setCustomers((data as any) || []);
    }
    setLoading(false);
  };

  const fetchCustomerStores = async (customerId: string) => {
    const { data, error } = await supabase
      .from('stores')
      .select('id, store_name, store_code, ref_code, address, is_active')
      .eq('customer_id', customerId)
      .order('store_name');

    if (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
      return;
    }

    setCustomerStores(data || []);
  };

  const fetchStoreSettings = async (storeId: string) => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_key, setting_value')
      .eq('store_id', storeId);

    if (error) {
      console.error('Error fetching store settings:', error);
      return;
    }

    // Build settings map with defaults (all enabled)
    const settingsMap: Record<string, boolean> = {};
    STORE_FEATURE_SETTINGS.forEach(feature => {
      settingsMap[feature.key] = true; // Default to enabled
    });

    // Override with saved settings
    data?.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value === true || setting.setting_value === 'true';
    });

    setStoreSettings(settingsMap);
  };

  const handleTierChange = async (customerId: string, newTier: string) => {
    const { error } = await supabase
      .from('customers')
      .update({ subscription_tier: newTier })
      .eq('id', customerId);

    if (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update subscription tier');
      return;
    }

    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, subscription_tier: newTier } : c));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(prev => prev ? { ...prev, subscription_tier: newTier } : null);
    }
    toast.success(`Subscription tier updated to ${newTier.toUpperCase()}`);
  };

  const handleBusinessTypeChange = async (customerId: string, newType: string) => {
    const { error } = await supabase
      .from('customers')
      .update({ business_type: newType } as any)
      .eq('id', customerId);

    if (error) {
      console.error('Error updating business type:', error);
      toast.error('Failed to update business type');
      return;
    }

    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, business_type: newType } : c));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(prev => prev ? { ...prev, business_type: newType } : null);
    }
    const label = BUSINESS_TYPES.find(b => b.value === newType)?.label || newType;
    toast.success(`Business type updated to ${label}`);
  };

  const handleToggleAddon = async (customerId: string, addonKey: string, enabled: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const currentAddons = customer.enabled_addons || [];
    const newAddons = enabled
      ? [...currentAddons, addonKey]
      : currentAddons.filter(a => a !== addonKey);

    const { error } = await supabase
      .from('customers')
      .update({ enabled_addons: newAddons } as any)
      .eq('id', customerId);

    if (error) {
      toast.error('Failed to update add-on');
      return;
    }

    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, enabled_addons: newAddons } : c));
    if (addonCustomer?.id === customerId) {
      setAddonCustomer(prev => prev ? { ...prev, enabled_addons: newAddons } : null);
    }
    toast.success(`Add-on ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerStores(customer.id);
    setSelectedStore(null);
  };

  const handleSelectStore = async (store: StoreItem) => {
    setSelectedStore(store);
    await fetchStoreSettings(store.id);
    setShowSettingsDialog(true);
  };

  const handleToggleSetting = (key: string, value: boolean) => {
    setStoreSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveStoreSettings = async () => {
    if (!selectedStore) return;

    setSavingSettings(true);
    try {
      // Upsert all settings
      const settingsToSave = Object.entries(storeSettings).map(([key, value]) => ({
        store_id: selectedStore.id,
        setting_key: key,
        setting_value: value,
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('store_settings')
          .upsert(setting, { onConflict: 'store_id,setting_key' });

        if (error) {
          throw error;
        }
      }

      toast.success(`${selectedStore.store_name} settings saved!`);
      setShowSettingsDialog(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const copyRefCode = (refCode: string) => {
    navigator.clipboard.writeText(refCode);
    setCopiedRef(refCode);
    setTimeout(() => setCopiedRef(null), 2000);
    toast.success('Reference code copied!');
  };

  const filteredCustomers = customers.filter(c => {
    const pId = getPersonalId(c.id);
    return c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.owner_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ref_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pId.includes(searchQuery) ||
      (c.phone && c.phone.includes(searchQuery));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">
            {t('admin.customerSettings') || 'Customer Settings'}
          </h2>
          <p className="text-indigo-950/70 mt-1 text-sm font-semibold">
            {t('admin.manageStoreFeatures') || 'Manage customer stores and feature access'}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchCustomers}
          className="rounded-xl border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
        <Input
          placeholder="Search by ID, name, email, phone or Ref ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500 rounded-xl shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customers List */}
        <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-violet-650" />
              Customers ({filteredCustomers.length})
            </CardTitle>
            <CardDescription className="text-slate-555">Select a customer to view their stores</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50/50">
                  No customers found
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors ${
                        selectedCustomer?.id === customer.id ? 'bg-violet-50/40 border-l-4 border-violet-600' : ''
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-base">{customer.business_name}</p>
                          <Badge variant="outline" className="font-mono text-xs bg-slate-100 border-slate-200 text-slate-700 font-bold">ID: {getPersonalId(customer.id)}</Badge>
                        </div>
                        <p className="text-sm text-slate-700 font-semibold">{customer.owner_name}</p>
                        <p className="text-xs text-slate-500 font-semibold font-mono">{customer.owner_email}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Crown className="w-3.5 h-3.5 text-slate-400" />
                            <Select
                              value={customer.subscription_tier}
                              onValueChange={(val) => handleTierChange(customer.id, val)}
                              disabled={customer.owner_email === 'jagralasalman786@gmail.com'}
                            >
                              <SelectTrigger className="h-7.5 w-[130px] text-xs bg-slate-50 border-slate-200 rounded-lg text-slate-800 font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-850">
                                {SUBSCRIPTION_TIERS.map(tier => (
                                  <SelectItem key={tier.value} value={tier.value}>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tier.color}`}>
                                      {tier.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <Select
                              value={customer.business_type || 'restaurant'}
                              onValueChange={(val) => handleBusinessTypeChange(customer.id, val)}
                              disabled={customer.owner_email === 'jagralasalman786@gmail.com'}
                            >
                              <SelectTrigger className="h-7.5 w-[140px] text-xs bg-slate-50 border-slate-200 rounded-lg text-slate-800 font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-850">
                                {BUSINESS_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <span className="flex items-center gap-1.5">
                                      <type.icon className={`w-3.5 h-3.5 ${type.color}`} />
                                      <span className="text-xs font-semibold">{type.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-violet-200 text-violet-650 bg-violet-50 hover:bg-violet-100 rounded-lg font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddonCustomer(customer);
                            setShowAddonsDialog(true);
                          }}
                          disabled={customer.owner_email === 'jagralasalman786@gmail.com'}
                        >
                          <Puzzle className="w-3.5 h-3.5 mr-1" />
                          Add-ons
                        </Button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Stores List */}
        <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Store className="w-5 h-5 text-violet-600" />
              Stores {selectedCustomer && `(${customerStores.length})`}
            </CardTitle>
            <CardDescription className="text-slate-555">
              {selectedCustomer 
                ? `Stores for ${selectedCustomer.business_name}` 
                : 'Select a customer to view stores'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {!selectedCustomer ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Building className="w-12 h-12 mb-4 opacity-30 text-slate-600" />
                  <p className="text-sm font-semibold">Select a customer first</p>
                </div>
              ) : customerStores.length === 0 ? (
                <div className="text-center py-12 text-slate-505 bg-slate-50/50 font-semibold">
                  No stores found for this customer
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customerStores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => handleSelectStore(store)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
                            <p className="font-bold text-slate-900 text-base">{store.store_name}</p>
                            <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-700 font-bold">ID: {getPersonalId(store.id)}</Badge>
                            <Badge variant={store.is_active ? 'default' : 'secondary'} className={store.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-250 font-bold' : 'bg-slate-100 text-slate-500 border border-slate-200 shadow-none'}>
                              {store.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {store.address && (
                            <p className="text-xs text-slate-500 mt-1 font-semibold">📍 {store.address}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-violet-600" />
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Store Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-650">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-violet-900 bg-clip-text text-transparent">
                  {selectedStore?.store_name} - Feature Settings
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-0.5 font-semibold">
                  Enable or disable features for this store outlet (Store ID: {selectedStore ? getPersonalId(selectedStore.id) : ''})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-2 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {STORE_FEATURE_SETTINGS.map((feature) => (
                <div 
                  key={feature.key} 
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <Label htmlFor={feature.key} className="cursor-pointer font-bold text-slate-800 text-sm">
                        {feature.label}
                      </Label>
                      <p className="text-[11px] text-slate-500 font-semibold">{feature.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={feature.key}
                    checked={storeSettings[feature.key] ?? true}
                    onCheckedChange={(checked) => handleToggleSetting(feature.key, checked)}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" className="rounded-xl border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-250 font-bold" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-violet-650 hover:bg-violet-750 text-white font-bold rounded-xl shadow-md"
              onClick={saveStoreSettings} 
              disabled={savingSettings}
            >
              {savingSettings ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add-ons Dialog */}
      <Dialog open={showAddonsDialog} onOpenChange={setShowAddonsDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Puzzle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-purple-900 bg-clip-text text-transparent">
                  {addonCustomer?.business_name} - Add-ons
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-0.5 font-semibold">
                  Enable add-on features beyond the current plan ({addonCustomer?.subscription_tier?.toUpperCase()})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-2 my-2">
            <div className="space-y-2.5 py-2">
              {ADDON_KEYS.map((addonKey) => {
                const isEnabled = addonCustomer?.enabled_addons?.includes(addonKey) || false;
                return (
                  <div
                    key={addonKey}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <Label className="cursor-pointer font-bold text-sm text-slate-800">
                        {ADDON_LABELS[addonKey]}
                      </Label>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (addonCustomer) {
                           handleToggleAddon(addonCustomer.id, addonKey, checked);
                        }
                      }}
                      className="data-[state=checked]:bg-purple-650"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" className="rounded-xl border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-250 font-bold" onClick={() => setShowAddonsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomerManagement;
