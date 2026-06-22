import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPPORT_EMAIL = 'support@maxora.com';

const AccountSuspendedPage: React.FC = () => {
  const navigate = useNavigate();

  // Defensive: ensure no active session remains while this page is shown.
  useEffect(() => {
    try {
      localStorage.removeItem('pos_session_active');
      localStorage.removeItem('pos_session_backup');
      localStorage.removeItem('pos_user_backup');
      localStorage.removeItem('pos_user_role_backup');
      localStorage.removeItem('pos_customer_backup');
      localStorage.removeItem('pos_store_backup');
      localStorage.removeItem('pos_staff_session');
      localStorage.removeItem('pos_active_store');
      localStorage.removeItem('pos_active_store_data');
    } catch {}
    void supabase.auth.signOut().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Account Suspended</h1>
              <p className="text-muted-foreground">
                Your account has been suspended.
                <br />
                For more information, please contact support.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="text-muted-foreground mb-1">Support Email</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary break-all">
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Account%20Suspended%20-%20Need%20Help`;
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/', { replace: true })}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSuspendedPage;
