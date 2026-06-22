import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash or stored flag or active session
    const hash = window.location.hash;
    const isRecoveryFlag = localStorage.getItem('is_password_recovery') === 'true';
    
    if (hash.includes('type=recovery') || isRecoveryFlag) {
      setIsRecovery(true);
      if (isRecoveryFlag) {
        localStorage.removeItem('is_password_recovery');
      }
    } else {
      // Check if user is logged in (session exists)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsRecovery(true);
        } else {
          toast({ title: 'Invalid link', description: 'This password reset link is invalid or expired.', variant: 'destructive' });
          navigate('/auth', { replace: true });
        }
      });
    }
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.toLowerCase().includes('weak')) {
          toast({
            title: 'Error',
            description: error.message + ' (Tip: Supabase Dashboard -> Authentication -> Email Provider Settings mein "Enforce password complexity" checkbox ko uncheck karein to disable this restriction).',
            variant: 'destructive'
          });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Success', description: 'Password updated successfully! Please login with your new password.' });
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 rounded-t-lg text-primary-foreground">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-foreground/20 rounded-xl">
                <KeyRound className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Reset Password</h1>
                <p className="text-sm text-primary-foreground/80">Enter your new password</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
