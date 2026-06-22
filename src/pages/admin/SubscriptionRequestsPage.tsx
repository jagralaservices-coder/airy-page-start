import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Req = {
  id: string; merchant_id: string; requested_by: string; request_type: string;
  requested_plan: string | null; requested_feature: string | null; quantity: number | null;
  message: string | null; status: string; admin_note: string | null;
  created_at: string; merchant_name?: string;
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  plan_upgrade: 'Plan Upgrade',
  addon: 'Addon',
  extra_staff: 'Extra Staff',
  extra_outlet: 'Extra Outlet',
  custom: 'Custom',
};

export default function SubscriptionRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviewing, setReviewing] = useState<Req | null>(null);
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');

  const load = async () => {
    setLoading(true);
    const { data: reqs } = await (supabase as any).from('subscription_requests')
      .select('*').order('created_at', { ascending: false });
    const ids = Array.from(new Set((reqs ?? []).map((r: any) => r.merchant_id)));
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: ms } = await (supabase as any).from('merchants').select('id, name').in('id', ids);
      names = Object.fromEntries((ms ?? []).map((m: any) => [m.id, m.name]));
    }
    setRows((reqs ?? []).map((r: any) => ({ ...r, merchant_name: names[r.merchant_id] ?? '—' })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = (supabase as any).channel('admin-sub-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, load)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, []);

  const filtered = rows.filter(r => r.status === tab);

  const openReview = (r: Req, d: 'approved' | 'rejected') => {
    setReviewing(r); setDecision(d); setNote('');
  };

  const submit = async () => {
    if (!reviewing) return;
    const { data, error } = await (supabase as any).functions.invoke('process-subscription-request', {
      body: { request_id: reviewing.id, decision, admin_note: note || null },
    });
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Failed');
      return;
    }
    toast.success(`Request ${decision}`);
    setReviewing(null); load();
  };

  const counts = {
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="w-6 h-6" /> Subscription Requests</h1>
        <p className="text-sm text-muted-foreground">Approve or reject merchant requests. Approved requests are applied automatically.</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">
            {t} <Badge variant="secondary" className="ml-2">{counts[t]}</Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg capitalize">{tab} requests</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No {tab} requests.</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.merchant_name}</TableCell>
                  <TableCell><Badge variant="outline">{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {r.requested_plan && <div><span className="text-muted-foreground">Plan:</span> {r.requested_plan}</div>}
                    {r.requested_feature && <div><span className="text-muted-foreground">Feature:</span> {r.requested_feature}</div>}
                    {r.quantity && r.quantity > 1 && <div><span className="text-muted-foreground">Qty:</span> {r.quantity}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.message ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => openReview(r, 'approved')}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => openReview(r, 'rejected')}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                      </div>
                    ) : (
                      <Badge variant={r.status === 'approved' ? 'default' : 'destructive'} className="capitalize">
                        {r.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />} {r.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'approved' ? 'Approve' : 'Reject'} request</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><b>Merchant:</b> {reviewing.merchant_name}</div>
                <div><b>Type:</b> {REQUEST_TYPE_LABEL[reviewing.request_type] ?? reviewing.request_type}</div>
                {reviewing.requested_plan && <div><b>Plan:</b> {reviewing.requested_plan}</div>}
                {reviewing.requested_feature && <div><b>Feature:</b> {reviewing.requested_feature}</div>}
              </div>
              <Textarea placeholder="Optional note for the merchant…" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button onClick={submit}>Confirm {decision}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
