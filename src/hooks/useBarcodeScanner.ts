import { useEffect, useCallback, useRef, useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { MenuItem } from '@/lib/store';
import { toast } from 'sonner';

interface UseBarcodeScanner {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  lastScannedCode: string | null;
  scanCode: (code: string) => void;
  unmatchedCode: string | null;
  clearUnmatchedCode: () => void;
  isProcessing: boolean;
}

// Cooldown to prevent rapid duplicate scans from scanner hardware jitter
const SCAN_COOLDOWN_MS = 500;

// USB/Keyboard barcode scanners work by rapidly typing characters
const SCAN_THRESHOLD_MS = 50;
const MIN_BARCODE_LENGTH = 3;

export const useBarcodeScanner = (): UseBarcodeScanner => {
  const { menuItems, addToCart, activeStore } = usePOS();
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [unmatchedCode, setUnmatchedCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  
  // Scan queue to prevent race conditions during fast scanning
  const scanQueueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  // Store latest refs to avoid stale closures in keyboard listener
  const menuItemsRef = useRef(menuItems);
  const addToCartRef = useRef(addToCart);
  const activeStoreRef = useRef(activeStore);
  
  useEffect(() => { menuItemsRef.current = menuItems; }, [menuItems]);
  useEffect(() => { addToCartRef.current = addToCart; }, [addToCart]);
  useEffect(() => { activeStoreRef.current = activeStore; }, [activeStore]);

  // Find item by SKU, barcode, or ID — case-insensitive, trimmed
  const findItemByCode = useCallback((code: string): { item: MenuItem; matchType: string } | null => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;
    const items = menuItemsRef.current;
    const storeId = activeStoreRef.current?.id || 'unknown';
    
    console.log(`[BarcodeScanner] Searching for code: "${normalizedCode}" | Store: ${storeId} | Menu items: ${items.length}`);
    
    // Priority 1: Match by SKU (case-insensitive, trimmed)
    for (const item of items) {
      if (item.sku && item.sku.trim().toUpperCase() === normalizedCode) {
        console.log(`[BarcodeScanner] ✅ SKU match: "${item.name}" (SKU: ${item.sku})`);
        return { item, matchType: 'sku' };
      }
      
      // Check variation SKUs
      if (item.variations) {
        for (const variation of item.variations) {
          if (variation.sku && variation.sku.trim().toUpperCase() === normalizedCode) {
            const variantItem: MenuItem = {
              ...item,
              price: variation.price,
              name: `${item.name} (${variation.name})`,
              sku: variation.sku,
            };
            console.log(`[BarcodeScanner] ✅ Variation SKU match: "${variantItem.name}" (SKU: ${variation.sku})`);
            return { item: variantItem, matchType: 'variation_sku' };
          }
        }
      }
    }
    
    // Priority 2: Match by barcode field (exact, case-insensitive)
    for (const item of items) {
      const itemBarcode = item.barcode;
      if (itemBarcode && String(itemBarcode).trim().toUpperCase() === normalizedCode) {
        console.log(`[BarcodeScanner] ✅ Barcode match: "${item.name}" (barcode: ${itemBarcode})`);
        return { item, matchType: 'barcode' };
      }
    }
    
    // Priority 3: Match by item ID (exact, case-insensitive)
    for (const item of items) {
      if (item.id.toUpperCase() === normalizedCode) {
        console.log(`[BarcodeScanner] ✅ ID match: "${item.name}" (ID: ${item.id})`);
        return { item, matchType: 'id' };
      }
    }

    // Priority 4: Partial ID match — scanned code contains or is contained in the UUID
    // Handles cases like "ITEM00F0A1FC" matching UUID "...d73900f0a1fc"
    const cleanCode = normalizedCode.replace(/^ITEM/i, '').replace(/-/g, '');
    if (cleanCode.length >= 6) {
      for (const item of items) {
        const cleanId = item.id.replace(/-/g, '').toUpperCase();
        if (cleanId.endsWith(cleanCode) || cleanId.includes(cleanCode)) {
          console.log(`[BarcodeScanner] ✅ Partial ID match: "${item.name}" (ID: ${item.id}, code: ${cleanCode})`);
          return { item, matchType: 'partial_id' };
        }
      }
    }
    
    console.log(`[BarcodeScanner] ❌ No match found for: "${normalizedCode}" | Checked ${items.length} items`);
    console.log(`[BarcodeScanner] 💡 Tip: Assign SKU/barcode to menu items in Menu Management`);
    return null;
  }, []);

  // Play beep sound
  const playSound = useCallback((type: 'success' | 'error') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } else {
        oscillator.frequency.value = 400;
        oscillator.type = 'square';
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch {
      // Audio not supported
    }
  }, []);

  // Process a single barcode — guaranteed sequential execution
  const processSingleBarcode = useCallback((code: string) => {
    if (code.length < MIN_BARCODE_LENGTH) return;
    
    const now = Date.now();
    if (lastProcessedRef.current.code === code && now - lastProcessedRef.current.time < SCAN_COOLDOWN_MS) {
      console.log(`[BarcodeScanner] ⏳ Cooldown active for: "${code}"`);
      return;
    }
    lastProcessedRef.current = { code, time: now };
    
    setLastScannedCode(code);
    
    const result = findItemByCode(code);
    
    if (result) {
      if (!result.item.isAvailable) {
        toast.error(`${result.item.name} is currently not available`, {
          description: `Scanned: ${code} | Match: ${result.matchType}`
        });
        playSound('error');
        return;
      }
      
      // Use ref to get latest addToCart function
      addToCartRef.current(result.item);
      toast.success(`${result.item.name} added to cart`, {
        description: `via ${result.matchType} match`
      });
      playSound('success');
      console.log(`[BarcodeScanner] 🛒 Added to cart: "${result.item.name}" | Match: ${result.matchType}`);
    } else {
      // Show link dialog for unmatched codes
      setUnmatchedCode(code);
      toast.error(`No item found for barcode: ${code}`, {
        description: `Store: ${activeStoreRef.current?.id || 'unknown'} | Items searched: ${menuItemsRef.current.length}`
      });
      playSound('error');
    }
  }, [findItemByCode, playSound]);

  // Queue-based processor: ensures sequential execution, no race conditions
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    
    while (scanQueueRef.current.length > 0) {
      const code = scanQueueRef.current.shift()!;
      processSingleBarcode(code);
      // Small delay between queue items to let React state settle
      await new Promise(r => setTimeout(r, 50));
    }
    
    processingRef.current = false;
    setIsProcessing(false);
  }, [processSingleBarcode]);

  // Enqueue a barcode for processing
  const enqueueBarcode = useCallback((code: string) => {
    scanQueueRef.current.push(code);
    processQueue();
  }, [processQueue]);

  // Manual scan function for camera scanner
  const scanCode = useCallback((code: string) => {
    enqueueBarcode(code);
  }, [enqueueBarcode]);

  // Handle keyboard input for USB/wireless scanners
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      if (isInputField && !target.dataset.barcodeInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      
      if (timeDiff > SCAN_THRESHOLD_MS && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }
      
      lastKeyTimeRef.current = currentTime;
      
      if (event.key === 'Enter') {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          event.preventDefault();
          enqueueBarcode(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }
      
      if (event.key.length === 1) {
        bufferRef.current += event.key;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
            enqueueBarcode(bufferRef.current);
          }
          bufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isEnabled, enqueueBarcode]);

  const clearUnmatchedCode = useCallback(() => {
    setUnmatchedCode(null);
  }, []);

  return {
    isEnabled,
    setIsEnabled,
    lastScannedCode,
    scanCode,
    unmatchedCode,
    clearUnmatchedCode,
    isProcessing,
  };
};

export default useBarcodeScanner;
