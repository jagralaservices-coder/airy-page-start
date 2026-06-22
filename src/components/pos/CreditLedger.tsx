import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/contexts/LocaleContext';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CreditCard, IndianRupee, User, Clock, Plus, Printer, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { getCreditLedger, setCreditLedger, getCreditPayments, setCreditPayments, CreditEntry, CreditPayment, safeMerge, getOrders } from '@/lib/store';
import { useStoreDataSync } from '@/hooks/useStoreDataSync';

interface CustomerGroup {
  key: string;
  name: string;
  phone: string;
  totalCredit: number;
  totalPaid: number;
  totalDue: number;
  status: 'paid' | 'partial' | 'unpaid';
  entries: CreditEntry[];
}

const normalizePhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').trim();
const normalizeName = (n: string | null | undefined) => (n || '').trim().toLowerCase();

export const CreditLedger: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();
  const { activeStore } = usePOS();
  const storeId = activeStore?.id;

  const { syncCreditLedger, syncCreditPayments, saveCreditEntryToCloud, saveCreditPaymentToCloud } = useStoreDataSync();

  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  // Idempotency guard: blocks rapid double-clicks of "Confirm Payment"
  // from creating two installments for the same intent (Risk #2).
  // Network/sync retries are already idempotent via id-based upsert.
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  const fetchEntries = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    
    // Load local cache immediately
    const local = getCreditLedger();
    if (local.length > 0) {
      setEntries(local);
      setLoading(false);
    }
    
    try {
      const merged = await syncCreditLedger(local);
      setEntries(merged);
    } catch (e) {
      console.warn('[Offline] Failed to sync credit entries, using local cache:', e);
    }
    setLoading(false);
  }, [storeId, syncCreditLedger]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Group entries by (name + phone)
  const customers: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, CustomerGroup>();
    entries.forEach(e => {
      const key = normalizeName(e.customer_name) + '|' + normalizePhone(e.customer_phone);
      const total = Number(e.total_amount || 0);
      const paid = Number(e.paid_amount || 0);
      const due = Number(e.due_amount ?? total - paid);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: e.customer_name,
          phone: e.customer_phone || '',
          totalCredit: 0,
          totalPaid: 0,
          totalDue: 0,
          status: 'unpaid',
          entries: [],
        });
      }
      const g = map.get(key)!;
      g.totalCredit += total;
      g.totalPaid += paid;
      g.totalDue += due;
      g.entries.push(e);
    });
    map.forEach(g => {
      if (g.totalDue <= 0) g.status = 'paid';
      else if (g.totalPaid > 0) g.status = 'partial';
      else g.status = 'unpaid';
    });
    let list = Array.from(map.values());
    if (filter !== 'all') list = list.filter(c => c.status === filter);
    return list.sort((a, b) => b.totalDue - a.totalDue);
  }, [entries, filter]);

  const fetchPaymentsForCustomer = async (creditIds: string[]) => {
    if (creditIds.length === 0) { setPayments([]); return; }
    
    // Load local cache immediately
    const localPayments = getCreditPayments().filter(p => creditIds.includes(p.credit_id));
    if (localPayments.length > 0) {
      setPayments(localPayments);
    }

    try {
      const allPayments = await syncCreditPayments(getCreditPayments());
      const filtered = allPayments.filter(p => creditIds.includes(p.credit_id));
      setPayments(filtered);
    } catch (e) {
      console.warn('[Offline] Failed to sync credit payments, using local cache:', e);
    }
  };

  const handleSelectCustomer = async (group: CustomerGroup) => {
    setSelectedCustomer(group);
    await fetchPaymentsForCustomer(group.entries.map(e => e.id));
  };

  const handlePayDue = async () => {
    if (submittingRef.current) return;
    if (!selectedCustomer || !storeId) return;
    let amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > selectedCustomer.totalDue) { toast.error('Amount exceeds total outstanding'); return; }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {

    // Apply FIFO across oldest unpaid bills
    const sorted = [...selectedCustomer.entries]
      .filter(e => Number(e.due_amount) > 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let remaining = amount;
    const paymentsToInsert: CreditPayment[] = [];
    const updatedEntries: CreditEntry[] = [];

    const allLocalEntries = getCreditLedger();
    const allLocalPayments = getCreditPayments();

    for (const entry of sorted) {
      if (remaining <= 0) break;
      const entryDue = Number(entry.due_amount);
      const apply = Math.min(remaining, entryDue);

      const payId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
      const localPay: CreditPayment = {
        id: payId,
        credit_id: entry.id,
        store_id: storeId,
        amount: apply,
        payment_method: payMethod,
        created_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        pendingSync: true
      };

      const newPaid = Number(entry.paid_amount) + apply;
      const newDue = Number(entry.total_amount) - newPaid;
      const newStatus = newDue <= 0 ? 'paid' : 'partial';

      const localEntryUpdate: CreditEntry = {
        ...entry,
        paid_amount: newPaid,
        due_amount: Math.max(0, newDue),
        payment_status: newStatus,
        lastUpdated: new Date().toISOString(),
        pendingSync: true
      };

      paymentsToInsert.push(localPay);
      updatedEntries.push(localEntryUpdate);
      remaining -= apply;
    }

    // Apply updates locally first
    const newLocalEntries = allLocalEntries.map(e => {
      const match = updatedEntries.find(u => u.id === e.id);
      return match ? match : e;
    });
    const newLocalPayments = [...paymentsToInsert, ...allLocalPayments];

    setCreditLedger(newLocalEntries);
    setCreditPayments(newLocalPayments);
    setEntries(newLocalEntries);
    setPayments(newLocalPayments.filter(p => selectedCustomer.entries.some(e => e.id === p.credit_id)));
    toast.success(`${formatCurrency(amount)} payment recorded locally!`);
    setShowPayDialog(false);
    setPayAmount('');

    // Trigger cloud updates in background
    try {
      await saveCreditPaymentToCloud(paymentsToInsert);
      await saveCreditEntryToCloud(updatedEntries);
    } catch (err) {
      console.warn('[Offline] Saved payment collection locally, cloud sync will retry.', err);
    }

    await fetchEntries();
    setSelectedCustomer(null);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePrintBill = async (entry: CreditEntry) => {
    if (!entry.bill_number || !storeId) {
      toast.error('No bill number on this entry');
      return;
    }

    let order = null;
    const localOrders = getOrders();
    const matchingLocal = localOrders.find(o => o.billNumber === entry.bill_number);
    if (matchingLocal) {
      order = matchingLocal;
    } else {
      try {
        const direct = localStorage.getItem('pos_store_code');
        let storeCode = direct || null;
        if (!storeCode) {
          const storeData = localStorage.getItem('pos_active_store_data');
          if (storeData) {
            const parsed = JSON.parse(storeData);
            storeCode = parsed?.storeCode || parsed?.store_code || null;
          }
        }
        const { data: ordersResult } = await supabase.functions.invoke('sync-orders', {
          body: { action: 'fetch', store_id: storeId, store_code: storeCode }
        });
        if (ordersResult?.orders) {
          const matching = ordersResult.orders.find((o: any) => o.bill_number === entry.bill_number);
          if (matching) {
            order = {
              id: matching.id,
              billNumber: matching.bill_number,
              items: matching.items || [],
              subtotal: Number(matching.subtotal),
              tax: Number(matching.tax),
              discount: Number(matching.discount),
              total: Number(matching.total),
              status: matching.status,
              orderType: matching.order_type,
              tableNumber: matching.table_number ? Number(matching.table_number) : undefined,
              customerName: matching.customer_name || undefined,
              customerPhone: matching.customer_phone || undefined,
              paymentMethod: matching.payment_method,
              createdAt: new Date(matching.created_at),
              kotPrinted: false,
              billPrinted: matching.status === 'completed',
              isDirectBill: true,
              storeId: matching.store_id,
            };
          }
        }
      } catch (e) {
        console.error('Failed to fetch order from cloud:', e);
      }
    }

    if (!order) {
      toast.error('Original bill not found');
      return;
    }

    const billHtml = generateProfessionalBill({
      id: order.id,
      billNumber: order.billNumber,
      createdAt: order.createdAt,
      orderType: order.orderType,
      tableNumber: order.tableNumber || undefined,
      customerName: order.customerName || entry.customer_name,
      customerPhone: order.customerPhone || entry.customer_phone || undefined,
      items: order.items || [],
      subtotal: Number(order.subtotal || 0),
      tax: Number(order.tax || 0),
      discount: Number(order.discount || 0),
      total: Number(order.total || 0),
      paymentMethod: order.paymentMethod || 'credit',
    } as any);
    const w = window.open('', '_blank', 'width=420,height=800');
    if (!w) { toast.error('Please allow popups for printing'); return; }
    w.document.open();
    w.document.write(billHtml);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const totalOutstanding = customers.reduce((s, c) => s + c.totalDue, 0);
  const statusColor = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Credit Ledger</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground mt-1">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <CreditCard className="w-10 h-10 text-muted-foreground" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'unpaid', 'partial', 'paid'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : customers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No credit customers found</p>
        ) : customers.map(c => (
          <button
            key={c.key}
            onClick={() => handleSelectCustomer(c)}
            className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{c.name}</span>
                {c.phone && <span className="text-xs text-muted-foreground">• {c.phone}</span>}
              </div>
              <Badge className={statusColor(c.status)}>{c.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{c.entries.length} bill{c.entries.length !== 1 ? 's' : ''}</span>
              <div className="text-right">
                <p className="font-bold text-destructive">Outstanding: {formatCurrency(c.totalDue)}</p>
                <p className="text-xs text-muted-foreground">Total: {formatCurrency(c.totalCredit)} • Paid: {formatCurrency(c.totalPaid)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Credit Details
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selectedCustomer.name}</span></div>
                {selectedCustomer.phone && (
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />Phone</span><span>{selectedCustomer.phone}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Total Credit</span><span className="font-bold">{formatCurrency(selectedCustomer.totalCredit)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-600">{formatCurrency(selectedCustomer.totalPaid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-destructive">{formatCurrency(selectedCustomer.totalDue)}</span></div>
              </div>

              {selectedCustomer.totalDue > 0 && (
                <Button className="w-full" onClick={() => { setShowPayDialog(true); setPayAmount(String(selectedCustomer.totalDue)); }}>
                  <IndianRupee className="w-4 h-4 mr-2" />
                  Collect Payment
                </Button>
              )}

              {/* Bills */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Bills ({selectedCustomer.entries.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCustomer.entries
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(e => {
                      const d = new Date(e.created_at);
                      return (
                        <div key={e.id} className="bg-card border border-border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-medium text-sm">#{e.bill_number || e.id.slice(-6)}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.toLocaleDateString()} • {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(Number(e.total_amount))}</p>
                              <Badge className={statusColor(e.payment_status)} variant="secondary">{e.payment_status}</Badge>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Due: {formatCurrency(Number(e.due_amount))}</span>
                            <Button size="sm" variant="outline" onClick={() => handlePrintBill(e)}>
                              <Printer className="w-3 h-3 mr-1" /> Print Bill
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Payment History</h4>
                {payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No payments collected yet</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {payments.map(p => {
                      const d = new Date(p.created_at);
                      return (
                        <div key={p.id} className="bg-card border border-border rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{formatCurrency(Number(p.amount))}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.toLocaleDateString()} • {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="uppercase">{p.payment_method}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Due Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Amount</label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Payment Method</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handlePayDue} disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" /> {isSubmitting ? 'Processing…' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
