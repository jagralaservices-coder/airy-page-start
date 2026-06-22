import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
}

interface OvertimeReportProps {
  userId: string;
  workStartTime: string | null;
  workEndTime: string | null;
  hourlyRate?: number;
  overtimeMultiplier?: number;
}

interface DailyBreakdown {
  date: Date;
  scheduledHours: number;
  workedHours: number;
  overtimeHours: number;
  checkIn: string | null;
  checkOut: string | null;
}

const OvertimeReport: React.FC<OvertimeReportProps> = ({
  userId,
  workStartTime,
  workEndTime,
  hourlyRate = 100, // Default hourly rate in INR
  overtimeMultiplier = 1.5
}) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<DailyBreakdown[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailyBreakdown[]>([]);

  const scheduledMinutesPerDay = workStartTime && workEndTime ? (() => {
    const [startH, startM] = workStartTime.split(':').map(Number);
    const [endH, endM] = workEndTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  })() : 480; // Default 8 hours

  useEffect(() => {
    fetchAttendanceData();
  }, [userId, selectedMonth]);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_time', monthStart.toISOString())
      .lte('check_in_time', monthEnd.toISOString())
      .order('check_in_time', { ascending: true });

    if (data && !error) {
      setAttendanceData(data);
      calculateBreakdowns(data, monthStart, monthEnd);
    }
    setIsLoading(false);
  };

  const calculateBreakdowns = (records: AttendanceRecord[], monthStart: Date, monthEnd: Date) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Calculate weekly breakdown
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weeklyBreakdown = weekDays.map(day => calculateDayBreakdown(day, records));
    setWeeklyData(weeklyBreakdown);

    // Calculate monthly breakdown
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const monthlyBreakdown = monthDays.map(day => calculateDayBreakdown(day, records));
    setMonthlyData(monthlyBreakdown);
  };

  const calculateDayBreakdown = (date: Date, records: AttendanceRecord[]): DailyBreakdown => {
    const dayRecord = records.find(r => isSameDay(new Date(r.check_in_time), date));
    const scheduledHours = scheduledMinutesPerDay / 60;
    
    if (!dayRecord) {
      return {
        date,
        scheduledHours,
        workedHours: 0,
        overtimeHours: 0,
        checkIn: null,
        checkOut: null
      };
    }

    const checkIn = new Date(dayRecord.check_in_time);
    const checkOut = dayRecord.check_out_time ? new Date(dayRecord.check_out_time) : null;
    const workedMinutes = checkOut 
      ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60)
      : 0;
    const workedHours = workedMinutes / 60;
    const overtimeHours = Math.max(0, workedHours - scheduledHours);

    return {
      date,
      scheduledHours,
      workedHours: Math.round(workedHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      checkIn: format(checkIn, 'hh:mm a'),
      checkOut: checkOut ? format(checkOut, 'hh:mm a') : null
    };
  };

  const calculateTotals = (data: DailyBreakdown[]) => {
    const totalWorked = data.reduce((sum, d) => sum + d.workedHours, 0);
    const totalScheduled = data.filter(d => d.workedHours > 0).length * (scheduledMinutesPerDay / 60);
    const totalOvertime = data.reduce((sum, d) => sum + d.overtimeHours, 0);
    const regularPay = Math.min(totalWorked, totalScheduled) * hourlyRate;
    const overtimePay = totalOvertime * hourlyRate * overtimeMultiplier;

    return {
      totalWorked: Math.round(totalWorked * 10) / 10,
      totalScheduled: Math.round(totalScheduled * 10) / 10,
      totalOvertime: Math.round(totalOvertime * 10) / 10,
      regularPay: Math.round(regularPay),
      overtimePay: Math.round(overtimePay),
      totalPay: Math.round(regularPay + overtimePay),
      daysWorked: data.filter(d => d.workedHours > 0).length
    };
  };

  const weeklyTotals = calculateTotals(weeklyData);
  const monthlyTotals = calculateTotals(monthlyData);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex justify-end">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          {/* Weekly Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary/5">
              <CardContent className="p-3 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{weeklyTotals.totalWorked}h</p>
                <p className="text-xs text-muted-foreground">Total Worked</p>
              </CardContent>
            </Card>
            <Card className="bg-warning/5">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-xl font-bold">{weeklyTotals.totalOvertime}h</p>
                <p className="text-xs text-muted-foreground">Overtime</p>
              </CardContent>
            </Card>
            <Card className="bg-success/5">
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-xl font-bold">₹{weeklyTotals.regularPay}</p>
                <p className="text-xs text-muted-foreground">Regular Pay</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5">
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-xl font-bold">₹{weeklyTotals.overtimePay}</p>
                <p className="text-xs text-muted-foreground">OT Pay ({overtimeMultiplier}x)</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Daily Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Day</th>
                      <th className="text-center py-2">In</th>
                      <th className="text-center py-2">Out</th>
                      <th className="text-center py-2">Worked</th>
                      <th className="text-center py-2">OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map(day => (
                      <tr key={day.date.toISOString()} className="border-b last:border-0">
                        <td className="py-2 font-medium">{format(day.date, 'EEE, MMM d')}</td>
                        <td className="text-center py-2 text-success">{day.checkIn || '-'}</td>
                        <td className="text-center py-2 text-destructive">{day.checkOut || '-'}</td>
                        <td className="text-center py-2">{day.workedHours > 0 ? `${day.workedHours}h` : '-'}</td>
                        <td className="text-center py-2">
                          {day.overtimeHours > 0 && (
                            <Badge variant="outline" className="text-warning border-warning">
                              +{day.overtimeHours}h
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Total Pay */}
          <Card className="bg-gradient-to-r from-primary/10 to-success/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Weekly Total Earnings</p>
                  <p className="text-3xl font-bold">₹{weeklyTotals.totalPay}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{weeklyTotals.daysWorked} days worked</p>
                  <p className="text-muted-foreground">{weeklyTotals.totalWorked}h total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {/* Monthly Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary/5">
              <CardContent className="p-3 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{monthlyTotals.totalWorked}h</p>
                <p className="text-xs text-muted-foreground">Total Worked</p>
              </CardContent>
            </Card>
            <Card className="bg-warning/5">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-xl font-bold">{monthlyTotals.totalOvertime}h</p>
                <p className="text-xs text-muted-foreground">Overtime</p>
              </CardContent>
            </Card>
            <Card className="bg-success/5">
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-xl font-bold">₹{monthlyTotals.regularPay}</p>
                <p className="text-xs text-muted-foreground">Regular Pay</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5">
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-xl font-bold">₹{monthlyTotals.overtimePay}</p>
                <p className="text-xs text-muted-foreground">OT Pay ({overtimeMultiplier}x)</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown - show last 15 days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Recent Days (Last 15)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b">
                      <th className="text-left py-2">Day</th>
                      <th className="text-center py-2">In</th>
                      <th className="text-center py-2">Out</th>
                      <th className="text-center py-2">Worked</th>
                      <th className="text-center py-2">OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.filter(d => d.workedHours > 0).slice(-15).reverse().map(day => (
                      <tr key={day.date.toISOString()} className="border-b last:border-0">
                        <td className="py-2 font-medium">{format(day.date, 'EEE, MMM d')}</td>
                        <td className="text-center py-2 text-success">{day.checkIn || '-'}</td>
                        <td className="text-center py-2 text-destructive">{day.checkOut || '-'}</td>
                        <td className="text-center py-2">{day.workedHours > 0 ? `${day.workedHours}h` : '-'}</td>
                        <td className="text-center py-2">
                          {day.overtimeHours > 0 && (
                            <Badge variant="outline" className="text-warning border-warning">
                              +{day.overtimeHours}h
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Total Pay */}
          <Card className="bg-gradient-to-r from-primary/10 to-success/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Monthly Total Earnings</p>
                  <p className="text-3xl font-bold">₹{monthlyTotals.totalPay}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{monthlyTotals.daysWorked} days worked</p>
                  <p className="text-muted-foreground">{monthlyTotals.totalWorked}h total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OvertimeReport;
