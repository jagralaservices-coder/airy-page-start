import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  Truck, User, Phone, Clock, CheckCircle, Package, ArrowLeft, RefreshCw, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeliveryOrder {
  id: string;
  bill_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: any[];
  total: number;
  status: string;
  created_at: string;
  delivery_assignment?: {
    id: string;
    delivery_boy_name: string;
    delivery_boy_phone: string | null;
    status: string;
    assigned_at: string;
    picked_up_at: string | null;
    delivered_at: string | null;
  };
}

export const DeliveryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [driverPhones, setDriverPhones] = useState<Record<string, string>>({});

  // Get store ID
  const getStoreId = () => {
    try {
      const activeStore = localStorage.getItem('pos_active_store');
      if (activeStore) {
        const parsed = JSON.parse(activeStore);
        if (parsed) return parsed;
      }
    } catch {}

    const storeData = localStorage.getItem('pos_active_store_data');
    const storeLogin = localStorage.getItem('store_login');
    if (storeData) {
      try { return JSON.parse(storeData).id; } catch {}
    }
    if (storeLogin) {
      try { return JSON.parse(storeLogin).store_id; } catch {}
    }
    return localStorage.getItem('pos_store_id');
  };

  // Delivery boys from staff settings (stored in localStorage for now)
  const getDeliveryBoys = () => {
    try {
      const saved = localStorage.getItem('pos_delivery_boys');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'd1', name: 'Rahul Kumar', phone: '+91 98765 43210' },
      { id: 'd2', name: 'Amit Singh', phone: '+91 87654 32109' },
      { id: 'd3', name: 'Vijay Sharma', phone: '+91 76543 21098' },
    ];
  };
  const drivers = getDeliveryBoys();

  const fetchDeliveryOrders = async () => {
    setLoading(true);
    const storeId = getStoreId();
    if (!storeId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .eq('order_type', 'delivery')
      .in('status', ['pending', 'preparing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch delivery assignments for these orders
      const orderIds = data.map((o: any) => o.id);
      const { data: assignments } = await supabase
        .from('delivery_assignments')
        .select('*')
        .in('order_id', orderIds.length > 0 ? orderIds : ['none']);

      const assignmentMap = new Map();
      (assignments || []).forEach((a: any) => assignmentMap.set(a.order_id, a));

      setDeliveryOrders(data.map((o: any) => ({
        id: o.id,
        bill_number: o.bill_number,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_address: o.customer_address,
        items: Array.isArray(o.items) ? o.items : [],
        total: o.total,
        status: o.status,
        created_at: o.created_at,
        delivery_assignment: assignmentMap.get(o.id) || undefined,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchDeliveryOrders(); }, []);

  const pendingOrders = deliveryOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const completedOrders = deliveryOrders.filter(o => o.status === 'completed');

  const handleAssignDriver = async (orderId: string) => {
    const driverName = selectedDrivers[orderId];
    if (!driverName) { toast.error('Please select a driver'); return; }
    const storeId = getStoreId();
    if (!storeId) return;

    const driver = drivers.find((d: any) => d.name === driverName);

    const { error } = await supabase.from('delivery_assignments').insert({
      store_id: storeId,
      order_id: orderId,
      delivery_boy_name: driverName,
      delivery_boy_phone: driver?.phone || driverPhones[orderId] || null,
      status: 'preparing',
    } as any);

    if (!error) {
      // Update order status to preparing
      await supabase.from('orders').update({ status: 'preparing' }).eq('id', orderId);
      toast.success(`${driverName} assigned!`);
      fetchDeliveryOrders();
    } else {
      toast.error('Failed to assign driver');
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    const storeId = getStoreId();
    if (!storeId) return;

    const updateData: any = { status: newStatus };
    if (newStatus === 'out_for_delivery') updateData.picked_up_at = new Date().toISOString();
    if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('order_id', orderId)
      .eq('store_id', storeId);

    if (!error) {
      if (newStatus === 'delivered') {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchDeliveryOrders();
    } else {
      toast.error('Failed to update status');
    }
  };

  const activeDriverCount = deliveryOrders.filter(o => o.delivery_assignment && o.delivery_assignment.status !== 'delivered').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">🚚 {t('delivery.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('delivery.trackOrder')}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchDeliveryOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border/60 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Pending</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-success">{completedOrders.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Delivered</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-warning">{activeDriverCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Drivers</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Deliveries */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('delivery.pendingDeliveries')}</h2>
          {loading ? (
            <div className="pos-card p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="pos-card p-8 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="pos-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">#{order.bill_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} items • {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      order.status === 'preparing' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'
                    )}>
                      {order.status === 'preparing' ? t('orders.preparing') : t('orders.pending')}
                    </span>
                  </div>

                  {order.customer_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <User className="w-4 h-4" /> {order.customer_name}
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Phone className="w-4 h-4" /> {order.customer_phone}
                    </div>
                  )}
                  {order.customer_address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" /> {order.customer_address}
                    </div>
                  )}

                  {order.delivery_assignment ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">
                          🏍️ {order.delivery_assignment.delivery_boy_name}
                        </span>
                        <span className={cn('text-xs px-2 py-1 rounded-full',
                          order.delivery_assignment.status === 'preparing' ? 'bg-warning/20 text-warning' :
                          order.delivery_assignment.status === 'out_for_delivery' ? 'bg-primary/20 text-primary' :
                          'bg-success/20 text-success'
                        )}>
                          {order.delivery_assignment.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {order.delivery_assignment.status === 'preparing' && (
                          <Button size="sm" className="flex-1" onClick={() => handleUpdateDeliveryStatus(order.id, 'out_for_delivery')}>
                            <Truck className="w-4 h-4 mr-1" /> Out for Delivery
                          </Button>
                        )}
                        {order.delivery_assignment.status === 'out_for_delivery' && (
                          <Button size="sm" variant="default" className="flex-1" onClick={() => handleUpdateDeliveryStatus(order.id, 'delivered')}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <select 
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedDrivers[order.id] || ''}
                        onChange={(e) => setSelectedDrivers(prev => ({ ...prev, [order.id]: e.target.value }))}
                      >
                        <option value="">{t('delivery.assignDriver')}</option>
                        {drivers.map((d: any) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => handleAssignDriver(order.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Assign
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drivers & Integrations */}
        <div className="space-y-6">
          {/* Drivers */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('staff.deliveryBoy')}</h2>
            <div className="space-y-3">
              {drivers.map((driver: any) => {
                const assignedCount = deliveryOrders.filter(o => o.delivery_assignment?.delivery_boy_name === driver.name && o.delivery_assignment?.status !== 'delivered').length;
                return (
                  <div key={driver.id} className="pos-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">🏍️</div>
                        <div>
                          <h3 className="font-medium text-foreground">{driver.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" /> {driver.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn('text-xs px-2 py-1 rounded-full',
                          assignedCount > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                        )}>
                          {assignedCount > 0 ? `${assignedCount} orders` : t('common.active')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Online Orders Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('common.integrations')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="pos-card p-4 border-2 border-dashed border-primary/30 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate('/online-orders')}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl">🧡</div>
                  <div>
                    <h3 className="font-semibold text-foreground">Swiggy</h3>
                    <p className="text-xs text-muted-foreground">View orders →</p>
                  </div>
                </div>
              </div>
              <div className="pos-card p-4 border-2 border-dashed border-destructive/30 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate('/online-orders')}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl">❤️</div>
                  <div>
                    <h3 className="font-semibold text-foreground">Zomato</h3>
                    <p className="text-xs text-muted-foreground">View orders →</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
