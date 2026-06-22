import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportCenterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Report Center</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sales Reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start"><Download className="w-4 h-4 mr-2" /> Download Daily Sales (CSV)</Button>
            <Button variant="outline" className="w-full justify-start"><Download className="w-4 h-4 mr-2" /> Download Monthly Revenue (PDF)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
