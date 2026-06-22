import React, { useEffect } from 'react';
import { UserCheck, Store, UserSquare2, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPendingApprovals,
  approveOwner, rejectOwner,
  approveStore, rejectStore,
  approveStaff, rejectStaff,
} from '@/store/slices/approvalSlice';

export default function PendingApprovalsPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { owners, stores, staff, isLoading, isMutating } = useAppSelector((s) => s.approval);

  const refresh = () => dispatch(fetchPendingApprovals());
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const run = async (thunk: any, payload: any, label: string) => {
    const result = await dispatch(thunk(payload));
    if ((thunk as any).fulfilled.match(result)) {
      toast({ title: label });
      refresh();
    } else {
      toast({ title: 'Action Failed', description: (result.payload as string) || 'Error', variant: 'destructive' });
    }
  };

  const ApprovalCard = ({ title, subtitle, date, onApprove, onReject }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 mt-2">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <Clock className="w-4 h-4" />
          Created {(() => { try { return date ? format(new Date(date), 'MMM d, yyyy HH:mm') : '—'; } catch { return '—'; } })()}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onApprove} disabled={isMutating} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            <Check className="w-4 h-4 mr-2" /> Approve
          </Button>
          <Button onClick={onReject} disabled={isMutating} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
            <X className="w-4 h-4 mr-2" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-primary" />
          Pending Approvals
        </h2>
        <p className="text-slate-500 mt-1">Review and approve accounts created by Platform Admins.</p>
      </div>

      <Tabs defaultValue="owners" className="space-y-6">
        <TabsList className="bg-white border shadow-sm w-full justify-start h-auto p-1 overflow-x-auto">
          <TabsTrigger value="owners" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2.5 px-6">
            <UserCheck className="w-4 h-4 mr-2" />
            Owners ({owners.length})
          </TabsTrigger>
          <TabsTrigger value="stores" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2.5 px-6">
            <Store className="w-4 h-4 mr-2" />
            Stores ({stores.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2.5 px-6">
            <UserSquare2 className="w-4 h-4 mr-2" />
            Staff ({staff.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owners">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? <div className="col-span-full py-12 text-center text-slate-500">Loading...</div> :
             owners.length === 0 ? <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border">No pending owners.</div> :
             owners.map(c => (
               <ApprovalCard
                 key={c.id}
                 title={c.business_name}
                 subtitle={`${c.owner_name} (${c.owner_email})`}
                 date={c.created_at}
                 onApprove={() => run(approveOwner, { customer_id: c.id, owner_email: c.owner_email }, 'Owner approved')}
                 onReject={() => run(rejectOwner, { customer_id: c.id }, 'Owner rejected')}
               />
             ))
            }
          </div>
        </TabsContent>

        <TabsContent value="stores">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? <div className="col-span-full py-12 text-center text-slate-500">Loading...</div> :
             stores.length === 0 ? <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border">No pending stores.</div> :
             stores.map((s: any) => (
               <ApprovalCard
                 key={s.id}
                 title={s.store_name || s.name}
                 subtitle={`Linked to: ${s.customers?.business_name || 'Unknown'}`}
                 date={s.created_at}
                 onApprove={() => run(approveStore, { store_id: s.id }, 'Store approved')}
                 onReject={() => run(rejectStore, { store_id: s.id }, 'Store rejected')}
               />
             ))
            }
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? <div className="col-span-full py-12 text-center text-slate-500">Loading...</div> :
             staff.length === 0 ? <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border">No pending staff.</div> :
             staff.map((st: any) => (
               <ApprovalCard
                 key={st.id}
                 title={st.profiles?.full_name || 'Unknown'}
                 subtitle={`Role: ${st.role} | Store: ${st.stores?.store_name || st.stores?.name || 'None'}`}
                 date={st.created_at}
                 onApprove={() => run(approveStaff, { user_role_id: st.id }, 'Staff approved')}
                 onReject={() => run(rejectStaff, { user_role_id: st.id }, 'Staff rejected')}
               />
             ))
            }
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
