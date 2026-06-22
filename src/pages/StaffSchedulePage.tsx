import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, ChevronLeft, ChevronRight, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember { id: string; name: string; role: string; }

interface ShiftAssignment {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime: string;
  endTime: string;
}

const shiftTimes = {
  morning: { start: '06:00', end: '12:00', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
  afternoon: { start: '12:00', end: '18:00', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  evening: { start: '18:00', end: '22:00', color: 'bg-purple-500/20 text-purple-700 border-purple-500/30' },
  night: { start: '22:00', end: '06:00', color: 'bg-slate-500/20 text-slate-700 border-slate-500/30' }
};

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};
const getStoreCode = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.storeCode) return p.storeCode; } } catch {}
  return null;
};

const StaffSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    const staffList = JSON.parse(localStorage.getItem('pos_staff') || '[]');
    setStaff(staffList);
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const storeId = getStoreId();
    if (!storeId) {
      setAssignments(JSON.parse(localStorage.getItem('staff_schedule') || '[]'));
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: { action: 'fetch', store_id: storeId, data_type: 'staff_schedules', store_code: getStoreCode() }
      });
      if (!error && data?.items) {
        setAssignments(data.items.map((s: any) => ({
          id: s.id, staffId: s.staff_id, staffName: s.staff_name,
          date: s.date, shift: s.shift, startTime: s.start_time, endTime: s.end_time,
        })));
        return;
      }
    } catch {}
    setAssignments(JSON.parse(localStorage.getItem('staff_schedule') || '[]'));
  };

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  const weekDates = getWeekDates();
  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };
  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => a.date === dateStr);
  };

  const handleAddShift = async () => {
    if (!selectedDate || !selectedStaff) {
      toast({ title: 'Please select date and staff', variant: 'destructive' }); return;
    }
    const staffMember = staff.find(s => s.id === selectedStaff);
    if (!staffMember) return;

    const newAssignment = {
      staffId: selectedStaff, staffName: staffMember.name, date: selectedDate,
      shift: selectedShift, startTime: shiftTimes[selectedShift].start, endTime: shiftTimes[selectedShift].end,
    };

    const storeId = getStoreId();
    try {
      if (storeId) {
        const { data, error } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'save', store_id: storeId, data_type: 'staff_schedules', store_code: getStoreCode(), items: [newAssignment] }
        });
        if (!error && data?.items?.[0]) {
          const s = data.items[0];
          setAssignments(prev => [...prev, { id: s.id, staffId: s.staff_id, staffName: s.staff_name, date: s.date, shift: s.shift, startTime: s.start_time, endTime: s.end_time }]);
        }
      }
    } catch {
      const local: ShiftAssignment = { id: Date.now().toString(), ...newAssignment };
      const updated = [...assignments, local];
      setAssignments(updated);
      localStorage.setItem('staff_schedule', JSON.stringify(updated));
    }

    // Send notification
    if (storeId) {
      try {
        await supabase.functions.invoke('sync-store-data', {
          body: { action: 'save', store_id: storeId, data_type: 'staff_notifications', store_code: getStoreCode(), items: [{
            staffId: selectedStaff, title: 'New Shift Assigned', type: 'task',
            message: `You have been assigned ${selectedShift} shift on ${new Date(selectedDate).toLocaleDateString()}`,
          }] }
        });
      } catch {}
    }

    setShowAddShift(false); setSelectedStaff('');
    toast({ title: 'Shift assigned successfully' });
  };

  const handleDeleteShift = async (id: string) => {
    const storeId = getStoreId();
    if (storeId) {
      try {
        await supabase.functions.invoke('sync-store-data', {
          body: { action: 'delete', store_id: storeId, data_type: 'staff_schedules', store_code: getStoreCode(), item_ids: [id] }
        });
      } catch {}
    }
    const updated = assignments.filter(a => a.id !== id);
    setAssignments(updated);
    localStorage.setItem('staff_schedule', JSON.stringify(updated));
    toast({ title: 'Shift removed' });
  };

  const openAddShift = (date: Date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowAddShift(true);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().toDateString();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Staff Schedule</h1>
              <p className="text-muted-foreground">Manage shift assignments</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 bg-card rounded-2xl border border-border p-4">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {weekDates[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(shiftTimes).map(([shift, data]) => (
            <div key={shift} className={`px-3 py-1 rounded-full text-xs font-medium border ${data.color}`}>
              {shift.charAt(0).toUpperCase() + shift.slice(1)} ({data.start} - {data.end})
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const isToday = date.toDateString() === today;
            const dayShifts = getShiftsForDate(date);
            return (
              <div key={idx} className={`bg-card rounded-2xl border p-3 min-h-[200px] ${isToday ? 'border-primary border-2' : 'border-border'}`}>
                <div className={`text-center mb-3 ${isToday ? 'text-primary' : ''}`}>
                  <p className="text-xs text-muted-foreground">{dayNames[idx]}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>{date.getDate()}</p>
                </div>
                <div className="space-y-2">
                  {dayShifts.map(shift => (
                    <div key={shift.id} className={`p-2 rounded-xl text-xs border ${shiftTimes[shift.shift].color} group relative`}>
                      <p className="font-medium truncate">{shift.staffName}</p>
                      <p className="opacity-75">{shift.startTime}</p>
                      <button onClick={() => handleDeleteShift(shift.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => openAddShift(date)}>
                  <Plus className="w-3 h-3 mr-1" />Add
                </Button>
              </div>
            );
          })}
        </div>

        <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Date</Label>
                <p className="text-lg font-medium mt-1">
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div>
                <Label>Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2"><User className="w-4 h-4" />{s.name} ({s.role})</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shift</Label>
                <Select value={selectedShift} onValueChange={(v: any) => setSelectedShift(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(shiftTimes).map(([shift, data]) => (
                      <SelectItem key={shift} value={shift}>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{shift.charAt(0).toUpperCase() + shift.slice(1)} ({data.start} - {data.end})</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddShift(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddShift}>Assign Shift</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffSchedulePage;
