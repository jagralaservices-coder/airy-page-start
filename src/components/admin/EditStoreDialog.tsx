import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  storeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface StoreFields {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address_line1: string;
  locality: string;
  tax_percentage: string;
}

const empty: StoreFields = {
  name: '', phone: '', email: '', city: '', state: '', pincode: '',
  address_line1: '', locality: '', tax_percentage: '',
};

export default function EditStoreDialog({ storeId, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<StoreFields>(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !storeId) return;
    setLoading(true);
    supabase.from('stores').select('*').eq('id', storeId).maybeSingle().then(({ data, error }) => {
      setLoading(false);
      if (error || !data) {
        toast({ title: 'Failed to load store', description: error?.message || 'Not found', variant: 'destructive' });
        return;
      }
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        address_line1: data.address_line1 || '',
        locality: data.locality || '',
        tax_percentage: data.tax_percentage != null ? String(data.tax_percentage) : '',
      });
    });
  }, [open, storeId, toast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
      address_line1: form.address_line1 || null,
      locality: form.locality || null,
    };
    if (form.tax_percentage) updates.tax_percentage = Number(form.tax_percentage);

    const { data, error } = await supabase.functions.invoke('update-store', {
      body: { store_id: storeId, updates },
    });
    setSaving(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = error?.message || (data as { error?: string })?.error || 'Update failed';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Store updated' });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Store</DialogTitle>
          <DialogDescription>Update store details. Changes are audit-logged.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Store Name *</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Address Line 1</Label><Input value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Locality</Label><Input value={form.locality} onChange={e => setForm({ ...form, locality: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Pincode</Label><Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Tax %</Label><Input type="number" step="0.01" value={form.tax_percentage} onChange={e => setForm({ ...form, tax_percentage: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
