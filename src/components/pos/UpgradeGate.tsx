import React from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UpgradeGateProps {
  requiredTier: string;
  featureName: string;
  children: React.ReactNode;
  className?: string;
}

export const UpgradeGate: React.FC<UpgradeGateProps> = ({ requiredTier, featureName, children, className }) => {
  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none opacity-40 blur-[1px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl border border-border">
        <Lock className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm font-semibold text-foreground">{featureName}</p>
        <Badge variant="secondary" className="mt-1">
          {requiredTier.toUpperCase()} Plan Required
        </Badge>
        <p className="text-xs text-muted-foreground mt-2 px-4 text-center">
          Upgrade your plan to unlock this feature
        </p>
      </div>
    </div>
  );
};

// Inline badge for sidebar items
export const GoldBadge: React.FC = () => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto border-amber-500/50 text-amber-500">
    GOLD
  </Badge>
);

export const PlatinumBadge: React.FC = () => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto border-purple-500/50 text-purple-500">
    PLATINUM
  </Badge>
);

// Backward compat aliases
export const ProBadge = GoldBadge;
export const EnterpriseBadge = PlatinumBadge;
