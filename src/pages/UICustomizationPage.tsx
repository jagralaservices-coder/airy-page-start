import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UICustomizationPanel } from '@/components/pos/UICustomizationPanel';

const UICustomizationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <UICustomizationPanel onBack={() => navigate(-1)} />
    </div>
  );
};

export default UICustomizationPage;
