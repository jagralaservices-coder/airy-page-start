import React from 'react';
import { MenuManagement } from '@/components/pos/MenuManagement';
import { MobileMenuManagement } from '@/components/pos/MobileMenuManagement';
import { useIsMobile } from '@/hooks/use-mobile';

const MenuPage: React.FC = () => {
  const isMobile = useIsMobile();
  
  // Show simplified mobile layout on phones
  if (isMobile) {
    return <MobileMenuManagement />;
  }
  
  return <MenuManagement />;
};

export default MenuPage;
