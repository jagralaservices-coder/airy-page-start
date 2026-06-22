import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileHeader } from '@/components/pos/MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  // Enable keyboard shortcuts globally
  useKeyboardShortcuts();

  // Mobile Layout - No sidebar, simplified header with safe area padding
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full safe-area-inset">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-safe">
          {children}
        </main>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background w-full">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Header shifts with sidebar */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-40 transition-all duration-200",
          sidebarCollapsed ? "left-[72px]" : "left-60"
        )}
      >
        <AppHeader />
      </div>

      {/* Main content below header, shifts with sidebar */}
      <main 
        className={cn(
          "pt-14 overflow-auto transition-all duration-200",
          sidebarCollapsed ? "ml-[72px]" : "ml-60"
        )}
      >
        {children}
      </main>
    </div>
  );
};
