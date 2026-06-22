import React, { useState } from 'react';
import { DailySalesReport } from '@/components/pos/DailySalesReport';
import { useNavigate } from 'react-router-dom';

const CashFlowPage: React.FC = () => {
  const navigate = useNavigate();
  
  return <DailySalesReport isOpen={true} onClose={() => navigate(-1)} />;
};

export default CashFlowPage;
