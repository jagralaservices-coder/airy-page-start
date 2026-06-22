import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MenuItem } from '@/lib/store';
import { Printer, Plus, Minus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { directPrint } from '@/lib/printUtils';

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
}

interface BarcodeSettings {
  format: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
  width: number;
  height: number;
  showText: boolean;
  showPrice: boolean;
  showName: boolean;
  copies: number;
  fontSize: number;
}

const DEFAULT_SETTINGS: BarcodeSettings = {
  format: 'CODE128',
  width: 2,
  height: 60,
  showText: true,
  showPrice: true,
  showName: true,
  copies: 1,
  fontSize: 12
};

export const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onOpenChange,
  menuItem
}) => {
  const [settings, setSettings] = useState<BarcodeSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [barcodeValue, setBarcodeValue] = useState('');

  useEffect(() => {
    if (menuItem) {
      // Use SKU or generate from item ID
      const code = menuItem.sku || `ITEM${menuItem.id.slice(-8).toUpperCase()}`;
      setBarcodeValue(code);
    }
  }, [menuItem]);

  useEffect(() => {
    if (barcodeRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: settings.format,
          width: settings.width,
          height: settings.height,
          displayValue: settings.showText,
          fontSize: settings.fontSize,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [barcodeValue, settings]);

  const handlePrint = () => {
    if (!menuItem || !barcodeRef.current) return;

    const labelHtml = generatePrintHtml();
    directPrint(labelHtml, () => {
      toast.success(`Printed ${settings.copies} barcode label(s)`);
      onOpenChange(false);
    });
  };

  const generatePrintHtml = () => {
    if (!menuItem || !barcodeRef.current) return '';

    const svgHtml = barcodeRef.current.outerHTML;
    const labels = Array(settings.copies).fill(null).map(() => `
      <div class="label">
        ${settings.showName ? `<div class="name">${menuItem.name}</div>` : ''}
        <div class="barcode">${svgHtml}</div>
        ${settings.showPrice ? `<div class="price">₹${menuItem.price}</div>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { 
            size: 50mm 30mm; 
            margin: 2mm; 
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
          }
          .label {
            width: 46mm;
            padding: 2mm;
            text-align: center;
            page-break-after: always;
            background: white;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .name {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .barcode svg {
            max-width: 100%;
            height: auto;
          }
          .price {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 2mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${labels}</body>
      </html>
    `;
  };

  if (!menuItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Barcode Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="border border-border rounded-lg p-4 bg-white flex flex-col items-center">
            {settings.showName && (
              <p className="font-bold text-sm text-black mb-1">{menuItem.name}</p>
            )}
            <svg ref={barcodeRef} className="max-w-full" />
            {settings.showPrice && (
              <p className="font-bold text-sm text-black mt-1">₹{menuItem.price}</p>
            )}
          </div>

          {/* Barcode Value */}
          <div>
            <Label>Barcode Value (SKU)</Label>
            <Input
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value.toUpperCase())}
              placeholder="Enter barcode value"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {menuItem.sku ? 'Using item SKU' : 'Auto-generated from item ID'}
            </p>
          </div>

          {/* Copies */}
          <div>
            <Label>Number of Copies</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSettings(s => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={settings.copies}
                onChange={(e) => setSettings(s => ({ ...s, copies: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-20 text-center"
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSettings(s => ({ ...s, copies: s.copies + 1 }))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Settings Toggle */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {showSettings ? 'Hide' : 'Show'} Advanced Settings
          </Button>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Format</Label>
                  <select
                    value={settings.format}
                    onChange={(e) => setSettings(s => ({ ...s, format: e.target.value as any }))}
                    className="w-full p-2 bg-background rounded border border-border text-sm"
                  >
                    <option value="CODE128">CODE128</option>
                    <option value="CODE39">CODE39</option>
                    <option value="EAN13">EAN13</option>
                    <option value="UPC">UPC</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Bar Height</Label>
                  <Input
                    type="number"
                    value={settings.height}
                    onChange={(e) => setSettings(s => ({ ...s, height: parseInt(e.target.value) || 60 }))}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showText}
                    onChange={(e) => setSettings(s => ({ ...s, showText: e.target.checked }))}
                    className="rounded"
                  />
                  Show Code
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showName}
                    onChange={(e) => setSettings(s => ({ ...s, showName: e.target.checked }))}
                    className="rounded"
                  />
                  Show Name
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showPrice}
                    onChange={(e) => setSettings(s => ({ ...s, showPrice: e.target.checked }))}
                    className="rounded"
                  />
                  Show Price
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Print ({settings.copies} label{settings.copies > 1 ? 's' : ''})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
