import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Fingerprint,
  Camera,
  Download,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  staffName: string;
  staffCode: string;
  userId: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  verificationMethod: string;
  status: string;
  workingMinutes: number;
  workingHours: string;
  scheduledStart: string;
  scheduledEnd: string;
  isLate: boolean;
  lateMinutes: number;
  overtimeMinutes: number;
}

interface StaffMonthlySummary {
  staffName: string;
  staffCode: string;
  userId: string;
  totalDaysWorked: number;
  totalHoursWorked: number;
  totalMinutesWorked: number;
  lateArrivals: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  attendancePercentage: number;
  averageHoursPerDay: number;
}

const AttendanceReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole, store } = useSupabaseAuth();
  const { selectedStoreId, isOwner } = useOwnerStore();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lateFilter, setLateFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('daily');

  const getStoreId = useCallback(() => {
    if (isOwner && selectedStoreId) return selectedStoreId;
    if (store?.id) return store.id;
    const storeLogin = localStorage.getItem('store_login');
    if (storeLogin) {
      try {
        return JSON.parse(storeLogin).store_id;
      } catch {
        return null;
      }
    }
    return null;
  }, [isOwner, selectedStoreId, store?.id]);

  // Helper to parse time string (HH:MM:SS) to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  // Calculate late minutes (check-in time vs scheduled start)
  const calculateLateMinutes = (checkInTime: string, scheduledStart: string): number => {
    const checkInDate = new Date(checkInTime);
    const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
    const scheduledMinutes = timeToMinutes(scheduledStart);
    
    const diff = checkInMinutes - scheduledMinutes;
    return diff > 0 ? diff : 0;
  };

  // Calculate overtime minutes (check-out time vs scheduled end)
  const calculateOvertimeMinutes = (checkOutTime: string | null, scheduledEnd: string): number => {
    if (!checkOutTime) return 0;
    
    const checkOutDate = new Date(checkOutTime);
    const checkOutMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
    const scheduledMinutes = timeToMinutes(scheduledEnd);
    
    const diff = checkOutMinutes - scheduledMinutes;
    return diff > 0 ? diff : 0;
  };

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeId = getStoreId();
      if (!storeId) {
        setIsLoading(false);
        return;
      }

      // Use month range for monthly view, date range for daily
      const fromDate = activeTab === 'monthly' 
        ? startOfMonth(selectedMonth)
        : dateRange.from;
      const toDate = activeTab === 'monthly'
        ? endOfMonth(selectedMonth)
        : dateRange.to;

      const { data, error } = await supabase
        .from('staff_attendance')
        .select(`
          id,
          check_in_time,
          check_out_time,
          check_in_distance,
          check_out_distance,
          verification_method,
          status,
          user_id
        `)
        .eq('store_id', storeId)
        .gte('check_in_time', startOfDay(fromDate).toISOString())
        .lte('check_in_time', endOfDay(toDate).toISOString())
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      // Fetch user details for each record
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, staff_code, work_start_time, work_end_time')
        .in('user_id', userIds);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const roleMap = new Map(userRoles?.map(r => [r.user_id, r]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const records: AttendanceRecord[] = (data || []).map(record => {
        const role = roleMap.get(record.user_id);
        const profile = profileMap.get(record.user_id);
        const scheduledStart = role?.work_start_time || '09:00:00';
        const scheduledEnd = role?.work_end_time || '18:00:00';
        
        let workingMinutes = 0;
        let workingHours = '-';
        if (record.check_in_time && record.check_out_time) {
          workingMinutes = differenceInMinutes(
            new Date(record.check_out_time),
            new Date(record.check_in_time)
          );
          const hours = Math.floor(workingMinutes / 60);
          const mins = workingMinutes % 60;
          workingHours = `${hours}h ${mins}m`;
        }

        const lateMinutes = calculateLateMinutes(record.check_in_time, scheduledStart);
        const overtimeMinutes = calculateOvertimeMinutes(record.check_out_time, scheduledEnd);

        return {
          id: record.id,
          staffName: profile?.full_name || 'Unknown',
          staffCode: role?.staff_code || '',
          userId: record.user_id,
          checkInTime: record.check_in_time,
          checkOutTime: record.check_out_time,
          checkInDistance: record.check_in_distance,
          checkOutDistance: record.check_out_distance,
          verificationMethod: record.verification_method || 'face',
          status: record.status,
          workingMinutes,
          workingHours,
          scheduledStart,
          scheduledEnd,
          isLate: lateMinutes > 0,
          lateMinutes,
          overtimeMinutes
        };
      });

      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance records',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [getStoreId, dateRange, activeTab, selectedMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Monthly summary calculations
  const monthlySummary = useMemo((): StaffMonthlySummary[] => {
    const staffMap = new Map<string, StaffMonthlySummary>();
    const workingDaysInMonth = 26; // Assume 26 working days per month

    attendanceRecords.forEach(record => {
      if (!staffMap.has(record.userId)) {
        staffMap.set(record.userId, {
          staffName: record.staffName,
          staffCode: record.staffCode,
          userId: record.userId,
          totalDaysWorked: 0,
          totalHoursWorked: 0,
          totalMinutesWorked: 0,
          lateArrivals: 0,
          totalLateMinutes: 0,
          totalOvertimeMinutes: 0,
          attendancePercentage: 0,
          averageHoursPerDay: 0
        });
      }

      const staff = staffMap.get(record.userId)!;
      staff.totalDaysWorked += 1;
      staff.totalMinutesWorked += record.workingMinutes;
      staff.totalHoursWorked = Math.round(staff.totalMinutesWorked / 60 * 10) / 10;
      
      if (record.isLate) {
        staff.lateArrivals += 1;
        staff.totalLateMinutes += record.lateMinutes;
      }
      
      staff.totalOvertimeMinutes += record.overtimeMinutes;
      staff.attendancePercentage = Math.round((staff.totalDaysWorked / workingDaysInMonth) * 100);
      staff.averageHoursPerDay = staff.totalDaysWorked > 0 
        ? Math.round((staff.totalHoursWorked / staff.totalDaysWorked) * 10) / 10
        : 0;
    });

    return Array.from(staffMap.values()).sort((a, b) => b.totalHoursWorked - a.totalHoursWorked);
  }, [attendanceRecords]);

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.staffCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesLate = lateFilter === 'all' || 
      (lateFilter === 'late' && record.isLate) ||
      (lateFilter === 'on_time' && !record.isLate);
    return matchesSearch && matchesStatus && matchesLate;
  });

  const getVerificationIcon = (method: string) => {
    return method === 'fingerprint' ? (
      <Fingerprint className="w-4 h-4 text-primary" />
    ) : (
      <Camera className="w-4 h-4 text-blue-500" />
    );
  };

  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const exportToCSV = () => {
    const headers = ['Staff Name', 'Staff Code', 'Check In', 'Check Out', 'Working Hours', 'Late', 'Late Minutes', 'Overtime', 'Verification', 'Status'];
    const rows = filteredRecords.map(r => [
      r.staffName,
      r.staffCode,
      format(new Date(r.checkInTime), 'dd/MM/yyyy HH:mm'),
      r.checkOutTime ? format(new Date(r.checkOutTime), 'dd/MM/yyyy HH:mm') : '-',
      r.workingHours,
      r.isLate ? 'Yes' : 'No',
      r.lateMinutes,
      r.overtimeMinutes,
      r.verificationMethod,
      r.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.csv`;
    a.click();
  };

  const exportMonthlySummary = () => {
    const headers = ['Staff Name', 'Staff Code', 'Days Worked', 'Total Hours', 'Average Hours/Day', 'Late Arrivals', 'Late Minutes', 'Overtime Hours', 'Attendance %'];
    const rows = monthlySummary.map(s => [
      s.staffName,
      s.staffCode,
      s.totalDaysWorked,
      s.totalHoursWorked,
      s.averageHoursPerDay,
      s.lateArrivals,
      s.totalLateMinutes,
      Math.round(s.totalOvertimeMinutes / 60 * 10) / 10,
      s.attendancePercentage
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_summary_${format(selectedMonth, 'yyyyMM')}.csv`;
    a.click();
  };

  // Calculate summary stats
  const totalCheckIns = filteredRecords.length;
  const completedShifts = filteredRecords.filter(r => r.status === 'checked_out').length;
  const lateArrivals = filteredRecords.filter(r => r.isLate).length;
  const totalOvertimeMinutes = filteredRecords.reduce((acc, r) => acc + r.overtimeMinutes, 0);
  const totalLateMinutes = filteredRecords.reduce((acc, r) => acc + r.lateMinutes, 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Attendance Reports</h1>
              <p className="text-muted-foreground">Staff attendance, working hours & overtime tracking</p>
            </div>
          </div>
          <Button onClick={activeTab === 'monthly' ? exportMonthlySummary : exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily" className="gap-2">
              <Calendar className="w-4 h-4" />
              Daily View
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Monthly Summary
            </TabsTrigger>
          </TabsList>

          {/* Daily View Tab */}
          <TabsContent value="daily">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{totalCheckIns}</div>
                  <div className="text-sm text-muted-foreground">Total Check-ins</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{completedShifts}</div>
                  <div className="text-sm text-muted-foreground">Completed Shifts</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-2xl font-bold text-amber-600">{lateArrivals}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Late Arrivals</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-600">{formatMinutesToHours(totalLateMinutes)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Late Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">{formatMinutesToHours(totalOvertimeMinutes)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Overtime</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(dateRange.from, 'dd MMM')} - {format(dateRange.to, 'dd MMM')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="checked_in">Active</SelectItem>
                  <SelectItem value="checked_out">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lateFilter} onValueChange={setLateFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Punctuality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="late">Late Only</SelectItem>
                  <SelectItem value="on_time">On Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Working Hours</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{record.staffName}</div>
                                <div className="text-xs text-muted-foreground">{record.staffCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(record.checkInTime), 'dd MMM yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(record.checkInTime), 'HH:mm')}
                              <span className="ml-1 text-xs">
                                (Sched: {record.scheduledStart.slice(0, 5)})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? (
                              <>
                                <div className="text-sm">
                                  {format(new Date(record.checkOutTime), 'dd MMM yyyy')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(record.checkOutTime), 'HH:mm')}
                                  <span className="ml-1 text-xs">
                                    (Sched: {record.scheduledEnd.slice(0, 5)})
                                  </span>
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{record.workingHours}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.isLate ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {formatMinutesToHours(record.lateMinutes)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-500/15 text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                On time
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.overtimeMinutes > 0 ? (
                              <Badge className="bg-blue-500/15 text-blue-600 gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {formatMinutesToHours(record.overtimeMinutes)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getVerificationIcon(record.verificationMethod)}
                              <span className="text-sm capitalize">{record.verificationMethod}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={record.status === 'checked_out' ? 'default' : 'secondary'}
                              className={record.status === 'checked_in' ? 'bg-green-500/15 text-green-600' : ''}
                            >
                              {record.status === 'checked_in' ? 'Active' : 'Completed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Summary Tab */}
          <TabsContent value="monthly">
            {/* Month Selector */}
            <div className="flex items-center gap-4 mb-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(selectedMonth, 'MMMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedMonth}
                    onSelect={(date) => date && setSelectedMonth(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{monthlySummary.length}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Staff</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {monthlySummary.reduce((acc, s) => acc + s.totalHoursWorked, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours Worked</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-2xl font-bold text-amber-600">
                      {monthlySummary.reduce((acc, s) => acc + s.lateArrivals, 0)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Late Arrivals</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">
                      {Math.round(monthlySummary.reduce((acc, s) => acc + s.totalOvertimeMinutes, 0) / 60)}h
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Overtime</div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Monthly Summary - {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Days Worked</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Avg Hours/Day</TableHead>
                      <TableHead>Late Arrivals</TableHead>
                      <TableHead>Total Late</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : monthlySummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No attendance data for this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlySummary.map((staff) => (
                        <TableRow key={staff.userId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{staff.staffName}</div>
                                <div className="text-xs text-muted-foreground">{staff.staffCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{staff.totalDaysWorked}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">{staff.totalHoursWorked}h</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{staff.averageHoursPerDay}h</span>
                          </TableCell>
                          <TableCell>
                            {staff.lateArrivals > 0 ? (
                              <Badge variant="destructive">{staff.lateArrivals}</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-500/15 text-green-600">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {staff.totalLateMinutes > 0 ? (
                              <span className="text-amber-600 font-medium">
                                {formatMinutesToHours(staff.totalLateMinutes)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {staff.totalOvertimeMinutes > 0 ? (
                              <Badge className="bg-blue-500/15 text-blue-600">
                                {formatMinutesToHours(staff.totalOvertimeMinutes)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    staff.attendancePercentage >= 80 
                                      ? 'bg-green-500' 
                                      : staff.attendancePercentage >= 60 
                                        ? 'bg-amber-500' 
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(staff.attendancePercentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{staff.attendancePercentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AttendanceReportsPage;
