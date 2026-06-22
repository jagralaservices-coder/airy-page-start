import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Clock } from 'lucide-react';

interface SalesResetWarningDialogProps {
  isOpen: boolean;
  timeUntilReset: string;
  resetTimeLabel: string;
  onResetNow: () => void;
  onExtend: (minutesToAdd?: number, manualTime?: string) => void;
  onDismiss: () => void;
}

export const SalesResetWarningDialog: React.FC<SalesResetWarningDialogProps> = ({
  isOpen,
  timeUntilReset,
  resetTimeLabel,
  onResetNow,
  onExtend,
  onDismiss,
}) => {
  const [manualTime, setManualTime] = React.useState('');

  return (
    <AlertDialog open={isOpen} onOpenChange={() => undefined}>
      <AlertDialogContent
        className="max-w-md"
        onEscapeKeyDown={(event: KeyboardEvent) => event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            ⚠️ Sale Reset Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-foreground/80">
                Your sale will reset in <strong className="text-primary">{timeUntilReset || '0m'}</strong> <strong className="text-foreground">({resetTimeLabel})</strong>.
                {' '}Please complete pending bills.
              </p>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Time remaining: {timeUntilReset || '0m'}
                </span>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground">Extend Time</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onExtend(10)}>
                    +10 min
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onExtend(30)}>
                    +30 min
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onExtend(60)}>
                    +1 hour
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="h-8 text-xs" />
                  <Button size="sm" className="h-8 px-2 text-xs" disabled={!manualTime} onClick={() => onExtend(undefined, manualTime)}>
                    Set Time
                  </Button>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={onDismiss}>
            Cancel
          </Button>
          <Button variant="destructive" className="h-8 px-3 text-xs" onClick={onResetNow}>
            Reset Now
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
