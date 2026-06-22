import React from 'react';
import { CashTopUpDialog } from '@/components/pos/CashTopUpDialog';
import { useNavigate } from 'react-router-dom';

const CashTopUpPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-4">
      <CashTopUpDialog isOpen={true} onClose={() => navigate(-1)} />
    </div>
  );
};

export default CashTopUpPage;
