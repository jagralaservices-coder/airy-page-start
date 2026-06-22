import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScanBarcode } from 'lucide-react';
import { BarcodeScannerDialog } from './BarcodeScannerDialog';
import { usePOS } from '@/contexts/POSContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BarcodeButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const BarcodeButton: React.FC<BarcodeButtonProps> = ({
  className,
  variant = 'outline',
  size = 'icon',
  showLabel = false,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const { menuItems, addToCart, activeStore } = usePOS();
  const storeId = activeStore?.id || 'unknown';

  const handleScan = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    console.log(`[BarcodeButton] Scanned: "${normalizedCode}" | Store: ${storeId} | Items: ${menuItems.length}`);

    if (!normalizedCode || normalizedCode.length < 3) {
      console.log('[BarcodeButton] Code too short, ignoring');
      return;
    }

    setLastScannedCode(code);

    // Priority 1: SKU match (including variations)
    for (const item of menuItems) {
      if (item.sku && item.sku.trim().toUpperCase() === normalizedCode) {
        if (!item.isAvailable) {
          toast.error(`${item.name} is currently not available`);
          return;
        }
        addToCart(item);
        toast.success(`${item.name} added to cart`);
        console.log(`[BarcodeButton] ✅ SKU match: ${item.name}`);
        return;
      }
      if (item.variations) {
        for (const variation of item.variations) {
          if (variation.sku && variation.sku.trim().toUpperCase() === normalizedCode) {
            const variantItem = {
              ...item,
              price: variation.price,
              name: `${item.name} (${variation.name})`,
              sku: variation.sku,
            };
            addToCart(variantItem);
            toast.success(`${variantItem.name} added to cart`);
            console.log(`[BarcodeButton] ✅ Variation SKU match: ${variantItem.name}`);
            return;
          }
        }
      }
    }

    // Priority 2: Barcode field match
    for (const item of menuItems) {
      const itemBarcode = item.barcode;
      if (itemBarcode && String(itemBarcode).trim().toUpperCase() === normalizedCode) {
        if (!item.isAvailable) {
          toast.error(`${item.name} is currently not available`);
          return;
        }
        addToCart(item);
        toast.success(`${item.name} added to cart`);
        console.log(`[BarcodeButton] ✅ Barcode match: ${item.name}`);
        return;
      }
    }

    // Priority 3: ID match
    for (const item of menuItems) {
      if (item.id.toUpperCase() === normalizedCode) {
        if (!item.isAvailable) {
          toast.error(`${item.name} is currently not available`);
          return;
        }
        addToCart(item);
        toast.success(`${item.name} added to cart`);
        console.log(`[BarcodeButton] ✅ ID match: ${item.name}`);
        return;
      }
    }

    // Priority 4: Partial ID match (e.g., "ITEM00F0A1FC" → UUID suffix)
    const cleanCode = normalizedCode.replace(/^ITEM/i, '').replace(/-/g, '');
    if (cleanCode.length >= 6) {
      for (const item of menuItems) {
        const cleanId = item.id.replace(/-/g, '').toUpperCase();
        if (cleanId.endsWith(cleanCode) || cleanId.includes(cleanCode)) {
          if (!item.isAvailable) {
            toast.error(`${item.name} is currently not available`);
            return;
          }
          addToCart(item);
          toast.success(`${item.name} added to cart`);
          console.log(`[BarcodeButton] ✅ Partial ID match: ${item.name}`);
          return;
        }
      }
    }

    toast.error(`No item found for barcode: ${code}`, {
      description: `Assign SKU/barcode to items in Menu Management`
    });
    console.log(`[BarcodeButton] ❌ No match | Code: "${normalizedCode}" | Store: ${storeId}`);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={() => setShowScanner(true)}
            className={cn("relative", className)}
          >
            <ScanBarcode className={cn("h-4 w-4", showLabel && "mr-2")} />
            {showLabel && "Scan Barcode"}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Scan Barcode (Camera/USB)</p>
          {lastScannedCode && (
            <p className="text-xs text-muted-foreground">Last: {lastScannedCode}</p>
          )}
        </TooltipContent>
      </Tooltip>

      <BarcodeScannerDialog
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </>
  );
};

export default BarcodeButton;
