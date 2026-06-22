import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface RemoveBackupFilesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const removalReasons = [
  'Menu Reset changes',
  'Error Resolution',
  'Data Synchronisation Issues',
  'System Error or Crashes',
  'Network Connectivity Problems',
  'Software Updates',
  'Configuration Changes',
  'Security Concerns',
  'Performance Optimisation',
  'Others'
];

export const RemoveBackupFilesDialog: React.FC<RemoveBackupFilesDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const handleSave = () => {
    if (!password.trim()) {
      toast.error('Please enter password');
      return;
    }
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    // Save to localStorage
    const removalData = {
      reason: selectedReason,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pos_remove_backup_files', JSON.stringify(removalData));
    
    toast.success('Backup files removed successfully');
    handleClose();
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setSelectedReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Remove Backup Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Password Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                placeholder="Enter password"
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

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Select your Reason <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {removalReasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-3">
                  <RadioGroupItem value={reason} id={`backup-reason-${reason}`} />
                  <Label 
                    htmlFor={`backup-reason-${reason}`} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
