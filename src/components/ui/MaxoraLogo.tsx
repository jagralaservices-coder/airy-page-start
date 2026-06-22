import React from 'react';
import { cn } from '@/lib/utils';
import maxoraLogoImg from '@/assets/maxora-logo-v8.png';

interface MaxoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const MaxoraLogo: React.FC<MaxoraLogoProps> = ({ 
  className, 
  size = 'md',
  showSubtitle = true 
}) => {
  const sizeClasses = {
    sm: { img: 'w-full max-w-[120px] h-auto' },
    md: { img: 'w-full max-w-[200px] h-auto' },
    lg: { img: 'w-full max-w-[320px] h-auto' },
    xl: { img: 'w-full max-w-[520px] h-auto' }, // 520px matches the exact physical text size from the previous padded version!
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center justify-center select-none w-full", className)}>
      {/* 
        v8 Perfectly Tight Cropped Image
        100% transparent, NO empty margins, baked in text.
      */}
      <img 
        src={maxoraLogoImg} 
        alt="MAXORA" 
        className={cn("object-contain drop-shadow-2xl", currentSize.img)} 
      />
    </div>
  );
};
