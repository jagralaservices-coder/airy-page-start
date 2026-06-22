import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  Calendar,
  Building2,
  IndianRupee,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PurchaseOrderItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  status: 'draft' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  orderDate: string;
  expectedDate: string;
  notes?: string;
}

import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-muted/30 text-muted-foreground border-border', icon: Clock, gradient: 'from-slate-400 to-slate-500' },
  ordered: { label: 'Ordered', color: 'bg-primary/15 text-primary border-primary/30', icon: Package, gradient: 'from-blue-500 to-blue-600' },
  shipped: { label: 'Shipped', color: 'bg-warning/15 text-warning border-warning/30', icon: Truck, gradient: 'from-amber-500 to-orange-500' },
  delivered: { label: 'Delivered', color: 'bg-success/15 text-success border-success/30', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle, gradient: 'from-red-500 to-red-600' },
};

const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplierName: '',
    expectedDate: '',
    notes: '',
    items: [{ name: '', quantity: 1, unit: 'kg', unitPrice: 0 }] as PurchaseOrderItem[],
  });

  const fetchOrders = async () => {
    try {
      const activeStoreData = localStorage.getItem('pos_active_store_data');
      if (!activeStoreData) return;
      const storeId = JSON.parse(activeStoreData).id;

      const { data: dbOrders, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbOrders) {
        const formattedOrders: PurchaseOrder[] = dbOrders.map((o: any) => ({
          id: o.id,
          poNumber: o.po_number,
          supplierName: o.supplier_name,
          status: o.status,
          totalAmount: Number(o.total_amount),
          orderDate: o.order_date,
          expectedDate: o.expected_date,
          notes: o.notes,
          items: (o.purchase_order_items || []).map((i: any) => ({
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.unit_price)
          }))
        }));
        setOrders(formattedOrders);
      }
    } catch (err: any) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const addItem = () => {
    setNewOrder(p => ({ ...p, items: [...p.items, { name: '', quantity: 1, unit: 'kg', unitPrice: 0 }] }));
  };

  const updateItem = (idx: number, field: keyof PurchaseOrderItem, value: any) => {
    setNewOrder(p => ({
      ...p,
      items: p.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (idx: number) => {
    if (newOrder.items.length <= 1) return;
    setNewOrder(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const handleCreate = async () => {
    if (!newOrder.supplierName || newOrder.items.every(i => !i.name)) return;
    const activeStoreData = localStorage.getItem('pos_active_store_data');
    if (!activeStoreData) return;
    const storeId = JSON.parse(activeStoreData).id;

    const validItems = newOrder.items.filter(i => i.name);
    const total = validItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const poNumber = `PO-2026-${String(orders.length + 1).padStart(3, '0')}`;
    
    try {
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          store_id: storeId,
          po_number: poNumber,
          supplier_name: newOrder.supplierName,
          status: 'draft',
          order_date: new Date().toISOString().split('T')[0],
          expected_date: newOrder.expectedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          total_amount: total,
          notes: newOrder.notes
        })
        .select()
        .single();
        
      if (poError) throw poError;

      const itemsToInsert = validItems.map(i => ({
        purchase_order_id: po.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unitPrice
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({ title: 'Purchase order created', description: poNumber });
      setShowAddSheet(false);
      setNewOrder({ supplierName: '', expectedDate: '', notes: '', items: [{ name: '', quantity: 1, unit: 'kg', unitPrice: 0 }] });
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateStatus = async (id: string, status: PurchaseOrder['status']) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      toast({ title: `Order ${status}` });
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => !search || o.supplierName.toLowerCase().includes(search.toLowerCase()) || o.poNumber.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const totalValue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0);

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Purchase Orders</h1>
              <p className="text-xs text-muted-foreground">{orders.length} orders · {formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {(['draft', 'ordered', 'shipped', 'delivered'] as const).map(s => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className={cn('rounded-xl p-3 text-white bg-gradient-to-br', cfg.gradient)}>
                <Icon className="w-4 h-4 mb-1 opacity-80" />
                <p className="text-lg font-bold">{counts[s]}</p>
                <p className="text-[10px] text-white/70">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by supplier or PO number..."
            className="pl-9 rounded-xl bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['all', 'draft', 'ordered', 'shipped', 'delivered', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              )}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No purchase orders found</p>
            </div>
          ) : (
            filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={order.id} className="pos-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shrink-0', cfg.gradient)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{order.poNumber}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{order.supplierName}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={cn('text-[10px] border shrink-0', cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Items preview */}
                  <div className="bg-secondary/30 rounded-xl p-2.5 mb-3 border border-border/50">
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-[10px] bg-card px-2 py-0.5 rounded-md border border-border text-foreground">
                          {item.name} × {item.quantity}{item.unit}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-[10px] text-muted-foreground px-1">+{order.items.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">ETA {new Date(order.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{formatCurrency(order.totalAmount)}</span>
                      {order.status === 'draft' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => updateStatus(order.id, 'ordered')}>
                          Place Order
                        </Button>
                      )}
                      {order.status === 'ordered' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => updateStatus(order.id, 'shipped')}>
                          Mark Shipped
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg text-success border-success/30" onClick={() => updateStatus(order.id, 'delivered')}>
                          Received
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Add Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Purchase Order</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier Name</label>
              <Input
                placeholder="e.g. Fresh Farms Ltd"
                value={newOrder.supplierName}
                onChange={(e) => setNewOrder(p => ({ ...p, supplierName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Expected Delivery</label>
              <Input type="date" value={newOrder.expectedDate} onChange={(e) => setNewOrder(p => ({ ...p, expectedDate: e.target.value }))} />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Items</label>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {newOrder.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-secondary/30 rounded-xl p-2.5 border border-border/50">
                    <div className="col-span-5">
                      <label className="text-[10px] text-muted-foreground">Item</label>
                      <Input className="h-8 text-xs" placeholder="Name" value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Qty</label>
                      <Input className="h-8 text-xs" type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Unit</label>
                      <Input className="h-8 text-xs" value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Price</label>
                      <Input className="h-8 text-xs" type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button className="text-destructive hover:text-destructive/80 text-xs" onClick={() => removeItem(idx)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {newOrder.items.some(i => i.name) && (
                <p className="text-xs text-right mt-2 font-semibold text-primary">
                  Total: {formatCurrency(newOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea placeholder="Any notes..." value={newOrder.notes} onChange={(e) => setNewOrder(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <Button onClick={handleCreate} className="w-full" disabled={!newOrder.supplierName}>
              <Plus className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PurchaseOrdersPage;
