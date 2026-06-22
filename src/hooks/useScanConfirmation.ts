import { useRef, useCallback } from 'react';

interface ScanConfirmationOptions {
  requiredConfirmations?: number; // How many times same code must be detected
  cooldownMs?: number; // Cooldown after a successful scan before same code accepted again
}

/**
 * Hook to debounce and confirm barcode scans.
 * Only fires onConfirmed after the same code is detected `requiredConfirmations` times.
 * Prevents duplicate scans within `cooldownMs`.
 */
export const useScanConfirmation = (
  onConfirmed: (code: string) => void,
  options: ScanConfirmationOptions = {}
) => {
  const { requiredConfirmations = 3, cooldownMs = 2000 } = options;
  
  const candidateRef = useRef<string | null>(null);
  const countRef = useRef(0);
  const lastConfirmedRef = useRef<string | null>(null);
  const lastConfirmedTimeRef = useRef(0);

  const submitScan = useCallback((code: string) => {
    if (!code || code.length < 3) return;
    
    const now = Date.now();
    
    // Short jitter prevention (500ms) - allows repeated scans of same code after cooldown
    if (
      lastConfirmedRef.current === code && 
      now - lastConfirmedTimeRef.current < cooldownMs
    ) {
      return;
    }
    
    // If same candidate, increment count
    if (candidateRef.current === code) {
      countRef.current++;
    } else {
      // New candidate
      candidateRef.current = code;
      countRef.current = 1;
    }
    
    // Confirm if threshold met
    if (countRef.current >= requiredConfirmations) {
      lastConfirmedRef.current = code;
      lastConfirmedTimeRef.current = now;
      candidateRef.current = null;
      countRef.current = 0;
      onConfirmed(code);
    }
  }, [onConfirmed, requiredConfirmations, cooldownMs]);

  const reset = useCallback(() => {
    candidateRef.current = null;
    countRef.current = 0;
  }, []);

  return { submitScan, reset };
};

export default useScanConfirmation;
