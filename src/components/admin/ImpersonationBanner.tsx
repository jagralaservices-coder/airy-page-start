import React from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonationState, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonationState) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between z-50 sticky top-0 shadow-md animate-in slide-in-from-top-full">
      <div className="flex items-center space-x-2 font-medium">
        <AlertTriangle className="h-5 w-5 animate-pulse text-yellow-300" />
        <span>
          EMERGENCY SUPPORT MODE: Impersonating {impersonationState.type === 'merchant' ? 'Merchant' : 'Store'} - <strong className="text-yellow-300">{impersonationState.name}</strong>
        </span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={stopImpersonation}
        className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Exit Impersonation
      </Button>
    </div>
  );
}
