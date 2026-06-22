import React, { useState } from 'react';
import { User, X, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ActiveStaff {
  id: string;
  user_id: string;
  name: string;
  staffCode: string;
  role: string;
  store_id: string;
}

interface StaffPinLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffLogin: (staff: ActiveStaff) => void;
  storeId: string;
  staffList: Array<{
    id: string;
    user_id: string;
    staff_code: string | null;
    full_name?: string;
    role: string;
  }>;
}

export const StaffPinLogin: React.FC<StaffPinLoginProps> = ({
  isOpen,
  onClose,
  onStaffLogin,
  storeId,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Email and password are required');
      return;
    }

    setIsLoading(true);
    try {
      // Sign in with email + password via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (authError) {
        toast.error(authError.message.includes('Invalid login') 
          ? 'Invalid email or password' 
          : authError.message);
        return;
      }

      if (!authData.user) {
        toast.error('Login failed');
        return;
      }

      // Verify user has staff role for this store
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .in('role', ['staff', 'store_manager'])
        .maybeSingle();

      if (roleError || !roleData) {
        toast.error('No active staff account found for this email');
        await supabase.auth.signOut();
        return;
      }

      // Verify store match
      if (roleData.store_id !== storeId) {
        toast.error('This account is not linked to this store');
        await supabase.auth.signOut();
        return;
      }

      const staffName = authData.user.user_metadata?.full_name || authData.user.email || 'Staff';

      const activeStaff: ActiveStaff = {
        id: roleData.id,
        user_id: authData.user.id,
        name: staffName,
        staffCode: roleData.staff_code || '',
        role: roleData.role,
        store_id: roleData.store_id || storeId,
      };

      // Save staff session
      localStorage.setItem('pos_staff_session', JSON.stringify({
        id: activeStaff.user_id,
        user_id: activeStaff.user_id,
        name: activeStaff.name,
        role: activeStaff.role,
        store_id: activeStaff.store_id,
        staff_code: activeStaff.staffCode,
      }));

      onStaffLogin(activeStaff);
      toast.success(`Welcome, ${activeStaff.name}!`);
      setEmail('');
      setPassword('');
      onClose();
    } catch (error) {
      console.error('Staff login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Staff Login</h2>
              <p className="text-xs text-muted-foreground">Enter your email & password</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Email + Password Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-password">Password</Label>
            <div className="relative">
              <Input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12"
            disabled={!email || !password || isLoading}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Use the email & password provided by your admin
        </p>
      </div>
    </div>
  );
};
