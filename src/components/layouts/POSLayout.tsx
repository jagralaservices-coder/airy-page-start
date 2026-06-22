import React, { useState } from 'react';
import { Sidebar } from '@/components/pos/Sidebar';
import { cn } from '@/lib/utils';

interface POSLayoutProps {
  children: React.ReactNode;
}

export const POSLayout: React.FC<POSLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main
        className={cn(
          'min-h-screen transition-all duration-300 p-4 lg:p-6',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
};
