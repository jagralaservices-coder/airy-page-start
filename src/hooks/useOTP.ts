import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Check for the test mode configuration
const isTestMode = import.meta.env.VITE_OTP_TEST_MODE === 'true';

export function useOTP() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendOTP = async (phone: string) => {
    setIsLoading(true);

    if (isTestMode) {
      console.log("[OTP TEST MODE ENABLED] Bypassing Edge Function.");
      setTimeout(() => {
        setIsSent(true);
        setCountdown(30);
        toast({ 
          title: 'TEST MODE ACTIVE - SMS OTP DISABLED', 
          description: 'Using simulated OTP. Use 123456 to verify.', 
          duration: 6000 
        });
        setIsLoading(false);
      }, 500);
      return true;
    }

    console.log("[OTP TEST MODE DISABLED] Using Production Edge Functions.");
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setIsSent(true);
      setCountdown(30);
      toast({ title: 'OTP Sent', description: 'Please check the mobile number for the verification code.' });
      return true;
    } catch (error: any) {
      toast({ title: 'OTP Failed', description: error.message || 'Failed to send OTP. Please try again.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    setIsLoading(true);

    if (isTestMode) {
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          setIsLoading(false);
          if (otp === '123456') {
            setVerifiedToken('test-token-' + Date.now());
            toast({ title: 'Test Verification Successful' });
            resolve(true);
          } else {
            toast({ title: 'Verification Failed', description: 'Invalid OTP. Use 123456 in test mode.', variant: 'destructive' });
            resolve(false);
          }
        }, 500);
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, otp }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setVerifiedToken(data.verifiedToken);
      return true;
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message || 'Invalid OTP.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetOTPState = () => {
    setIsSent(false);
    setCountdown(0);
    setVerifiedToken(null);
  };

  return {
    sendOTP,
    verifyOTP,
    resetOTPState,
    isLoading,
    isSent,
    countdown,
    verifiedToken
  };
}
