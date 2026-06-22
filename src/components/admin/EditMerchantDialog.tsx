import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

type Merchant = {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  subscription_plan: string | null;
};

interface Props {
  merchant: Merchant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const AVAILABLE_ADDONS = [
  { id: 'additionalStore', label: 'Additional Store' },
  { id: 'additionalUser', label: 'Additional User' },
  { id: 'qrOrdering', label: 'QR Ordering' },
  { id: 'inventoryManagement', label: 'Inventory Management' },
  { id: 'recipeManagement', label: 'Recipe Management' },
  { id: 'warehouseManagement', label: 'Warehouse Management' },
  { id: 'staffManagement', label: 'Staff Management' },
  { id: 'crm', label: 'CRM' },
  { id: 'reportsPro', label: 'Reports Pro' },
  { id: 'multiOutlet', label: 'Multi Outlet' },
  { id: 'apiAccess', label: 'API Access' },
  { id: 'whatsappIntegration', label: 'WhatsApp Integration' },
];

export default function EditMerchantDialog({ merchant, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeAddons, setActiveAddons] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    business_name: merchant.business_name,
    owner_name: merchant.owner_name,
    owner_email: merchant.owner_email,
    new_password: '',
    phone: merchant.phone || '',
    subscription_plan: merchant.subscription_plan || 'basic',
  });

  useEffect(() => {
    if (open) {
      fetchMerchantDetails();
    }
  }, [open, merchant.id]);

  const fetchMerchantDetails = async () => {
    setLoading(true);
    try {
      // Fetch user_id for auth updates
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('customer_id', merchant.id)
        .eq('role', 'owner')
        .maybeSingle();
      
      if (roleData) {
        setUserId(roleData.user_id);
      }

      // Fetch active addons
      const { data: addonsData } = await supabase
        .from('merchant_addons')
        .select('feature_key')
        .eq('merchant_id', merchant.id)
        .eq('enabled', true);

      if (addonsData) {
        const addonKeys = new Set(addonsData.map((a: any) => a.feature_key));
        setActiveAddons(addonKeys);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addonId: string) => {
    setActiveAddons(prev => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // 1. Update Authentication (Email / Password) via Edge Function
      const emailChanged = form.owner_email !== merchant.owner_email;
      const pwdChanged = form.new_password.length > 0;
      
      if ((emailChanged || pwdChanged) && userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No active session");

        const updatePayload: any = { user_id: userId };
        if (emailChanged) updatePayload.email = form.owner_email;
        if (pwdChanged) updatePayload.password = form.new_password;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-merchant`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(updatePayload)
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update authentication');
      }

      // 2. Update Merchant Addons
      const addonsUpsert = AVAILABLE_ADDONS.map(addon => ({
        merchant_id: merchant.id,
        feature_key: addon.id,
        enabled: activeAddons.has(addon.id),
      }));
      
      const { error: addonsError } = await supabase
        .from('merchant_addons')
        .upsert(addonsUpsert, { onConflict: 'merchant_id,feature_key' });
        
      if (addonsError) throw addonsError;

      // 3. Update Merchant Table
      const { error: merchantError } = await supabase.from('merchants').update({
        business_name: form.business_name,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        phone: form.phone,
        subscription_plan: form.subscription_plan
      }).eq('id', merchant.id);

      if (merchantError) throw merchantError;

      toast({ title: 'Merchant updated successfully' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Edit Merchant</DialogTitle>
          <DialogDescription>Update merchant details, authentication, and subscription add-ons.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <form id="edit-merchant-form" onSubmit={save} className="space-y-6 pb-6">
            {loading ? (
              <div className="flex justify-center p-8">Loading details...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input required value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <Input required value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Email (Login ID)</Label>
                    <Input required type="email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Reset Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter new password to change" 
                      value={form.new_password} 
                      onChange={e => setForm({ ...form, new_password: e.target.value })} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty if you do not want to change the password.</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Subscription Plan</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.subscription_plan}
                      onChange={e => setForm({ ...form, subscription_plan: e.target.value })}
                    >
                      <option value="basic">Basic</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-4">Subscription Add-ons</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_ADDONS.map(addon => (
                      <div key={addon.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`addon-${addon.id}`}
                          checked={activeAddons.has(addon.id)}
                          onCheckedChange={() => toggleAddon(addon.id)}
                        />
                        <Label htmlFor={`addon-${addon.id}`} className="font-normal cursor-pointer">
                          {addon.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 shrink-0 border-t bg-background">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="edit-merchant-form" disabled={saving || loading}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
