import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ResetSyncCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetSyncCodeDialog: React.FC<ResetSyncCodeDialogProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');

  const reasons = [
    'Menu Reset changes',
    'Error Resolution',
    'Data Synchronisation Issues',
    'System Error or Crashes',
    'Network Connectivity Problems',
    'Software Updates',
    'Configuration Changes',
    'Security Concerns',
    'Performance Optimisation',
    'Others',
  ];

  const handleSave = () => {
    if (!password) {
      toast.error('Password is required');
      return;
    }
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    const settings = {
      reason,
      lastReset: new Date().toISOString(),
    };
    localStorage.setItem('pos_reset_sync_code', JSON.stringify(settings));
    toast.success('Sync code reset successfully');
    setPassword('');
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Reset Sync Code</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Password */}
          <div className="space-y-2">
            <Label>Password <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Select Reason */}
          <div className="space-y-3">
            <Label>Select your Reason <span className="text-destructive">*</span></Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {reasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r.replace(/\s+/g, '-').toLowerCase()} />
                  <Label htmlFor={r.replace(/\s+/g, '-').toLowerCase()} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
        </div>
      </div>
    </div>
  );
};
