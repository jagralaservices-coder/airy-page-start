import { useState, useCallback } from 'react';

interface BiometricResult {
  success: boolean;
  method?: 'fingerprint' | 'face';
  error?: string;
}

export const useBiometricAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean | null>(null);

  const checkBiometricAvailability = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) {
        setIsBiometricAvailable(false);
        return false;
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsBiometricAvailable(available);
      return available;
    } catch {
      setIsBiometricAvailable(false);
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<BiometricResult> => {
    setIsAuthenticating(true);

    try {
      // Check if Web Authentication API is available
      if (!window.PublicKeyCredential) {
        setIsAuthenticating(false);
        return { 
          success: false, 
          error: 'Biometric authentication not supported on this device' 
        };
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        setIsAuthenticating(false);
        return { 
          success: false, 
          error: 'No biometric sensor found. Please use PIN instead.' 
        };
      }

      // Create a challenge for authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'MAXORA',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16),
            name: 'staff@MAXORA.pos',
            displayName: 'Staff Member'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      setIsAuthenticating(false);

      if (credential) {
        return { 
          success: true, 
          method: 'fingerprint' // Could be face or fingerprint, platform dependent
        };
      }

      return { success: false, error: 'Authentication failed' };

    } catch (error: any) {
      setIsAuthenticating(false);
      
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Authentication cancelled by user' };
      }
      
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error. Please try again.' };
      }

      return { 
        success: false, 
        error: 'Biometric authentication failed. Please use PIN.' 
      };
    }
  }, []);

  // Simplified biometric check for demo purposes
  const quickBiometricCheck = useCallback(async (): Promise<BiometricResult> => {
    setIsAuthenticating(true);

    // Simulate biometric check with a small delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Check if biometric is available
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          setIsAuthenticating(false);
          // For demo, we'll succeed after the simulated check
          return { success: true, method: 'fingerprint' };
        }
      }
      
      setIsAuthenticating(false);
      return { 
        success: false, 
        error: 'Biometric not available. Proceeding with PIN.' 
      };
    } catch {
      setIsAuthenticating(false);
      return { success: true, method: 'fingerprint' }; // Allow for demo
    }
  }, []);

  return {
    authenticate,
    quickBiometricCheck,
    checkBiometricAvailability,
    isAuthenticating,
    isBiometricAvailable
  };
};
