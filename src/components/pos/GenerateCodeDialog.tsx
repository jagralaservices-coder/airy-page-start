import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface GenerateCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateRandomCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const GenerateCodeDialog: React.FC<GenerateCodeDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const generateNewCode = useCallback(() => {
    setCode(generateRandomCode());
    setTimeLeft(300);
  }, []);

  useEffect(() => {
    if (isOpen && !code) {
      generateNewCode();
    }
  }, [isOpen, code, generateNewCode]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewCode();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, generateNewCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleClose = () => {
    setCode('');
    setTimeLeft(300);
    onClose();
  };

  // Generate QR code data (could be a URL or connection string)
  const qrData = `pos-connect://${code}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Pairing Code</DialogTitle>
          <DialogDescription className="sr-only">
            Scan the QR code or use the pairing code to connect your device
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code */}
          <div className="p-4 bg-background border border-border rounded-lg">
            <QRCodeSVG
              value={qrData}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* QR Code Description */}
          <p className="text-sm text-center text-muted-foreground">
            Scan this QR in your Captain App to connect with POS (Must be on same network)
          </p>

          {/* Code Input with Copy Button */}
          <div className="w-full relative">
            <Input
              value={code}
              readOnly
              className="text-center text-lg font-semibold pr-10"
            />
            <button
              onClick={handleCopyCode}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Timer and Regenerate */}
          <div className="w-full flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Code expire in <span className="text-destructive font-medium">{formatTime(timeLeft)}</span>
            </p>
            <button
              onClick={generateNewCode}
              className="text-sm text-primary hover:underline font-medium"
            >
              Regenerate Code
            </button>
          </div>

          {/* Info Text */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-primary">
              Use this code on the client terminal to link it with this POS. You can connect secondary billing or KOT terminals. Make sure all are on the same Network.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
