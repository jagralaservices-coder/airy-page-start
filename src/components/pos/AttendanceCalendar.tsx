import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  verification_method: string | null;
}

interface AttendanceCalendarProps {
  userId: string;
  storeId?: string;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ userId, storeId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    totalDays: 0,
    presentDays: 0,
    totalHours: 0,
    avgHoursPerDay: 0
  });

  useEffect(() => {
    fetchMonthAttendance();
  }, [userId, selectedDate]);

  const fetchMonthAttendance = async () => {
    setIsLoading(true);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_time', monthStart.toISOString())
      .lte('check_in_time', monthEnd.toISOString())
      .order('check_in_time', { ascending: false });

    if (data && !error) {
      setAttendanceData(data);
      calculateMonthlyStats(data);
    }
    setIsLoading(false);
  };

  const calculateMonthlyStats = (records: AttendanceRecord[]) => {
    let totalMinutes = 0;
    const uniqueDays = new Set<string>();

    records.forEach(record => {
      const checkIn = new Date(record.check_in_time);
      const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;
      
      uniqueDays.add(format(checkIn, 'yyyy-MM-dd'));
      
      if (checkOut) {
        totalMinutes += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
      }
    });

    const totalHours = totalMinutes / 60;
    const presentDays = uniqueDays.size;

    setMonthlyStats({
      totalDays: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate(),
      presentDays,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0
    });
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    return attendanceData.find(record => 
      isSameDay(new Date(record.check_in_time), date)
    );
  };

  const getDayClassName = (date: Date): string => {
    const record = getAttendanceForDate(date);
    if (!record) return '';
    if (record.check_out_time) return 'bg-success/20 text-success hover:bg-success/30';
    return 'bg-warning/20 text-warning hover:bg-warning/30';
  };

  const selectedDayRecord = getAttendanceForDate(selectedDate);

  const formatDuration = (checkIn: string, checkOut: string | null): string => {
    if (!checkOut) return 'In Progress';
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{monthlyStats.presentDays}</p>
            <p className="text-xs text-muted-foreground">Days Present</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-success">{monthlyStats.totalHours}h</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-warning">{monthlyStats.avgHoursPerDay}h</p>
            <p className="text-xs text-muted-foreground">Avg/Day</p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{monthlyStats.totalDays}</p>
            <p className="text-xs text-muted-foreground">Days in Month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Attendance Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
                modifiers={{
                  present: (date) => !!getAttendanceForDate(date)
                }}
                modifiersClassNames={{
                  present: 'bg-success/20 text-success font-bold'
                }}
              />
            )}
            <div className="flex gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success/30" /> Present
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-warning/30" /> In Progress
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayRecord ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-medium">Present</span>
                  {selectedDayRecord.verification_method && (
                    <Badge variant="outline" className="text-xs">
                      {selectedDayRecord.verification_method}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in:</span>
                    <span className="font-medium text-success">
                      {format(new Date(selectedDayRecord.check_in_time), 'hh:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out:</span>
                    <span className={`font-medium ${selectedDayRecord.check_out_time ? 'text-destructive' : 'text-warning'}`}>
                      {selectedDayRecord.check_out_time 
                        ? format(new Date(selectedDayRecord.check_out_time), 'hh:mm a')
                        : 'Not checked out'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-bold">
                      {formatDuration(selectedDayRecord.check_in_time, selectedDayRecord.check_out_time)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <XCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No attendance record</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Records List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {attendanceData.slice(0, 10).map(record => (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
              >
                <div>
                  <p className="font-medium">{format(new Date(record.check_in_time), 'EEE, MMM d')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.check_in_time), 'hh:mm a')} - {
                      record.check_out_time 
                        ? format(new Date(record.check_out_time), 'hh:mm a')
                        : 'In progress'
                    }
                  </p>
                </div>
                <Badge variant={record.check_out_time ? 'default' : 'secondary'}>
                  {formatDuration(record.check_in_time, record.check_out_time)}
                </Badge>
              </div>
            ))}
            {attendanceData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No attendance records this month</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;
