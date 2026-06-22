import React, { useState } from 'react';
import { User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StaffLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (staffData: any) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStaffLogin = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Enter valid email address');
      return;
    }

    if (!password || password.length < 4) {
      toast.error('Enter valid password or PIN');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-login', {
        body: {
          email: email.trim().toLowerCase(),
          password,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Login failed');

      // Populate legacy store data in localStorage to preserve other state references
      localStorage.setItem('pos_active_store_data', JSON.stringify({
        id: data.store_id,
        storeId: data.store_id,
        storeName: data.store_name,
        storeAddress: data.store_address,
        storePhone: data.store_phone,
        customerId: data.customer_id,
        storeCode: data.store_code,
      }));

      const staffSession = {
        id: data.staff_code || data.user_id,
        user_id: data.user_id,
        name: data.name || 'Staff',
        email: data.email || email,
        role: data.role,
        store_id: data.store_id,
        store_name: data.store_name,
        staff_code: data.staff_code || null,
      };

      localStorage.setItem('pos_staff_session', JSON.stringify(staffSession));
      localStorage.setItem('logged_in_staff', JSON.stringify({
        id: data.staff_code || data.user_id,
        name: data.name || 'Staff',
        role: data.role,
        phone: data.store_phone || '',
        store_id: data.store_id,
      }));
      
      toast.success(`Welcome ${staffSession.name}!`);
      onLogin?.(staffSession);
      onClose();
      
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card rounded-xl p-6 w-[400px] shadow-2xl animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Staff Login</h2>
          <p className="text-sm text-muted-foreground">Sign in with email and password</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl font-sans"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password or PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 rounded-xl"
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
            onClick={handleStaffLogin} 
            className="w-full rounded-xl"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          
          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};