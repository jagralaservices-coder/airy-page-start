import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { ArrowLeft, Users, Plus, Search, Phone, MapPin, User, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCustomers, setCustomers, getCreditLedger, setCreditLedger, Customer, CreditEntry } from '@/lib/store';
import { useStoreDataSync } from '@/hooks/useStoreDataSync';

const normalizePhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').trim();

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};
const getStoreCode = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.storeCode) return p.storeCode; } } catch {}
  return null;
};

export const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const { saveCreditEntryToCloud } = useStoreDataSync();
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '', email: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const storeId = getStoreId();
    if (!storeId) { setCustomersState(getCustomers()); setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: { action: 'fetch', store_id: storeId, data_type: 'pos_customers', store_code: getStoreCode() }
      });
      if (!error && data?.items) {
        const mapped = data.items.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone || '', email: c.email || '',
          address: c.address || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '',
          createdAt: c.created_at,
        }));
        setCustomers(mapped);
        setCustomersState(mapped);
        setLoading(false);
        return;
      }
    } catch {}
    setCustomersState(getCustomers());
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );

  const handleAddCustomer = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) { toast.error(t('common.required')); return; }
    if (customers.some(c => c.phone.trim() === formData.phone.trim() && c.id !== editingCustomer?.id)) {
      toast.error("Customer with this contact number already exists.");
      return;
    }

    const storeId = getStoreId();

    if (editingCustomer) {
      // Update
      const item = { 
        id: editingCustomer.id, 
        ...formData, 
        createdAt: editingCustomer.createdAt,
        lastUpdated: new Date().toISOString(),
        pendingSync: true 
      };
      
      const updated = customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData, lastUpdated: new Date().toISOString(), pendingSync: true } : c);
      setCustomersState(updated);
      setCustomers(updated);

      // Phone Edit Propagation: keep credit_ledger grouping aligned with the
      // surviving customer when phone changes. Amounts / dates / paid_amount /
      // due_amount / payment_status / bill_number all preserved as-is.
      const oldPhoneNorm = normalizePhone(editingCustomer.phone);
      const newPhoneNorm = normalizePhone(formData.phone);
      const newName = (formData.name || '').trim();
      if (oldPhoneNorm && newPhoneNorm && oldPhoneNorm !== newPhoneNorm) {
        const allLedger = getCreditLedger();
        const changed: CreditEntry[] = [];
        const rewritten = allLedger.map((e) => {
          if (normalizePhone(e.customer_phone) === oldPhoneNorm) {
            const next: CreditEntry = {
              ...e,
              customer_phone: formData.phone.trim(),
              customer_name: newName || e.customer_name,
              lastUpdated: new Date().toISOString(),
              pendingSync: true,
            };
            changed.push(next);
            return next;
          }
          return e;
        });
        if (changed.length > 0) {
          setCreditLedger(rewritten);
          try {
            await saveCreditEntryToCloud(changed);
          } catch (err) {
            console.warn('[PhoneEditPropagation] Cloud save deferred, will retry via periodic sync.', err);
          }
        }
      }

      toast.success(t('msg.saved'));

      if (storeId) {
        try {
          await supabase.functions.invoke('sync-store-data', {
            body: { action: 'save', store_id: storeId, data_type: 'pos_customers', store_code: getStoreCode(), items: [item] }
          });
          setCustomersState(prev => {
            const cleared = prev.map(c => c.id === item.id ? { ...c, pendingSync: false } : c);
            setCustomers(cleared);
            return cleared;
          });
        } catch {}
      }
    } else {
      // Create
      const localId = Date.now().toString();
      const newItem = { 
        id: localId,
        name: formData.name.trim(), 
        phone: formData.phone.trim(), 
        address: formData.address.trim() || undefined, 
        email: formData.email.trim() || undefined, 
        city: formData.city || undefined, 
        state: formData.state || undefined, 
        pincode: formData.pincode || undefined,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        pendingSync: true
      };
      
      const updated = [newItem as Customer, ...customers];
      setCustomersState(updated);
      setCustomers(updated);
      toast.success(t('msg.saved'));

      if (storeId) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-store-data', {
            body: { action: 'save', store_id: storeId, data_type: 'pos_customers', store_code: getStoreCode(), items: [newItem] }
          });
          if (!error && data?.items?.[0]) {
            const c = data.items[0];
            const created: Customer = { 
              id: c.id, 
              name: c.name, 
              phone: c.phone || '', 
              email: c.email || '', 
              address: c.address || '', 
              city: c.city || '', 
              state: c.state || '', 
              pincode: c.pincode || '', 
              createdAt: c.created_at,
              pendingSync: false 
            };
            setCustomersState(prev => {
              const updatedList = prev.map(item => item.id === localId ? created : item);
              setCustomers(updatedList);
              return updatedList;
            });
          }
        } catch {}
      }
    }
    setShowAddDialog(false); setEditingCustomer(null); setFormData({ name: '', phone: '', address: '', city: '', state: '', pincode: '', email: '' });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone, address: customer.address || '', city: customer.city || '', state: customer.state || '', pincode: customer.pincode || '', email: customer.email || '' });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    const storeId = getStoreId();
    const updated = customers.filter(c => c.id !== id);
    setCustomersState(updated);
    setCustomers(updated);
    
    if (storeId) {
      const deletedKey = `pos_deleted_customers_${storeId}`;
      const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]') as string[];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
      }
    }

    toast.success(t('msg.deleted'));

    if (storeId) {
      try {
        await supabase.functions.invoke('sync-store-data', {
          body: { action: 'delete', store_id: storeId, data_type: 'pos_customers', store_code: getStoreCode(), item_ids: [id] }
        });
        const deletedKey = `pos_deleted_customers_${storeId}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]') as string[];
        const filtered = deletedIds.filter(d => d !== id);
        localStorage.setItem(deletedKey, JSON.stringify(filtered));
      } catch {}
    }
  };

  const openAddDialog = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', city: '', state: '', pincode: '', email: '' });
    setShowAddDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">👥 {t('nav.customers')}</h1>
            <p className="text-xs text-muted-foreground">{customers.length} {t('nav.customers').toLowerCase()}</p>
          </div>
          <Button size="sm" onClick={openAddDialog} className="gap-1 rounded-xl"><Plus className="w-4 h-4" />{t('common.add')}</Button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('common.search') + '...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl bg-muted/50 border-border/60" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-2">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
            {!searchQuery && <Button variant="outline" size="sm" className="mt-4" onClick={openAddDialog}>{t('customers.addCustomer')}</Button>}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><User className="w-4 h-4 text-primary" /><span className="font-semibold truncate">{customer.name}</span></div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Phone className="w-3 h-3" /><span>{customer.phone}</span></div>
                  {customer.address && <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{customer.address}</span></div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(customer.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {(customer.totalOrders || customer.totalSpent) && (
                <div className="mt-2 pt-2 border-t border-border flex gap-4 text-xs text-muted-foreground">
                  <span>{customer.totalOrders || 0} {t('nav.orders').toLowerCase()}</span>
                  <span>{formatCurrency(customer.totalSpent || 0)} {t('common.total').toLowerCase()}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-sm font-medium mb-1.5 block">{t('common.name')} *</label><Input placeholder={t('customers.customerName')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">{t('common.phone')} *</label><Input placeholder={t('common.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">{t('common.email')}</label><Input type="email" placeholder={t('common.email') + ' (' + t('common.optional') + ')'} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">{t('common.address')}</label><Input placeholder={t('common.address') + ' (' + t('common.optional') + ')'} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs font-medium mb-1 block">{t('customers.city') || 'City'}</label><Input placeholder={t('customers.city') || 'City'} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
              <div><label className="text-xs font-medium mb-1 block">{t('customers.state') || 'State'}</label><Input placeholder={t('customers.state') || 'State'} value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
              <div><label className="text-xs font-medium mb-1 block">{t('customers.pincode') || 'Pincode'}</label><Input placeholder={t('customers.pincode') || 'Pincode'} value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1" onClick={handleAddCustomer}>{editingCustomer ? t('common.update') : t('customers.addCustomer')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
