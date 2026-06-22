import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Activity, Users, Inbox } from 'lucide-react';

export default function SystemAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">System Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time system health and performance monitoring.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center"><Users className="w-4 h-4 mr-2" /> Online Users</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-gray-400">—</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center"><Activity className="w-4 h-4 mr-2" /> Active Sessions</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-gray-400">—</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center"><Server className="w-4 h-4 mr-2" /> Server Load</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-gray-400">—</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>CPU & Memory Usage (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex flex-col items-center justify-center text-gray-400">
          <Inbox className="w-12 h-12 mb-3" />
          <p className="text-sm">No infrastructure metrics connected yet</p>
          <p className="text-xs mt-1">Connect a monitoring source to populate this view.</p>
        </CardContent>
      </Card>
    </div>
  );
}
