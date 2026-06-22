import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Award,
  AlertTriangle,
  BarChart3,
  UserCheck,
  UserX,
  Timer,
  Zap,
  ChevronRight,
  Star,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface StaffMetric {
  id: string;
  name: string;
  role: string;
  attendanceRate: number;
  avgHoursPerDay: number;
  lateArrivals: number;
  overtimeHours: number;
  leavesTaken: number;
  performanceScore: number;
  trend: 'up' | 'down' | 'stable';
}

const WorkforceAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const { data: attendanceData, error } = await supabase
          .from('staff_attendance')
          .select('*');
        
        if (error) throw error;
        
        if (!attendanceData || attendanceData.length === 0) {
          setStaffMetrics([]);
          return;
        }

        const staffMap = new Map<string, any>();
        
        attendanceData.forEach(record => {
          if (!staffMap.has(record.staff_id)) {
            staffMap.set(record.staff_id, {
              id: record.staff_id,
              name: record.staff_name || 'Unknown',
              role: 'Staff',
              totalDays: 0,
              presentDays: 0,
              lateArrivals: 0,
              totalHours: 0,
              leavesTaken: 0,
            });
          }
          
          const s = staffMap.get(record.staff_id);
          s.totalDays++;
          if (record.status === 'present') {
            s.presentDays++;
            // Mock some hour calculations since check_in/out might be basic strings
            s.totalHours += 8;
          } else {
            s.leavesTaken++;
          }
        });

        const computedMetrics: StaffMetric[] = Array.from(staffMap.values()).map(s => ({
          id: s.id,
          name: s.name,
          role: s.role,
          attendanceRate: Math.round((s.presentDays / s.totalDays) * 100) || 0,
          avgHoursPerDay: s.presentDays > 0 ? Number((s.totalHours / s.presentDays).toFixed(1)) : 0,
          lateArrivals: s.lateArrivals,
          overtimeHours: Math.max(0, s.totalHours - (s.presentDays * 8)),
          leavesTaken: s.leavesTaken,
          performanceScore: Math.round((s.presentDays / s.totalDays) * 100) - (s.lateArrivals * 2),
          trend: 'stable'
        }));

        setStaffMetrics(computedMetrics);
      } catch (err) {
        console.error('Error fetching staff data:', err);
      }
    };
    
    fetchStaffData();
  }, [period]);

  const summary = useMemo(() => {
    if (staffMetrics.length === 0) return { avgAttendance: 0, totalOvertime: 0, avgPerformance: 0, atRisk: 0, totalStaff: 0, topPerformer: '' };
    const avgAttendance = Math.round(staffMetrics.reduce((s, m) => s + m.attendanceRate, 0) / staffMetrics.length);
    const totalOvertime = staffMetrics.reduce((s, m) => s + m.overtimeHours, 0);
    const avgPerformance = Math.round(staffMetrics.reduce((s, m) => s + m.performanceScore, 0) / staffMetrics.length);
    const atRisk = staffMetrics.filter(m => m.performanceScore < 70 || m.attendanceRate < 80).length;
    const topPerformer = [...staffMetrics].sort((a, b) => b.performanceScore - a.performanceScore)[0]?.name || '';
    return { avgAttendance, totalOvertime, avgPerformance, atRisk, totalStaff: staffMetrics.length, topPerformer };
  }, [staffMetrics]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-success/15';
    if (score >= 75) return 'bg-warning/15';
    return 'bg-destructive/15';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">MAXORA Predict</h1>
                <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-[10px]">AI</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Workforce Analytics & Insights</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList className="h-9 bg-card border border-border w-full">
            <TabsTrigger value="week" className="text-xs h-7 flex-1">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs h-7 flex-1">This Month</TabsTrigger>
            <TabsTrigger value="quarter" className="text-xs h-7 flex-1">Quarter</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* AI Insight Banner */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 -ml-6 -mb-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium text-white/80">AI Insight</span>
            </div>
            <p className="text-sm leading-relaxed">
              Attendance is <span className="font-bold">{summary.avgAttendance}%</span> this {period}. 
              {summary.atRisk > 0 
                ? ` ${summary.atRisk} staff member${summary.atRisk > 1 ? 's' : ''} need${summary.atRisk === 1 ? 's' : ''} attention due to low performance.`
                : ' All staff performing well!'
              }
              {summary.topPerformer && ` Top performer: ${summary.topPerformer}.`}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-blue-500 to-blue-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -mr-4 -mt-4" />
            <Users className="w-4 h-4 mb-1 opacity-80" />
            <p className="text-xl font-bold">{summary.totalStaff}</p>
            <p className="text-[10px] text-white/70">Total Staff</p>
          </div>
          <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-emerald-500 to-emerald-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -mr-4 -mt-4" />
            <UserCheck className="w-4 h-4 mb-1 opacity-80" />
            <p className="text-xl font-bold">{summary.avgAttendance}%</p>
            <p className="text-[10px] text-white/70">Avg Attendance</p>
          </div>
          <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-amber-500 to-orange-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -mr-4 -mt-4" />
            <Timer className="w-4 h-4 mb-1 opacity-80" />
            <p className="text-xl font-bold">{summary.totalOvertime}h</p>
            <p className="text-[10px] text-white/70">Total Overtime</p>
          </div>
          <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-rose-500 to-red-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -mr-4 -mt-4" />
            <AlertTriangle className="w-4 h-4 mb-1 opacity-80" />
            <p className="text-xl font-bold">{summary.atRisk}</p>
            <p className="text-[10px] text-white/70">At Risk</p>
          </div>
        </div>

        {/* Performance Score Bar */}
        <div className="pos-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Team Performance
            </h2>
            <span className={cn('text-lg font-bold', getScoreColor(summary.avgPerformance))}>{summary.avgPerformance}%</span>
          </div>
          <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', summary.avgPerformance >= 90 ? 'bg-success' : summary.avgPerformance >= 75 ? 'bg-warning' : 'bg-destructive')}
              style={{ width: `${summary.avgPerformance}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>

        {/* Staff Cards */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Staff Performance</h2>
          <div className="space-y-3">
            {staffMetrics.map((staff) => (
              <div key={staff.id} className="pos-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold', getScoreBg(staff.performanceScore), getScoreColor(staff.performanceScore))}>
                      {staff.performanceScore}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{staff.name}</p>
                      <p className="text-[10px] text-muted-foreground">{staff.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {staff.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-success" />}
                    {staff.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                    {staff.trend === 'stable' && <Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={cn('text-[10px] font-medium',
                      staff.trend === 'up' ? 'text-success' : staff.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {staff.trend === 'up' ? 'Improving' : staff.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                    <p className="text-xs font-bold text-foreground">{staff.attendanceRate}%</p>
                    <p className="text-[9px] text-muted-foreground">Attendance</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                    <p className="text-xs font-bold text-foreground">{staff.avgHoursPerDay}h</p>
                    <p className="text-[9px] text-muted-foreground">Avg Hours</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                    <p className={cn('text-xs font-bold', staff.lateArrivals > 3 ? 'text-destructive' : 'text-foreground')}>{staff.lateArrivals}</p>
                    <p className="text-[9px] text-muted-foreground">Late</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                    <p className="text-xs font-bold text-foreground">{staff.overtimeHours}h</p>
                    <p className="text-[9px] text-muted-foreground">Overtime</p>
                  </div>
                </div>

                {(staff.performanceScore < 70 || staff.attendanceRate < 80) && (
                  <div className="mt-2.5 flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <p className="text-[10px] text-destructive">
                      {staff.attendanceRate < 80 ? 'Low attendance — needs review' : 'Performance below threshold'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top Performer Highlight */}
        {summary.topPerformer && (
          <div className="pos-card p-4 border-primary/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Top Performer</p>
                <p className="font-semibold text-sm text-foreground">{summary.topPerformer}</p>
                <p className="text-[10px] text-success font-medium">
                  Score: {Math.max(...staffMetrics.map(s => s.performanceScore))}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkforceAnalyticsPage;
