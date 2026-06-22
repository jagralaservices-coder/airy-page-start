import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { 
  User, Clock, LogIn, LogOut, Calendar, DollarSign, Bell,
  ChevronRight, Wallet, ClipboardList, MessageCircle, BarChart3,
  ArrowLeft, Search, Plus, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
}

export const StaffPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'list' | 'attendance'>('attendance');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('Staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    if (!user) return;
    
    const staffSession = localStorage.getItem('pos_staff_session');
    if (staffSession) {
      const parsed = JSON.parse(staffSession);
      setStaffName(parsed.name || parsed.full_name || user.email?.split('@')[0] || 'Staff');
      setStaffRole(parsed.role || 'staff');
    } else {
      setStaffName(user.email?.split('@')[0] || 'Staff');
    }

    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_time', `${today}T00:00:00`)
      .lte('check_in_time', `${today}T23:59:59`)
      .order('check_in_time', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setTodayAttendance(data);
          setRecentAttendance(data as AttendanceRecord[]);
          const activeRecord = data.find(r => r.status === 'checked_in');
          setIsCheckedIn(!!activeRecord);
        }
      });

    const notifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]');
    const posNotifications = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    const allNotifs = [...notifications, ...posNotifications];
    const unread = allNotifs.filter((n: any) => !n.read && (!n.staffId || n.staffId === user.id)).length;
    setUnreadNotifications(unread);
  }, [user]);

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.status === 'checked_in') {
      return <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 uppercase">ON-GOING</span>;
    }
    // Check if late (after 9:30 AM)
    const checkIn = new Date(record.check_in_time);
    const isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30);
    if (isLate) {
      return <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-destructive/15 text-destructive uppercase">LATE ENTRY</span>;
    }
    return <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-muted text-muted-foreground uppercase">COMPLETED</span>;
  };

  const getTotalHours = (record: AttendanceRecord) => {
    if (!record.check_out_time) {
      const mins = Math.floor((new Date().getTime() - new Date(record.check_in_time).getTime()) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }
    const mins = Math.floor((new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const dateFilters = ['Today', 'Yesterday', 'Last 7 Days', 'This Month'];

  // Staff list intentionally empty until wired to live user_roles query.
  type StaffRow = { id: string; name: string; status?: 'ongoing' | 'completed' | 'late'; checkIn?: string; checkOut?: string; totalHours?: string };
  const staffList: StaffRow[] = [];
  const filteredStaff = staffList.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Staff Portal</h1>
          </div>
          <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/staff-notifications')}>
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">{unreadNotifications}</span>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex px-4">
          {['Staff List', 'Attendance'].map(tab => {
            const key = tab === 'Staff List' ? 'list' : 'attendance';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(key as any)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors',
                  activeTab === key
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent'
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search staff by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/60 rounded-xl h-11"
          />
        </div>

        {/* Date Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {dateFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter.toLowerCase())}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                dateFilter === filter.toLowerCase()
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground border border-border/60'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Records Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">RECENT RECORDS</h3>
          <span className="text-xs text-muted-foreground">Showing {filteredStaff.length} results</span>
        </div>

        {/* Staff Attendance Cards */}
        <div className="space-y-3">
          {filteredStaff.map((staff, idx) => (
            <div key={idx} className="bg-card rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-border/60">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground">{staff.name}</h4>
                  <p className="text-xs text-muted-foreground">ID: {staff.id}</p>
                </div>
                {staff.status === 'ongoing' && (
                  <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 uppercase">ON-GOING</span>
                )}
                {staff.status === 'completed' && (
                  <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-muted text-muted-foreground uppercase">COMPLETED</span>
                )}
                {staff.status === 'late' && (
                  <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-destructive/15 text-destructive uppercase">LATE ENTRY</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border/30 pt-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">CHECK IN</p>
                  <p className={cn('text-sm font-bold', staff.status === 'late' ? 'text-destructive' : 'text-foreground')}>{staff.checkIn}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">CHECK OUT</p>
                  <p className="text-sm font-bold text-foreground">{staff.checkOut || '--:--'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">TOTAL HOURS</p>
                  <p className="text-sm font-bold text-primary">{staff.totalHours}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-20">
        <Button size="icon" className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-30 pb-safe">
        <div className="flex justify-around py-2">
          {[
            { icon: BarChart3, label: 'HOME', path: '/dashboard', active: false },
            { icon: User, label: 'STAFF', path: '/staff-portal', active: true },
            { icon: ClipboardList, label: 'REPORT', path: '/reports', active: false },
            { icon: Settings, label: 'ADMIN', path: '/settings', active: false },
          ].map((nav) => (
            <button
              key={nav.label}
              onClick={() => navigate(nav.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                nav.active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <nav.icon className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-wider">{nav.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffPortalPage;
