import React, { useState, useEffect } from 'react';
import { Shield, Plus, Mail, Clock, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'admin',
  });

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('id, created_at, user_id, role')
        .in('role', ['admin', 'super_admin']);

      if (error) throw error;
      
      if (!rolesData || rolesData.length === 0) {
        setAdmins([]);
        return;
      }

      const userIds = rolesData.map(r => r.user_id).filter(Boolean);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;

      const mergedData = rolesData.map(role => ({
        ...role,
        profiles: profilesData?.find(p => p.id === role.user_id) || null
      }));

      setAdmins(mergedData);
    } catch (error: any) {
      toast({ title: 'Error fetching admins', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-platform-admin', {
        body: formData
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed to create admin');

      toast({ title: 'Success', description: 'Platform Admin account created successfully.' });
      setIsOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'admin' });
      fetchAdmins();
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-platform-admin', {
        body: {
          role_id: editingAdmin.id,
          user_id: editingAdmin.user_id,
          fullName: formData.fullName,
          email: formData.email || undefined,
          password: formData.password || undefined,
          role: formData.role,
        }
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed to update admin');

      toast({ title: 'Success', description: 'Platform Admin account updated successfully.' });
      setIsEditOpen(false);
      setEditingAdmin(null);
      setFormData({ fullName: '', email: '', password: '', role: 'admin' });
      fetchAdmins();
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async (admin: any) => {
    if (user && user.id === admin.user_id) {
      toast({ title: 'Error', description: 'You cannot delete your own account.', variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure you want to delete this admin account?')) return;
    
    setIsDeleting(admin.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-staff', {
        body: { role_id: admin.id }
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed to delete admin');

      toast({ title: 'Success', description: 'Admin deleted successfully.' });
      fetchAdmins();
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditDialog = (admin: any) => {
    setEditingAdmin(admin);
    setFormData({
      fullName: admin.profiles?.full_name || '',
      email: admin.profiles?.email || '',
      password: '',
      role: admin.role || 'admin',
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Platform Admins
          </h2>
          <p className="text-slate-500 mt-1">Manage staff accounts with platform-wide administrative access.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setFormData({ fullName: '', email: '', password: '', role: 'admin' });
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Platform Admin</DialogTitle>
              <DialogDescription>
                This account will have access to manage customers and create owner/store accounts.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.role} 
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input type="password" minLength={6} required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Platform Admin</DialogTitle>
            <DialogDescription>
              Update admin details or set a new temporary password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.role} 
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>New Password (Optional)</Label>
              <Input type="password" minLength={6} placeholder="Leave blank to keep current" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Updating...' : 'Update Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading admins...</div>
        ) : admins.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-100">
            No platform admins found.
          </div>
        ) : (
          admins.map(admin => (
            <Card key={admin.id} className="hover:shadow-md transition-shadow relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary" onClick={() => openEditDialog(admin)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive" onClick={() => handleDeleteAdmin(admin)} disabled={isDeleting === admin.id}>
                  {isDeleting === admin.id ? (
                    <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex flex-col gap-2 pr-20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {admin.profiles?.full_name?.charAt(0) || 'A'}
                    </div>
                    <span className="truncate">{admin.profiles?.full_name || 'Unknown User'}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md w-fit font-medium ${admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 mt-2">
                  <Mail className="w-3.5 h-3.5" />
                  {admin.profiles?.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <Clock className="w-4 h-4" />
                  Created {format(new Date(admin.created_at), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
