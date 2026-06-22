import React, { useState } from 'react';
import { WithdrawalDialog } from '@/components/pos/WithdrawalDialog';
import { useNavigate } from 'react-router-dom';

const WithdrawalPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-4">
      <WithdrawalDialog isOpen={true} onClose={() => navigate(-1)} />
    </div>
  );
};

export default WithdrawalPage;
