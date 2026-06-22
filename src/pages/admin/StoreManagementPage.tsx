import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LogIn, Edit, Ban, Trash2, CheckCircle } from 'lucide-react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useNavigate } from 'react-router-dom';
import AddStoreDialog from '@/components/admin/AddStoreDialog';
import EditStoreDialog from '@/components/admin/EditStoreDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchStores, suspendStore, activateStore, deleteStore, type StoreRow,
} from '@/store/slices/storeSlice';

export default function StoreManagementPage() {
  const dispatch = useAppDispatch();
  const { list: stores, isLoading, error } = useAppSelector((s) => s.store);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<StoreRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const refresh = () => dispatch(fetchStores());
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (error) toast({ title: 'Store error', description: error, variant: 'destructive' });
  }, [error, toast]);

  const filtered = (stores || []).filter((s) => {
    if (!s) return false;
    const q = searchQuery.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const owner = (s.customers?.business_name || s.merchants?.business_name || '').toLowerCase();
    const email = (s.customers?.owner_email || '').toLowerCase();
    return name.includes(q) || owner.includes(q) || email.includes(q);
  });

  const toggleSuspend = async (s: StoreRow) => {
    const result = s.is_active
      ? await dispatch(suspendStore({ store_id: s.id, reason: 'Suspended by super admin' }))
      : await dispatch(activateStore({ store_id: s.id }));
    const ok = s.is_active ? suspendStore.fulfilled.match(result) : activateStore.fulfilled.match(result);
    if (ok) {
      toast({ title: s.is_active ? 'Store suspended' : 'Store activated' });
      refresh();
    } else {
      toast({ title: 'Update failed', description: (result as any).payload || 'Error', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteStore({ store_id: deleting.id }));
    if (deleteStore.fulfilled.match(result)) toast({ title: 'Store deleted' });
    else toast({ title: 'Delete failed', description: (result.payload as string) || 'Error', variant: 'destructive' });
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Store Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all outlets.</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search stores or merchants..."
              className="pl-8 w-[250px] bg-white dark:bg-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <AddStoreDialog onCreated={refresh}>
            <Button>Add Store</Button>
          </AddStoreDialog>
        </div>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Owner / Business</TableHead>
                  <TableHead>Owner Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-white">{store.name}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      {store.customers?.business_name || store.merchants?.business_name || '—'}
                      {store.customers?.owner_name ? <div className="text-xs text-gray-500">{store.customers.owner_name}</div> : null}
                    </TableCell>
                    <TableCell className="text-gray-500 font-mono text-xs">{store.customers?.owner_email || '—'}</TableCell>
                    <TableCell className="text-gray-500">{store.city || '—'}</TableCell>
                    <TableCell>
                      <Badge className={store.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                        {store.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost" size="icon" title="Login As Store"
                        onClick={async () => {
                          await startImpersonation('store', store.id, store.name);
                          navigate('/pos');
                        }}
                      >
                        <LogIn className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" title="Edit"
                        onClick={() => setEditingId(store.id)}
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title={store.is_active ? 'Suspend' : 'Activate'}
                        onClick={() => toggleSuspend(store)}
                      >
                        {store.is_active
                          ? <Ban className="w-4 h-4 text-orange-600" />
                          : <CheckCircle className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(store)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {isLoading ? 'Loading…' : 'No stores found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleting?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStoreDialog
        storeId={editingId}
        open={!!editingId}
        onOpenChange={(open) => !open && setEditingId(null)}
        onSaved={refresh}
      />
    </div>
  );
}
