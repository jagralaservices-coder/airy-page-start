import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/store';
import { 
  ArrowLeft, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  XCircle,
  Clock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AdvanceRequest {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const AdminApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);

  useEffect(() => {
    const leaves = JSON.parse(localStorage.getItem('staff_leave_requests') || '[]');
    const advances = JSON.parse(localStorage.getItem('staff_advance_requests') || '[]');
    setLeaveRequests(leaves);
    setAdvanceRequests(advances);
  }, []);

  const handleLeaveAction = (id: string, action: 'approved' | 'rejected') => {
    const updated = leaveRequests.map(req => 
      req.id === id ? { ...req, status: action } : req
    );
    setLeaveRequests(updated);
    localStorage.setItem('staff_leave_requests', JSON.stringify(updated));

    // Add notification
    const request = leaveRequests.find(r => r.id === id);
    if (request) {
      const notifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]');
      notifications.unshift({
        id: Date.now().toString(),
        type: 'leave',
        title: `Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request for ${new Date(request.startDate).toLocaleDateString()} has been ${action}`,
        staffId: request.staffId,
        createdAt: new Date().toISOString(),
        read: false
      });
      localStorage.setItem('staff_notifications', JSON.stringify(notifications));
    }

    toast({
      title: `Leave ${action === 'approved' ? 'Approved' : 'Rejected'}`,
      description: `Request has been ${action}`,
    });
  };

  const handleAdvanceAction = (id: string, action: 'approved' | 'rejected') => {
    const updated = advanceRequests.map(req => 
      req.id === id ? { ...req, status: action } : req
    );
    setAdvanceRequests(updated);
    localStorage.setItem('staff_advance_requests', JSON.stringify(updated));

    // Add notification
    const request = advanceRequests.find(r => r.id === id);
    if (request) {
      const notifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]');
      notifications.unshift({
        id: Date.now().toString(),
        type: 'salary',
        title: `Advance Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your advance request of ${formatCurrency(request.amount)} has been ${action}`,
        staffId: request.staffId,
        createdAt: new Date().toISOString(),
        read: false
      });
      localStorage.setItem('staff_notifications', JSON.stringify(notifications));
    }

    toast({
      title: `Advance ${action === 'approved' ? 'Approved' : 'Rejected'}`,
      description: `Request has been ${action}`,
    });
  };

  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');
  const pendingAdvances = advanceRequests.filter(r => r.status === 'pending');

  const statusColors = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive'
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Staff Approvals</h1>
            <p className="text-muted-foreground">Manage leave and advance requests</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingLeaves.length}</p>
                <p className="text-sm text-muted-foreground">Pending Leaves</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingAdvances.length}</p>
                <p className="text-sm text-muted-foreground">Pending Advances</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="leaves" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="leaves" className="gap-2">
              <Calendar className="w-4 h-4" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="advances" className="gap-2">
              <Wallet className="w-4 h-4" />
              Advance Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaves" className="space-y-4">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No leave requests yet</p>
              </div>
            ) : (
              leaveRequests.map(request => (
                <div key={request.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{request.staffName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-destructive border-destructive/30"
                        onClick={() => handleLeaveAction(request.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        className="flex-1 bg-success hover:bg-success/90"
                        onClick={() => handleLeaveAction(request.id, 'approved')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="advances" className="space-y-4">
            {advanceRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No advance requests yet</p>
              </div>
            ) : (
              advanceRequests.map(request => (
                <div key={request.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{request.staffName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(request.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-destructive border-destructive/30"
                        onClick={() => handleAdvanceAction(request.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        className="flex-1 bg-success hover:bg-success/90"
                        onClick={() => handleAdvanceAction(request.id, 'approved')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminApprovalsPage;
