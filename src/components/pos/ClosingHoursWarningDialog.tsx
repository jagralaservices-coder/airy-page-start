import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';

interface ClosingHoursWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  closingTime: string; // Format: "HH:mm"
  onExtend: () => void;
}

export const ClosingHoursWarningDialog: React.FC<ClosingHoursWarningDialogProps> = ({
  isOpen,
  onClose,
  closingTime,
  onExtend,
}) => {
  const { t } = useLocale();
  
  const handleExtend = () => {
    onExtend();
    toast.success(t('dialog.closingTimeExtended'));
    onClose();
  };

  const handleNotNow = () => {
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {t('dialog.closingSoon')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground pt-2">
            {t('dialog.closingSoonDesc')}{' '}
            <span className="font-semibold text-foreground">{closingTime}</span>.
            <br /><br />
            {t('dialog.extendQuestion')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">{t('dialog.currentClosing')}: {closingTime}</span>
          </div>
        </div>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleNotNow}
            className="flex-1"
          >
            {t('common.notNow')}
          </Button>
          <Button
            onClick={handleExtend}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {t('dialog.extend30mins')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
