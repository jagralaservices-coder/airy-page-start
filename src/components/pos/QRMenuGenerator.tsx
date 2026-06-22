import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface QRMenuGeneratorProps {
  className?: string;
  iconClassName?: string;
}

export const QRMenuGenerator: React.FC<QRMenuGeneratorProps> = ({ className, iconClassName }) => {
  const { activeStore } = usePOS();
  const [copied, setCopied] = useState(false);

  const storeCode = activeStore?.storeCode || '';
  
  // Always use the live published domain — never Lovable preview
  const getLiveDomain = () => {
    const hostname = window.location.hostname;
    // If we're on a custom domain or published domain, use that
    if (!hostname.includes('lovable')) {
      return window.location.origin;
    }
    // Fallback to published lovable URL
    return 'https://MAXORA-pos.lovable.app';
  };
  
  const menuUrl = `${getLiveDomain()}/menu/${storeCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = `QR-Menu-${storeCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!storeCode) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className={cn("h-8 w-8 flex-shrink-0", className)}>
          <QrCode className={cn("w-3.5 h-3.5", iconClassName)} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Menu Code
          </DialogTitle>
          <DialogDescription>
            Customer is QR scan karke directly menu dekh sakta hai
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex justify-center p-4 bg-white rounded-xl border">
            <QRCodeSVG
              id="qr-code-svg"
              value={menuUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground break-all px-2 bg-muted/50 rounded-lg py-2">{menuUrl}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button className="flex-1" onClick={downloadQR}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
