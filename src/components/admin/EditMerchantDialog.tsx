import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

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

type CatalogFeature = {
  feature_key: string;
  label: string;
  category: string;
  included_in: string[] | null;
};

export default function EditMerchantDialog({ merchant, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogFeature[]>([]);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);
  const [initialAddons, setInitialAddons] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedKey, setPickedKey] = useState<string>('');

  const [form, setForm] = useState({
    business_name: merchant.business_name,
    owner_name: merchant.owner_name,
    owner_email: merchant.owner_email,
    new_password: '',
    phone: merchant.phone || '',
    subscription_plan: merchant.subscription_plan || 'basic',
  });

  useEffect(() => {
    if (open) fetchMerchantDetails();
  }, [open, merchant.id]);

  const fetchMerchantDetails = async () => {
    setLoading(true);
    try {
      const [{ data: roleData }, { data: addonsData }, { data: catalogData }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id')
          .or(`merchant_id.eq.${merchant.id},customer_id.eq.${merchant.id}`)
          .eq('role', 'owner')
          .order('is_active', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('merchant_addons').select('feature_key').eq('merchant_id', merchant.id).eq('enabled', true),
        supabase.from('feature_catalog').select('feature_key, label, category, included_in').eq('is_active', true).order('category').order('label'),
      ]);

      if (roleData) setUserId((roleData as any).user_id);
      const keys = (addonsData || []).map((a: any) => a.feature_key);
      setActiveAddons(keys);
      setInitialAddons(keys);
      setCatalog((catalogData || []) as CatalogFeature[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const catalogByKey = useMemo(() => {
    const m = new Map<string, CatalogFeature>();
    catalog.forEach((c) => m.set(c.feature_key, c));
    return m;
  }, [catalog]);

  // Features that are NOT included in the current plan, and not yet added
  const availableToAdd = useMemo(() => {
    const plan = form.subscription_plan;
    return catalog.filter((c) => {
      if (activeAddons.includes(c.feature_key)) return false;
      // Hide features already included in the plan (no need to add as add-on)
      if (Array.isArray(c.included_in) && c.included_in.includes(plan)) return false;
      return true;
    });
  }, [catalog, activeAddons, form.subscription_plan]);

  const groupedAvailable = useMemo(() => {
    const groups: Record<string, CatalogFeature[]> = {};
    availableToAdd.forEach((f) => {
      (groups[f.category] ||= []).push(f);
    });
    return groups;
  }, [availableToAdd]);

  const addPickedAddon = () => {
    if (!pickedKey) return;
    setActiveAddons((prev) => Array.from(new Set([...prev, pickedKey])));
    setPickedKey('');
    setShowPicker(false);
  };

  const removeAddon = (key: string) => {
    setActiveAddons((prev) => prev.filter((k) => k !== key));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Update Authentication
      const emailChanged = form.owner_email !== merchant.owner_email;
      const pwdChanged = form.new_password.length > 0;

      if ((emailChanged || pwdChanged) && !userId) {
        throw new Error('Could not find the owner user account for this merchant. Email/password cannot be updated.');
      }

      if ((emailChanged || pwdChanged) && userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No active session');

        const updatePayload: any = { user_id: userId };
        if (emailChanged) updatePayload.email = form.owner_email;
        if (pwdChanged) updatePayload.password = form.new_password;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-merchant`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(updatePayload),
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update authentication');
      }

      // 2. Diff add-ons and apply only changes (avoids FK errors from hardcoded keys)
      const toAdd = activeAddons.filter((k) => !initialAddons.includes(k));
      const toRemove = initialAddons.filter((k) => !activeAddons.includes(k));

      if (toAdd.length > 0) {
        const rows = toAdd.map((k) => ({
          merchant_id: merchant.id,
          feature_key: k,
          enabled: true,
        }));
        const { error: addError } = await supabase
          .from('merchant_addons')
          .upsert(rows, { onConflict: 'merchant_id,feature_key' });
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: delError } = await supabase
          .from('merchant_addons')
          .delete()
          .eq('merchant_id', merchant.id)
          .in('feature_key', toRemove);
        if (delError) throw delError;
      }

      // 3. Update Merchant row
      const { error: merchantError } = await supabase.from('merchants').update({
        business_name: form.business_name,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        phone: form.phone,
        subscription_plan: form.subscription_plan,
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
                    <Input required value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <Input required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Email (Login ID)</Label>
                    <Input required type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Reset Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password to change"
                      value={form.new_password}
                      onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty if you do not want to change the password.</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Subscription Plan</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.subscription_plan}
                      onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}
                    >
                      <option value="basic">Basic</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Subscription Add-ons</h3>
                      <p className="text-xs text-muted-foreground">Extra features on top of the selected plan.</p>
                    </div>
                    {!showPicker && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowPicker(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Add Add-on
                      </Button>
                    )}
                  </div>

                  {showPicker && (
                    <div className="flex items-end gap-2 p-3 rounded-md border bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Select feature</Label>
                        <Select value={pickedKey} onValueChange={setPickedKey}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an add-on feature" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {Object.keys(groupedAvailable).length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No more add-ons available for this plan.</div>
                            ) : (
                              Object.entries(groupedAvailable).map(([category, items]) => (
                                <SelectGroup key={category}>
                                  <SelectLabel className="capitalize">{category}</SelectLabel>
                                  {items.map((f) => (
                                    <SelectItem key={f.feature_key} value={f.feature_key}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" size="sm" onClick={addPickedAddon} disabled={!pickedKey}>
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowPicker(false);
                          setPickedKey('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {activeAddons.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No add-ons selected.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeAddons.map((key) => {
                        const f = catalogByKey.get(key);
                        return (
                          <Badge key={key} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
                            <span>{f?.label || key}</span>
                            <button
                              type="button"
                              onClick={() => removeAddon(key)}
                              className="ml-1 rounded-full hover:bg-background/60 p-0.5"
                              aria-label={`Remove ${f?.label || key}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 shrink-0 border-t bg-background">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="edit-merchant-form" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

