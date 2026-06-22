import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { CalendarClock, AlertTriangle, CheckCircle2, XCircle, Search, MoreVertical, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FEATURE_CATALOG } from '@/lib/featureCatalog';

type Row = {
  merchant_id: string;
  merchant_name: string;
  business_name: string;
  plan_name: string | null;
  status: string | null;
  expiry_date: string | null;
  staff_limit: number | null;
  outlet_limit: number | null;
  extra_staff: number | null;
  extra_outlets: number | null;
  addons: string[];
  custom_features: string[];
};

const STATUSES = ['active', 'suspended', 'expired', 'trial'];

export default function SubscriptionManagementPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: merchants }, { data: subs }, { data: addons }, { data: customs }] = await Promise.all([
        (supabase as any).from('merchants').select('id, name, business_name'),
        (supabase as any).from('merchant_subscription').select('*'),
        (supabase as any).from('merchant_addons').select('merchant_id, feature_key, enabled, expiry_date'),
        (supabase as any).from('merchant_custom_plan').select('merchant_id, features, is_active'),
      ]);
      const subMap = new Map((subs ?? []).map((s: any) => [s.merchant_id, s]));
      const addonMap = new Map<string, string[]>();
      const now = Date.now();
      (addons ?? []).forEach((a: any) => {
        if (a.enabled && new Date(a.expiry_date).getTime() > now) {
          const arr = addonMap.get(a.merchant_id) ?? [];
          arr.push(a.feature_key);
          addonMap.set(a.merchant_id, arr);
        }
      });
      const customMap = new Map((customs ?? []).filter((c: any) => c.is_active).map((c: any) => [c.merchant_id, c.features ?? []]));
      const result: Row[] = (merchants ?? []).map((m: any) => {
        const s: any = subMap.get(m.id) ?? {};
        return {
          merchant_id: m.id,
          merchant_name: m.name ?? '—',
          business_name: m.business_name ?? '—',
          plan_name: s.plan_name ?? null,
          status: s.status ?? null,
          expiry_date: s.expiry_date ?? null,
          staff_limit: s.staff_limit ?? null,
          outlet_limit: s.outlet_limit ?? null,
          extra_staff: s.extra_staff ?? 0,
          extra_outlets: s.extra_outlets ?? 0,
          addons: addonMap.get(m.id) ?? [],
          custom_features: customMap.get(m.id) ?? [],
        };
      });
      setRows(result);
    } catch (e: any) {
      console.error(e); toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const daysLeft = (d: string | null) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000);
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (search && !`${r.merchant_name} ${r.business_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    const dl = daysLeft(r.expiry_date) ?? 9999;
    if (filter === 'expired') return r.status === 'expired' || dl < 0;
    if (filter === 'suspended') return r.status === 'suspended';
    if (filter === '7days') return dl >= 0 && dl <= 7;
    if (filter === '30days') return dl > 7 && dl <= 30;
    if (filter === 'no_plan') return !r.plan_name;
    return true;
  }), [rows, filter, search]);

  const callAdmin = async (body: any) => {
    const { data, error } = await (supabase as any).functions.invoke('admin-subscription-manage', { body });
    if (error || (data && data.error)) {
      const msg = (data?.error ?? error?.message ?? 'Action failed') as string;
      toast.error(msg);
      return false;
    }
    toast.success('Done');
    await load();
    return true;
  };

  const assignPlan = (merchant_id: string, plan: string) =>
    callAdmin({ action: 'assign_plan', merchant_id, plan, duration_days: 365 });
  const extend = (merchant_id: string, days: number) =>
    callAdmin({ action: 'extend_expiry', merchant_id, days });
  const suspend = (merchant_id: string) => callAdmin({ action: 'suspend', merchant_id });
  const reactivate = (merchant_id: string) => callAdmin({ action: 'reactivate', merchant_id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription Management</h1>
        <p className="text-sm text-muted-foreground">Assign plans, activate addons, manage expiry — admin only.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard title="Total" value={rows.length} color="green" onClick={() => setFilter('all')} active={filter === 'all'} icon={CheckCircle2} />
        <StatCard title="Expired" value={rows.filter(r => (daysLeft(r.expiry_date) ?? 1) < 0).length} color="red" onClick={() => setFilter('expired')} active={filter === 'expired'} icon={XCircle} />
        <StatCard title="Expiring 7d" value={rows.filter(r => { const d = daysLeft(r.expiry_date); return d != null && d >= 0 && d <= 7; }).length} color="orange" onClick={() => setFilter('7days')} active={filter === '7days'} icon={AlertTriangle} />
        <StatCard title="Expiring 30d" value={rows.filter(r => { const d = daysLeft(r.expiry_date); return d != null && d > 7 && d <= 30; }).length} color="yellow" onClick={() => setFilter('30days')} active={filter === '30days'} icon={CalendarClock} />
        <StatCard title="Suspended" value={rows.filter(r => r.status === 'suspended').length} color="gray" onClick={() => setFilter('suspended')} active={filter === 'suspended'} icon={XCircle} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Merchant Subscriptions ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-[220px]" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="no_plan">No Plan</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="7days">Next 7 days</SelectItem>
                <SelectItem value="30days">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Outlets</TableHead>
                <TableHead>Addons</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No merchants match this filter.</TableCell></TableRow>}
              {filtered.map((r) => {
                const dl = daysLeft(r.expiry_date);
                return (
                  <TableRow key={r.merchant_id}>
                    <TableCell className="font-medium">{r.merchant_name}</TableCell>
                    <TableCell>{r.business_name}</TableCell>
                    <TableCell>
                      {r.plan_name
                        ? <Badge variant="outline" className="uppercase">{r.plan_name}</Badge>
                        : <Badge variant="secondary">none</Badge>}
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <div>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—'}</div>
                      {dl != null && <div className={`text-xs ${dl < 7 ? 'text-red-600' : 'text-muted-foreground'}`}>{dl < 0 ? `Expired ${-dl}d ago` : `${dl}d left`}</div>}
                    </TableCell>
                    <TableCell>{(r.staff_limit ?? 0) + (r.extra_staff ?? 0)}</TableCell>
                    <TableCell>{(r.outlet_limit ?? 0) + (r.extra_outlets ?? 0)}</TableCell>
                    <TableCell><Badge variant="secondary">{r.addons.length}</Badge></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Assign Plan</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => assignPlan(r.merchant_id, 'basic')}>Assign Basic</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => assignPlan(r.merchant_id, 'gold')}>Assign Gold</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => assignPlan(r.merchant_id, 'platinum')}>Assign Platinum</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => extend(r.merchant_id, 30)}>Extend +30 days</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => extend(r.merchant_id, 365)}>Extend +1 year</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditing(r)}>Manage Addons & Limits…</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {r.status === 'suspended'
                            ? <DropdownMenuItem onClick={() => reactivate(r.merchant_id)}>Reactivate</DropdownMenuItem>
                            : <DropdownMenuItem className="text-red-600" onClick={() => suspend(r.merchant_id)}>Suspend</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <ManageMerchantDialog
          row={editing}
          onClose={() => setEditing(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color, onClick, active, icon: Icon }: any) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <Card className={`cursor-pointer ${colors[color]} ${active ? 'ring-2 ring-offset-2 ring-primary' : ''}`} onClick={onClick}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <Icon className="h-7 w-7 opacity-50" />
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">—</Badge>;
  const colors: Record<string, string> = {
    active: 'bg-green-600', suspended: 'bg-gray-500', expired: 'bg-red-600', trial: 'bg-blue-600',
  };
  return <Badge className={`${colors[status] ?? 'bg-gray-500'} text-white capitalize`}>{status}</Badge>;
}

function ManageMerchantDialog({ row, onClose, onChanged }: { row: Row; onClose: () => void; onChanged: () => void }) {
  const [extraStaff, setExtraStaff] = useState(row.extra_staff ?? 0);
  const [extraOutlets, setExtraOutlets] = useState(row.extra_outlets ?? 0);
  const [addonKey, setAddonKey] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const call = async (body: any) => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('admin-subscription-manage', { body });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Failed');
      toast.success('Updated');
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Manage {row.merchant_name}</DialogTitle></DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Extra Staff Seats</label>
              <Input type="number" min={0} value={extraStaff} onChange={(e) => setExtraStaff(+e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Extra Outlets</label>
              <Input type="number" min={0} value={extraOutlets} onChange={(e) => setExtraOutlets(+e.target.value)} />
            </div>
          </div>
          <Button disabled={busy} onClick={() => call({ action: 'set_limits', merchant_id: row.merchant_id, extra_staff: extraStaff, extra_outlets: extraOutlets })}>
            Save Limits
          </Button>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Active Addons ({row.addons.length})</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {row.addons.length === 0 && <span className="text-sm text-muted-foreground">No active addons.</span>}
              {row.addons.map((k) => (
                <Badge key={k} variant="secondary" className="gap-1">
                  {k}
                  <button className="ml-1 text-red-500 hover:text-red-700" onClick={() => call({ action: 'remove_addon', merchant_id: row.merchant_id, feature_key: k })}>×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={addonKey} onValueChange={setAddonKey}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose feature…" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {FEATURE_CATALOG.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={!addonKey || busy} onClick={() => call({ action: 'activate_addon', merchant_id: row.merchant_id, feature_key: addonKey })}>
                <Plus className="w-4 h-4 mr-1" /> Activate
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
