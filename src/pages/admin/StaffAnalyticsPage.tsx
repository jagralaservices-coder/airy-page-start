import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CalendarOff, TrendingUp, Inbox } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function StaffAnalyticsPage() {
  const [stats, setStats] = useState({ total: 0, activeToday: 0 });
  const [distribution, setDistribution] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [roles, todayAtt] = await Promise.all([
        supabase.from('user_roles').select('role, is_active').eq('is_active', true).limit(10000),
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .gte('check_in', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);
      if (cancelled) return;
      const all = (roles.data ?? []) as any[];
      const byRole = new Map<string, number>();
      all.forEach((r) => byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1));
      setDistribution(Array.from(byRole.entries()).map(([name, value]) => ({ name, value })));
      setStats({ total: all.length, activeToday: todayAtt.count ?? 0 });
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Staff Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live workforce distribution across merchants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total.toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.activeToday}</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <CalendarOff className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-400">—</div></CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sales per Staff</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-400">—</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
        <CardHeader><CardTitle>Role Distribution</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          {distribution.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Inbox className="w-10 h-10 mb-2" />
              <p className="text-sm">No staff data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
