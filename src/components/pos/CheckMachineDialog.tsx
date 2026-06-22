import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Server, Monitor } from 'lucide-react';

interface CheckMachineDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckMachineDialog: React.FC<CheckMachineDialogProps> = ({
  isOpen,
  onClose
}) => {
  // Simulated IP address for current machine
  const currentIP = '192.168.1.2';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Machines</DialogTitle>
          <DialogDescription className="sr-only">
            View connected main server and client machines
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Main Server Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Server className="w-4 h-4" />
              Main Server
            </div>
            <div className="min-h-[200px] rounded-lg border border-border bg-card p-2">
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {currentIP} (You)
              </div>
            </div>
          </div>

          {/* Client Machine Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Monitor className="w-4 h-4" />
              Client Machine
            </div>
            <div className="min-h-[200px] rounded-lg border border-border bg-card p-2">
              {/* Empty - no client machines connected */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
