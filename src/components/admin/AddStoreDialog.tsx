import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: React.ReactNode;
  onCreated?: () => void;
}

type MerchantOption = { id: string; business_name: string; owner_email: string };

export default function AddStoreDialog({ children, onCreated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    merchant_id: '',
    name: '',
    phone: '',
    city: '',
    state: '',
    address: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('merchants').select('id, business_name, owner_email').eq('is_active', true).order('business_name')
      .then(({ data }) => setMerchants((data || []) as MerchantOption[]));
  }, [isOpen]);

  const reset = () => setFormData({ merchant_id: '', name: '', phone: '', city: '', state: '', address: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchant_id || !formData.name) {
      toast({ title: 'Validation', description: 'Merchant and store name are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    const { error } = await supabase.from('stores').insert({
      merchant_id: formData.merchant_id,
      name: formData.name,
      phone: formData.phone || null,
      city: formData.city || null,
      state: formData.state || null,
      address: formData.address || null,
      is_active: true,
    });
    setIsCreating(false);
    if (error) {
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: 'Store created.' });
    onCreated?.();
    setIsOpen(false);
    reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add New Store</DialogTitle>
          <DialogDescription>Create a store/branch under an existing merchant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Merchant *</Label>
            <select
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.merchant_id}
              onChange={e => setFormData({ ...formData, merchant_id: e.target.value })}
            >
              <option value="">Select merchant...</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.business_name} ({m.owner_email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Store Name *</Label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="9876543210" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create Store'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
