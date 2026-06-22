import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Ban, LogIn, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useNavigate } from 'react-router-dom';
import AddMerchantDialog from '@/components/admin/AddMerchantDialog';
import EditMerchantDialog from '@/components/admin/EditMerchantDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Merchant = {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  subscription_plan: string | null;
  is_active: boolean;
  approval_status: string;
};

export default function MerchantManagementPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [deleting, setDeleting] = useState<Merchant | null>(null);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchMerchants = useCallback(async () => {
    const { data, error } = await supabase
      .from('merchants')
      .select('id, business_name, owner_name, owner_email, phone, subscription_plan, is_active, approval_status')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load merchants', description: error.message, variant: 'destructive' });
      return;
    }
    setMerchants((data || []) as Merchant[]);
  }, [toast]);

  useEffect(() => { fetchMerchants(); }, [fetchMerchants]);

  const toggleSuspend = async (m: Merchant) => {
    const newState = !m.is_active;
    const functionName = newState ? 'activate-user' : 'suspend-user';
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        entity_type: 'merchant',
        entity_id: m.id,
        reason: newState ? undefined : 'Suspended by admin',
      },
    });

    if (error || data?.error) {
      toast({ title: 'Update failed', description: data?.error || error?.message || 'Error', variant: 'destructive' });
      return;
    }

    toast({ title: newState ? 'Merchant activated' : 'Merchant suspended' });
    fetchMerchants();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('merchants').delete().eq('id', deleting.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Merchant deleted' });
      fetchMerchants();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Merchant Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all registered merchants.</p>
        </div>
        <AddMerchantDialog onCreated={fetchMerchants}>
          <Button>Add Merchant</Button>
        </AddMerchantDialog>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl overflow-hidden border-none shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">No merchants found</TableCell>
                </TableRow>
              ) : merchants.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.business_name}</TableCell>
                  <TableCell>{m.owner_name}<br/><span className="text-xs text-gray-500">{m.owner_email}</span></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {m.subscription_plan || 'basic'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={m.is_active ? 'bg-green-500' : 'bg-red-500'}>
                      {m.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost" size="icon" title="Login As Merchant"
                      onClick={async () => {
                        await startImpersonation('merchant', m.id, m.business_name);
                        navigate('/dashboard');
                      }}
                    >
                      <LogIn className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(m)}>
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      title={m.is_active ? 'Suspend' : 'Activate'}
                      onClick={() => toggleSuspend(m)}
                    >
                      {m.is_active
                        ? <Ban className="w-4 h-4 text-orange-600" />
                        : <CheckCircle className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(m)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editing && (
        <EditMerchantDialog
          merchant={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={() => { setEditing(null); fetchMerchants(); }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete merchant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleting?.business_name}</strong> and all of its stores. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
