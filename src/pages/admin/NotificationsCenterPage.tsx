import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationsCenterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
      <Card>
        <CardHeader><CardTitle>System Alerts</CardTitle></CardHeader>
        <CardContent>
          <p>Alerts for expiries, failed payments, and low stock across stores.</p>
        </CardContent>
      </Card>
    </div>
  );
}
