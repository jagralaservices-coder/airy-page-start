import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Send, Clock, CheckCircle, XCircle, Wallet, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';

interface AdvanceRequest {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

const getStoreId = (): string | null => {
  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) { const p = JSON.parse(storeData); if (p?.id) return p.id; }
  } catch {}
  try {
    const a = localStorage.getItem('pos_active_store');
    if (a) return JSON.parse(a);
  } catch {}
  return null;
};

const getStoreCode = (): string | null => {
  try {
    const storeData = localStorage.getItem('pos_active_store_data');
    if (storeData) { const p = JSON.parse(storeData); if (p?.storeCode) return p.storeCode; }
  } catch {}
  return null;
};

const AdvanceRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabaseStaff = localStorage.getItem('pos_staff_session');
    const loggedInStaff = localStorage.getItem('logged_in_staff');
    
    let staffData = null;
    
    if (supabaseStaff) {
      const parsed = JSON.parse(supabaseStaff);
      staffData = {
        id: parsed.id || parsed.user_id || parsed.staff_code,
        name: parsed.name || parsed.full_name || 'Staff',
        role: parsed.role || 'staff',
        phone: parsed.phone || ''
      };
    } else if (loggedInStaff) {
      staffData = JSON.parse(loggedInStaff);
    }
    
    if (!staffData) {
      navigate('/auth?type=staff');
      return;
    }
    setStaff(staffData);
    fetchRequests(staffData.id);
  }, [navigate]);

  const fetchRequests = async (staffId: string) => {
    setLoading(true);
    const storeId = getStoreId();
    if (!storeId) { setLoading(false); return; }

    try {
      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: { action: 'fetch', store_id: storeId, data_type: 'advance_requests', staff_id: staffId, store_code: getStoreCode() }
      });
      if (!error && data?.items) {
        const mapped: AdvanceRequest[] = data.items.map((r: any) => ({
          id: r.id,
          staffId: r.staff_id,
          staffName: r.staff_name,
          amount: Number(r.amount),
          reason: r.reason || '',
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          paidAt: r.paid_at,
        }));
        setRequests(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch advance requests:', err);
      // Fallback to localStorage
      const allRequests = JSON.parse(localStorage.getItem('advance_requests') || '[]');
      setRequests(allRequests.filter((r: any) => r.staffId === staffId));
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Please enter a reason', variant: 'destructive' });
      return;
    }

    const storeId = getStoreId();
    const newRequest = {
      staffId: staff.id,
      staffName: staff.name,
      amount: numAmount,
      reason: reason.trim(),
      status: 'pending',
    };

    try {
      if (storeId) {
        const { data, error } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'save', store_id: storeId, data_type: 'advance_requests', store_code: getStoreCode(), items: [newRequest] }
        });
        if (!error && data?.items?.[0]) {
          const saved = data.items[0];
          setRequests(prev => [{
            id: saved.id,
            staffId: saved.staff_id,
            staffName: saved.staff_name,
            amount: Number(saved.amount),
            reason: saved.reason || '',
            status: saved.status,
            createdAt: saved.created_at,
          }, ...prev]);
        }
      }
    } catch {
      // Fallback to localStorage
      const lr: AdvanceRequest = { id: Date.now().toString(), ...newRequest, createdAt: new Date().toISOString() } as any;
      const all = JSON.parse(localStorage.getItem('advance_requests') || '[]');
      all.push(lr);
      localStorage.setItem('advance_requests', JSON.stringify(all));
      setRequests(prev => [lr, ...prev]);
    }

    setAmount('');
    setReason('');
    toast({ title: 'Advance request submitted successfully' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/15 text-success';
      case 'rejected': return 'bg-destructive/15 text-destructive';
      default: return 'bg-warning/15 text-warning';
    }
  };

  const totalPending = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const totalApproved = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/staff-dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Salary Advance</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-warning/10 rounded-2xl p-4 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-sm text-warning font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-success/10 rounded-2xl p-4 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm text-success font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalApproved)}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Request Salary Advance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="pl-10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for advance..." rows={3} />
            </div>
            <Button onClick={handleSubmit} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold mb-4">Your Advance Requests</h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No advance requests yet</p>
            ) : (
              requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(request => (
                <div key={request.id} className="p-4 bg-secondary/50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-lg">{formatCurrency(request.amount)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvanceRequestPage;
