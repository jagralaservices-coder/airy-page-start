import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface FingerprintResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export const useFingerprintAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) {
        setIsAvailable(false);
        return false;
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  // Register a new fingerprint credential for a user
  const registerFingerprint = useCallback(async (userId: string, userName: string): Promise<FingerprintResult> => {
    setIsAuthenticating(true);

    try {
      if (!window.PublicKeyCredential) {
        return { success: false, error: 'Biometric authentication not supported' };
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return { success: false, error: 'No biometric sensor found on this device' };
      }

      // Generate a challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Convert userId to Uint8Array
      const userIdBytes = new TextEncoder().encode(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'MAXORA',
            id: window.location.hostname
          },
          user: {
            id: userIdBytes,
            name: userName,
            displayName: userName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000,
          attestation: 'none'
        }
      }) as PublicKeyCredential | null;

      if (credential) {
        // Store credential ID for later verification
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        
        toast({
          title: 'Fingerprint Registered',
          description: 'You can now use fingerprint for check-in/out',
        });

        return { success: true, credentialId };
      }

      return { success: false, error: 'Registration failed' };

    } catch (error: any) {
      console.error('Fingerprint registration error:', error);
      
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Registration cancelled by user' };
      }
      
      return { success: false, error: 'Failed to register fingerprint' };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  // Authenticate using fingerprint
  const authenticateFingerprint = useCallback(async (): Promise<FingerprintResult> => {
    setIsAuthenticating(true);

    try {
      if (!window.PublicKeyCredential) {
        return { success: false, error: 'Biometric authentication not supported' };
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return { success: false, error: 'No biometric sensor found' };
      }

      // Generate a challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request authentication with any registered credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname
        }
      }) as PublicKeyCredential | null;

      if (assertion) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
        return { success: true, credentialId };
      }

      return { success: false, error: 'Authentication failed' };

    } catch (error: any) {
      console.error('Fingerprint auth error:', error);
      
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Authentication cancelled' };
      }
      
      if (error.name === 'NotSupportedError') {
        return { success: false, error: 'No credentials registered. Please use face verification.' };
      }
      
      return { success: false, error: 'Fingerprint authentication failed' };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  return {
    registerFingerprint,
    authenticateFingerprint,
    checkAvailability,
    isAuthenticating,
    isAvailable
  };
};
