import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Inbox } from 'lucide-react';

export default function AIInsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Sparkles className="text-blue-500" /> AI Insights
      </h1>
      <Card>
        <CardHeader><CardTitle>Business Health Score</CardTitle></CardHeader>
        <CardContent className="h-56 flex flex-col items-center justify-center text-muted-foreground">
          <Inbox className="w-10 h-10 mb-2" />
          <p className="text-sm">No AI insights generated yet.</p>
          <p className="text-xs mt-1">Insights will appear once enough operational data is available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
