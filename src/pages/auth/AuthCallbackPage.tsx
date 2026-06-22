import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check user role to determine redirect
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (roleData) {
            switch (roleData.role) {
              case 'super_admin':
              case 'admin':
                navigate('/admin/dashboard', { replace: true });
                return;
              case 'owner':
                navigate('/settings', { replace: true });
                return;
              case 'store_manager':
                navigate('/pos', { replace: true });
                return;
              case 'staff':
                navigate('/staff-dashboard', { replace: true });
                return;
            }
          }
          
          // Fallback: authenticated but no role
          navigate('/dashboard', { replace: true });
        } else {
          // No session - redirect to auth
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
