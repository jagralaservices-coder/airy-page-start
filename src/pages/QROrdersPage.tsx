import React from 'react';
import { QROrdersPanel } from '@/components/pos/QROrdersPanel';
import { QRMenuGenerator } from '@/components/pos/QRMenuGenerator';

const QROrdersPage: React.FC = () => {
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">QR scan se aaye hue customer orders</p>
        </div>
        <QRMenuGenerator />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <QROrdersPanel />
      </div>
    </div>
  );
};

export default QROrdersPage;
