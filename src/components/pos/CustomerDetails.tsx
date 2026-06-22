import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, X, Save, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface CustomerDetailsProps {
  customer: CustomerData;
  onChange: (customer: CustomerData) => void;
  orderType: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const emptyCustomer: CustomerData = { name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' };

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};
const getStoreCode = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.storeCode) return p.storeCode; } } catch {}
  return null;
};

const getStoredCustomers = (): CustomerData[] => {
  try {
    const stored = localStorage.getItem('pos_customers');
    if (!stored) return [];
    return JSON.parse(stored).map((c: any) => ({
      name: c.name || '', phone: c.phone || '', email: c.email || '',
      address: c.address || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '',
    }));
  } catch { return []; }
};

const saveCustomerToList = async (customer: CustomerData) => {
  if (!customer.name && !customer.phone) return;
  // Save locally
  const existing = getStoredCustomers();
  const idx = existing.findIndex(c => c.phone.trim() === customer.phone.trim() && customer.phone.trim());
  if (idx >= 0) { existing[idx] = { ...existing[idx], ...customer }; }
  else { existing.unshift(customer); }
  localStorage.setItem('pos_customers', JSON.stringify(existing.slice(0, 500)));

  // Save to DB
  const storeId = getStoreId();
  if (storeId) {
    try {
      await supabase.functions.invoke('sync-store-data', {
        body: { action: 'save', store_id: storeId, data_type: 'pos_customers', store_code: getStoreCode(), items: [customer] }
      });
    } catch {}
  }
};

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, onChange, orderType, isOpen, onToggle }) => {
  const { t } = useLocale();
  const [localCustomer, setLocalCustomer] = useState<CustomerData>(customer);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { setLocalCustomer(customer); }, [customer]);

  const storedCustomers = getStoredCustomers();
  const customerExists = localCustomer.phone.trim()
    ? storedCustomers.some(c => c.phone.trim() === localCustomer.phone.trim())
    : false;

  const suggestions = searchTerm.length >= 2
    ? storedCustomers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)).slice(0, 5)
    : [];

  const handleSave = () => {
    onChange(localCustomer);
    saveCustomerToList(localCustomer);
    if (onToggle) onToggle();
    if (localCustomer.name || localCustomer.phone) { toast.success(t('msg.saved') || 'Customer details saved'); }
  };

  const handleClear = () => {
    setLocalCustomer({ ...emptyCustomer });
    onChange({ ...emptyCustomer });
    toast.info(t('msg.cleared') || 'Customer details cleared');
  };

  const selectCustomer = (c: CustomerData) => { 
    setLocalCustomer(c); 
    onChange(c); 
    setShowSuggestions(false); 
    setSearchTerm(''); 
  };

  const handlePhoneChange = (phoneVal: string) => {
    const updated = { ...localCustomer, phone: phoneVal };
    setLocalCustomer(updated);
    onChange(updated);

    // Auto-match existing customer instantly (check trimmed match)
    const sanitizedPhone = phoneVal.trim();
    if (sanitizedPhone.length >= 10) {
      const matched = getStoredCustomers().find(c => c.phone.trim() === sanitizedPhone);
      if (matched) {
        toast.success("Existing customer found.");
        setLocalCustomer(matched);
        onChange(matched);
      }
    }
  };

  const showAddressFields = orderType === 'delivery';
  if (!isOpen) return null;

  return (
    <div className="border-b border-border p-3 space-y-2.5 animate-slide-in-up">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder={t('common.search') + ' ' + (t('nav.customers') || 'customers') + '...'} value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} className="w-full pl-10 pr-3 py-2 pos-input text-sm" />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((c, i) => (
              <button key={i} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0">
                <span className="font-medium">{c.name}</span><span className="text-muted-foreground ml-2">{c.phone}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder={t('common.fullName') || 'Full Name'} value={localCustomer.name} 
          onChange={(e) => {
            const updated = { ...localCustomer, name: e.target.value };
            setLocalCustomer(updated);
            onChange(updated);
          }} className="w-full pl-10 pr-3 py-2 pos-input text-sm" />
      </div>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="tel" placeholder={t('common.phone') || 'Phone Number'} value={localCustomer.phone} 
          onChange={(e) => handlePhoneChange(e.target.value)} className="w-full pl-10 pr-3 py-2 pos-input text-sm" />
      </div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="email" placeholder={t('common.email') || 'Email ID'} value={localCustomer.email} 
          onChange={(e) => {
            const updated = { ...localCustomer, email: e.target.value };
            setLocalCustomer(updated);
            onChange(updated);
          }} className="w-full pl-10 pr-3 py-2 pos-input text-sm" />
      </div>
      {showAddressFields && (
        <>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <textarea placeholder={t('common.address') || 'Street Address'} value={localCustomer.address} 
              onChange={(e) => {
                const updated = { ...localCustomer, address: e.target.value };
                setLocalCustomer(updated);
                onChange(updated);
              }} rows={2} className="w-full pl-10 pr-3 py-2 pos-input text-sm resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" placeholder={t('customers.city') || 'City'} value={localCustomer.city} 
              onChange={(e) => {
                const updated = { ...localCustomer, city: e.target.value };
                setLocalCustomer(updated);
                onChange(updated);
              }} className="pos-input text-sm py-2 px-3" />
            <input type="text" placeholder={t('customers.state') || 'State'} value={localCustomer.state} 
              onChange={(e) => {
                const updated = { ...localCustomer, state: e.target.value };
                setLocalCustomer(updated);
                onChange(updated);
              }} className="pos-input text-sm py-2 px-3" />
            <input type="text" placeholder={t('customers.pincode') || 'Pincode'} value={localCustomer.pincode} 
              onChange={(e) => {
                const updated = { ...localCustomer, pincode: e.target.value };
                setLocalCustomer(updated);
                onChange(updated);
              }} className="pos-input text-sm py-2 px-3" />
          </div>
        </>
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} className="flex-1 pos-btn-primary py-2 text-sm flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {customerExists ? (t('common.select') || 'Select') : (t('common.save') || 'Save')}
        </button>
        <button onClick={handleClear} className="pos-btn-ghost py-2 px-3 text-sm flex items-center justify-center gap-1.5 flex-1">
          <X className="w-4 h-4" />
          {t('common.clear') || 'Clear'}
        </button>
      </div>
    </div>
  );
};
