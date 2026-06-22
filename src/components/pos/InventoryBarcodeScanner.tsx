import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scan, Search, X, Camera, Keyboard } from 'lucide-react';
import { InventoryItem, MenuItem, getInventory } from '@/lib/store';
import { usePOS } from '@/contexts/POSContext';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

interface InventoryBarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemScanned: (item: InventoryItem | MenuItem, type: 'inventory' | 'menu') => void;
  scanType: 'inventory' | 'menu' | 'both';
  title?: string;
}

export const InventoryBarcodeScanner: React.FC<InventoryBarcodeScannerProps> = ({
  open,
  onOpenChange,
  onItemScanned,
  scanType,
  title = 'Scan Barcode'
}) => {
  const { menuItems } = usePOS();
  const [manualCode, setManualCode] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'keyboard'>('keyboard');
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  
  // Keyboard scanner buffer
  const bufferRef = React.useRef<string>('');
  const lastKeyTimeRef = React.useRef<number>(0);
  const SCAN_THRESHOLD_MS = 50;
  const MIN_BARCODE_LENGTH = 4;

  const findItemByBarcode = useCallback((code: string): { item: InventoryItem | MenuItem; type: 'inventory' | 'menu' } | null => {
    const inventory = getInventory();
    const normalizedCode = code.trim().toUpperCase();
    
    // Search in inventory items
    if (scanType === 'inventory' || scanType === 'both') {
      const inventoryItem = inventory.find(item => 
        item.name.toUpperCase() === normalizedCode ||
        item.id.toUpperCase() === normalizedCode
      );
      if (inventoryItem) {
        return { item: inventoryItem, type: 'inventory' };
      }
    }
    
    // Search in menu items by SKU (case-insensitive, trimmed)
    if (scanType === 'menu' || scanType === 'both') {
      for (const item of menuItems) {
        // Check main item SKU
        if (item.sku && item.sku.trim().toUpperCase() === normalizedCode) {
          return { item: item, type: 'menu' };
        }
        // Check variation SKUs
        if (item.variations) {
          for (const variation of item.variations) {
            if (variation.sku && variation.sku.trim().toUpperCase() === normalizedCode) {
              return { item: { ...item, price: variation.price, name: `${item.name} (${variation.name})`, sku: variation.sku } as MenuItem, type: 'menu' };
            }
          }
        }
        // Check item ID
        if (item.id.toUpperCase() === normalizedCode) {
          return { item: item, type: 'menu' };
        }
      }
    }
    
    return null;
  }, [menuItems, scanType]);

  const processBarcode = useCallback((code: string) => {
    if (code === lastScanned) return; // Prevent duplicate scans
    
    const result = findItemByBarcode(code);
    if (result) {
      setLastScanned(code);
      onItemScanned(result.item, result.type);
      toast.success(`Found: ${result.item.name}`);
      
      // Reset after 2 seconds to allow same item to be scanned again
      setTimeout(() => setLastScanned(''), 2000);
    } else {
      toast.error(`No item found for code: ${code}`);
    }
  }, [findItemByBarcode, lastScanned, onItemScanned]);

  // Keyboard scanner listener
  useEffect(() => {
    if (!open || scanMode !== 'keyboard') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      
      // Reset buffer if too much time has passed (manual typing)
      if (timeDiff > SCAN_THRESHOLD_MS && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }
      
      lastKeyTimeRef.current = currentTime;
      
      if (event.key === 'Enter') {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          processBarcode(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }
      
      // Only add printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, scanMode, processBarcode]);

  // Camera scanner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (open && scanMode === 'camera' && scanning) {
      html5QrCode = new Html5Qrcode('inventory-barcode-reader');
      
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          processBarcode(decodedText);
        },
        () => {}
      ).catch(err => {
        console.error('Camera error:', err);
        toast.error('Failed to start camera');
        setScanning(false);
      });
    }
    
    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [open, scanMode, scanning, processBarcode]);

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      processBarcode(manualCode.trim());
      setManualCode('');
    }
  };

  const handleClose = () => {
    setScanning(false);
    setManualCode('');
    bufferRef.current = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'keyboard' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => {
                setScanMode('keyboard');
                setScanning(false);
              }}
            >
              <Keyboard className="w-4 h-4" />
              USB/Bluetooth
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => {
                setScanMode('camera');
                setScanning(true);
              }}
            >
              <Camera className="w-4 h-4" />
              Camera
            </Button>
          </div>

          {/* Keyboard Scanner Mode */}
          {scanMode === 'keyboard' && (
            <div className="text-center p-6 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
              <Scan className="w-12 h-12 mx-auto mb-3 text-primary animate-pulse" />
              <p className="text-sm font-medium">Ready to Scan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scan a barcode with your USB/Bluetooth scanner
              </p>
            </div>
          )}

          {/* Camera Scanner Mode */}
          {scanMode === 'camera' && (
            <div className="relative">
              <div 
                id="inventory-barcode-reader" 
                className="rounded-lg overflow-hidden bg-black min-h-[200px]"
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Button onClick={() => setScanning(true)}>
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium mb-2">Manual Entry</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode or item name"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              />
              <Button onClick={handleManualSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Recent Scan */}
          {lastScanned && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-success font-medium">Last scanned: {lastScanned}</p>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={handleClose}>
          <X className="w-4 h-4 mr-2" />
          Close Scanner
        </Button>
      </DialogContent>
    </Dialog>
  );
};
