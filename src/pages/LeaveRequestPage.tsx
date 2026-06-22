import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  ArrowLeft, Search, MoreVertical, Plus, CheckCircle2, XCircle, 
  Calendar as CalendarIcon, Send, Umbrella, Stethoscope, AlertTriangle, Clock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};
const getStoreCode = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.storeCode) return p.storeCode; } } catch {}
  return null;
};

const leaveTypeIcons: Record<string, React.ReactNode> = {
  casual: <Umbrella className="w-3.5 h-3.5" />,
  sick: <Stethoscope className="w-3.5 h-3.5" />,
  annual: <CalendarIcon className="w-3.5 h-3.5" />,
  emergency: <AlertTriangle className="w-3.5 h-3.5" />,
  'half-day': <Clock className="w-3.5 h-3.5" />,
};

const LeaveRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useSupabaseAuth();
  const isManager = userRole?.role === 'owner' || userRole?.role === 'admin' || userRole?.role === 'super_admin' || userRole?.role === 'store_manager';
  
  const [staff, setStaff] = useState<any>(null);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewRequest, setShowNewRequest] = useState(false);

  useEffect(() => {
    const supabaseStaff = localStorage.getItem('pos_staff_session');
    const loggedInStaff = localStorage.getItem('logged_in_staff');
    let staffData = null;
    if (supabaseStaff) {
      const parsed = JSON.parse(supabaseStaff);
      staffData = { id: parsed.id || parsed.user_id || parsed.staff_code, name: parsed.name || parsed.full_name || 'Staff', role: parsed.role || 'staff', phone: parsed.phone || '' };
    } else if (loggedInStaff) {
      staffData = JSON.parse(loggedInStaff);
    }
    if (!staffData && !isManager) { navigate('/auth?type=staff'); return; }
    setStaff(staffData || { id: 'manager', name: 'Manager', role: 'manager' });
    fetchRequests(isManager ? undefined : staffData?.id);
  }, [navigate, isManager]);

  const fetchRequests = async (staffId?: string) => {
    setLoading(true);
    const storeId = getStoreId();
    if (!storeId) { setLoading(false); return; }
    try {
      const body: any = { action: 'fetch', store_id: storeId, data_type: 'leave_requests', store_code: getStoreCode() };
      if (staffId) body.staff_id = staffId;
      const { data, error } = await supabase.functions.invoke('sync-store-data', { body });
      if (!error && data?.items) {
        setRequests(data.items.map((r: any) => ({
          id: r.id, staffId: r.staff_id, staffName: r.staff_name, type: r.leave_type,
          startDate: r.start_date, endDate: r.end_date, reason: r.reason || '',
          status: r.status, createdAt: r.created_at, approvedBy: r.approved_by, approvedAt: r.approved_at,
        })));
      }
    } catch {
      const all: LeaveRequest[] = JSON.parse(localStorage.getItem('staff_leave_requests') || '[]');
      setRequests(staffId ? all.filter(r => r.staffId === staffId) : all);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' }); return;
    }
    if (endDate < startDate) {
      toast({ title: 'End date must be after start date', variant: 'destructive' }); return;
    }
    const storeId = getStoreId();
    const newReq = {
      staffId: staff.id, staffName: staff.name, type: leaveType,
      startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0],
      reason: reason.trim(), status: 'pending',
    };
    try {
      if (storeId) {
        const { data, error } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'save', store_id: storeId, data_type: 'leave_requests', store_code: getStoreCode(), items: [newReq] }
        });
        if (!error && data?.items?.[0]) {
          const s = data.items[0];
          setRequests(prev => [{ id: s.id, staffId: s.staff_id, staffName: s.staff_name, type: s.leave_type, startDate: s.start_date, endDate: s.end_date, reason: s.reason || '', status: s.status, createdAt: s.created_at }, ...prev]);
        }
      }
    } catch {
      const lr: LeaveRequest = { id: Date.now().toString(), ...newReq, createdAt: new Date().toISOString() } as any;
      const all = JSON.parse(localStorage.getItem('staff_leave_requests') || '[]');
      all.push(lr); localStorage.setItem('staff_leave_requests', JSON.stringify(all));
      setRequests(prev => [lr, ...prev]);
    }
    if (localStorage.getItem('push_notifications_enabled') === 'true') {
      showNotification('📅 New Leave Request', { body: `${staff.name} has requested ${leaveType} leave`, tag: `leave-${Date.now()}`, requireInteraction: true });
    }
    setLeaveType(''); setStartDate(undefined); setEndDate(undefined); setReason('');
    setShowNewRequest(false);
    toast({ title: 'Leave request submitted successfully' });
  };

  const handleApprove = async (requestId: string) => {
    const storeId = getStoreId();
    if (!storeId) return;
    try {
      await supabase.from('leave_requests').update({ status: 'approved', approved_by: staff?.name, approved_at: new Date().toISOString() }).eq('id', requestId);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
      toast({ title: 'Leave approved' });
    } catch {
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
      toast({ title: 'Leave approved (offline)' });
    }
  };

  const handleReject = async (requestId: string) => {
    const storeId = getStoreId();
    if (!storeId) return;
    try {
      await supabase.from('leave_requests').update({ status: 'rejected', approved_by: staff?.name, approved_at: new Date().toISOString() }).eq('id', requestId);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r));
      toast({ title: 'Leave rejected' });
    } catch {
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r));
      toast({ title: 'Leave rejected (offline)' });
    }
  };

  const getDays = (start: string, end: string) => {
    const days = differenceInDays(new Date(end), new Date(start)) + 1;
    return days === 1 ? '1 Day' : `${days} Days`;
  };

  const tabs = ['all', 'pending', 'approved', 'rejected'];

  const filtered = useMemo(() => {
    let list = [...requests];
    if (activeTab !== 'all') list = list.filter(r => r.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.staffName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, activeTab, searchQuery]);

  const pendingRequests = filtered.filter(r => r.status === 'pending');
  const approvedRequests = filtered.filter(r => r.status === 'approved');
  const rejectedRequests = filtered.filter(r => r.status === 'rejected');
  const activeCount = requests.filter(r => r.status === 'pending').length;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/15 text-warning border-warning/30',
      approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      rejected: 'bg-destructive/15 text-destructive border-destructive/30',
    };
    return (
      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border', styles[status] || styles.pending)}>
        {status}
      </span>
    );
  };

  const LeaveCard = ({ request }: { request: LeaveRequest }) => (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-border">
            <AvatarFallback className="bg-secondary text-foreground font-semibold text-sm">
              {getInitials(request.staffName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{request.staffName}</p>
            <p className="text-xs text-muted-foreground capitalize">Staff</p>
          </div>
        </div>
        {statusBadge(request.status)}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Leave Type</p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground capitalize">
            {leaveTypeIcons[request.type] || <CalendarIcon className="w-3.5 h-3.5" />}
            {request.type.replace('-', ' ')} Leave
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Total Days</p>
          <p className="text-sm font-semibold text-primary">{getDays(request.startDate, request.endDate)}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Date Range</p>
        <p className="text-sm text-foreground">
          {format(new Date(request.startDate), 'MMM dd, yyyy')} — {format(new Date(request.endDate), 'MMM dd, yyyy')}
        </p>
      </div>

      {request.reason && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">{request.reason}</p>
      )}

      {/* Actions for pending */}
      {isManager && request.status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <Button 
            size="sm" 
            className="flex-1 h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleApprove(request.id)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            className="flex-1 h-9 rounded-xl gap-1.5"
            onClick={() => handleReject(request.id)}
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <div className="flex items-center justify-between mb-3 mt-6 first:mt-0">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title} ({count})</h3>
      {title === 'Pending Requests' && count > 0 && (
        <button className="text-xs font-medium text-primary">Mark all as read</button>
      )}
    </div>
  );

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Leave Requests</h1>
            {activeCount > 0 && (
              <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5 font-bold">
                {activeCount} Active
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search staff by name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-secondary/50 border-border"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
                activeTab === tab 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No leave requests found</p>
            <p className="text-xs text-muted-foreground mt-1">Tap + to create a new request</p>
          </div>
        ) : activeTab === 'all' ? (
          <>
            {pendingRequests.length > 0 && (
              <>
                <SectionHeader title="Pending Requests" count={pendingRequests.length} />
                <div className="space-y-3">
                  {pendingRequests.map(r => <LeaveCard key={r.id} request={r} />)}
                </div>
              </>
            )}
            {approvedRequests.length > 0 && (
              <>
                <SectionHeader title="Approved" count={approvedRequests.length} />
                <div className="space-y-3">
                  {approvedRequests.map(r => <LeaveCard key={r.id} request={r} />)}
                </div>
              </>
            )}
            {rejectedRequests.length > 0 && (
              <>
                <SectionHeader title="Rejected" count={rejectedRequests.length} />
                <div className="space-y-3">
                  {rejectedRequests.map(r => <LeaveCard key={r.id} request={r} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-3 mt-4">
            {filtered.map(r => <LeaveCard key={r.id} request={r} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewRequest(true)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Request Sheet */}
      <Sheet open={showNewRequest} onOpenChange={setShowNewRequest}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Apply for Leave</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Leave Type</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">🏖️ Casual Leave</SelectItem>
                  <SelectItem value="sick">🏥 Sick Leave</SelectItem>
                  <SelectItem value="annual">📅 Annual Leave</SelectItem>
                  <SelectItem value="emergency">🚨 Emergency Leave</SelectItem>
                  <SelectItem value="half-day">⏰ Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for leave..." rows={3} className="rounded-xl" />
            </div>
            <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-base font-semibold">
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LeaveRequestPage;
