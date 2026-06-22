import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS } from '@/contexts/POSContext';
import { Search, Barcode, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LinkBarcodeDialogProps {
  scannedCode: string | null;
  onClose: () => void;
}

export const LinkBarcodeDialog: React.FC<LinkBarcodeDialogProps> = ({ scannedCode, onClose }) => {
  const { menuItems, updateMenuItem, addToCart } = usePOS();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return menuItems.slice(0, 20);
    const q = search.toLowerCase();
    return menuItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [menuItems, search]);

  const handleLink = (itemId: string) => {
    if (!scannedCode) return;
    updateMenuItem(itemId, { sku: scannedCode.toUpperCase() });
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
      addToCart(item);
      toast.success(`Barcode linked to "${item.name}" and added to cart`);
    }
    onClose();
  };

  return (
    <Dialog open={!!scannedCode} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="w-5 h-5" />
            Link Barcode to Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Scanned Code</p>
            <p className="font-mono font-bold text-lg">{scannedCode}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            No item matched this barcode. Select an item to link it:
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[250px]">
            <div className="space-y-1">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLink(item.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category} • ₹{item.price}</p>
                  </div>
                  {item.sku && (
                    <span className="text-xs font-mono text-muted-foreground">{item.sku}</span>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No items found</p>
              )}
            </div>
          </ScrollArea>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
