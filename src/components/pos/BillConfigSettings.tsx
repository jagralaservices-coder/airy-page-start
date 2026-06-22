import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface BillConfig {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  upiId: string;
}

export const BillConfigSettings: React.FC = () => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [config, setConfig] = useState<BillConfig>({
    businessName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    fssai: '',
    logoUrl: '',
    logoWidth: 160,
    logoHeight: 80,
    upiId: '',
  });

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<BillConfig>('pos_bill_config');
    if (saved) {
      setConfig(prev => ({ ...prev, ...saved }));
    }
  }, [isLoaded, getSetting]);

  const handleSave = () => {
    saveSetting('pos_bill_config', config);
    toast.success('Bill configuration saved!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        toast.error('Logo file too large (max 2MB)');
        return;
      }
      // Compress & resize for thermal printer (160px wide, B&W, tiny Base64)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = config.logoWidth || 160;
        const MAX_H = config.logoHeight || 80;
        let w = img.width;
        let h = img.height;
        if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
        if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        const ctx = canvas.getContext('2d')!;
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Convert to grayscale for thermal printer
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
          // High contrast threshold for thermal
          const bw = gray > 180 ? 255 : 0;
          d[i] = d[i+1] = d[i+2] = bw;
        }
        ctx.putImageData(imageData, 0, 0);
        const smallBase64 = canvas.toDataURL('image/png');
        console.log('[BillConfig] Logo compressed:', Math.round(smallBase64.length / 1024), 'KB');
        setConfig(prev => ({ ...prev, logoUrl: smallBase64 }));
        toast.success('Logo uploaded & optimized for print!');
      };
      img.onerror = () => toast.error('Failed to load image');
      img.src = URL.createObjectURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Bill Print Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Business Logo</Label>
          <div className="flex items-center gap-4">
            {config.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="h-16 w-auto object-contain border rounded" />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {config.logoUrl && (
              <Button variant="ghost" size="sm" onClick={() => setConfig(prev => ({ ...prev, logoUrl: '' }))}>
                Remove
              </Button>
            )}
          </div>
          
          {/* Logo Size Controls */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Logo Width (px)</Label>
              <Input
                type="number"
                min={40}
                max={300}
                value={config.logoWidth}
                onChange={(e) => setConfig(prev => ({ ...prev, logoWidth: Math.max(40, Math.min(300, parseInt(e.target.value) || 160)) }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logo Height (px)</Label>
              <Input
                type="number"
                min={20}
                max={200}
                value={config.logoHeight}
                onChange={(e) => setConfig(prev => ({ ...prev, logoHeight: Math.max(20, Math.min(200, parseInt(e.target.value) || 80)) }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Size change ke baad logo re-upload karo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input 
              value={config.businessName}
              onChange={(e) => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Your Business Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input 
              value={config.tagline}
              onChange={(e) => setConfig(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="e.g., Best Food in Town!"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea 
            value={config.address}
            onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Full business address"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input 
              value={config.phone}
              onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email"
              value={config.email}
              onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
              placeholder="business@email.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GSTIN</Label>
            <Input 
              value={config.gstin}
              onChange={(e) => setConfig(prev => ({ ...prev, gstin: e.target.value }))}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
          <div className="space-y-2">
            <Label>FSSAI License</Label>
            <Input 
              value={config.fssai}
              onChange={(e) => setConfig(prev => ({ ...prev, fssai: e.target.value }))}
              placeholder="License Number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>UPI ID (for QR on Bill)</Label>
          <Input 
            value={config.upiId}
            onChange={(e) => setConfig(prev => ({ ...prev, upiId: e.target.value }))}
            placeholder="merchant@upi or merchant@paytm"
          />
          <p className="text-xs text-muted-foreground">Bill print mein UPI QR code dikhane ke liye apna UPI ID daalein. Settings → Bill Print mein "Show QR Code" enable karein.</p>
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="w-4 h-4" />
          Save Bill Configuration
        </Button>
      </CardContent>
    </Card>
  );
};
