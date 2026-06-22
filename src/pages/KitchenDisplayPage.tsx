import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Clock, Search, Settings, History, Play, CheckCircle2,
  UtensilsCrossed, ChefHat, Flame, ArrowLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface KitchenOrder {
  id: string;
  bill_number: string;
  items: any[];
  status: string;
  order_type: string;
  table_number: string | null;
  created_at: string;
  customer_name: string | null;
}

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};

export const KitchenDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKdsTab, setActiveKdsTab] = useState<'pending' | 'preparing' | 'ready'>('pending');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = useCallback(async () => {
    const storeId = getStoreId();
    if (!storeId) { setIsLoading(false); return; }
    const { data, error } = await supabase
      .from('orders')
      .select('id, bill_number, items, status, order_type, table_number, created_at, customer_name')
      .eq('store_id', storeId)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: false });
    if (!error && data) setOrders(data as KitchenOrder[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const storeId = getStoreId();
    if (!storeId) return;
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { toast({ title: 'Error', description: 'Could not update order status', variant: 'destructive' }); return; }
    if (newStatus === 'ready') { try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play().catch(() => {}); } catch {} }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast({ title: `Order ${newStatus}` });
  };

  const getElapsedMinutes = (createdAt: string) => Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);

  const getTimeLabel = (mins: number) => {
    if (mins < 1) return '00:01';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' && (!searchQuery || o.bill_number.includes(searchQuery) || (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())));
  const preparingOrders = orders.filter(o => o.status === 'preparing' && (!searchQuery || o.bill_number.includes(searchQuery) || (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())));
  const readyOrders = orders.filter(o => o.status === 'ready' && (!searchQuery || o.bill_number.includes(searchQuery) || (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())));

  const getTimeBadgeColor = (mins: number) => {
    if (mins > 15) return 'bg-destructive/20 text-destructive';
    if (mins > 8) return 'bg-amber-500/20 text-amber-400';
    return 'bg-muted text-muted-foreground';
  };

  const getBorderColor = (status: string, mins: number) => {
    if (status === 'pending' && mins > 10) return 'border-l-destructive';
    if (status === 'pending') return 'border-l-amber-500';
    if (status === 'preparing') return 'border-l-primary';
    return 'border-l-green-500';
  };

  const renderOrderCard = (order: KitchenOrder) => {
    const mins = getElapsedMinutes(order.created_at);
    const items = order.items as any[];
    const displayLabel = order.table_number ? `TABLE #${order.table_number.toString().padStart(2, '0')}` : order.order_type.toUpperCase();
    const serverName = order.customer_name || 'Guest';

    return (
      <div key={order.id} className={cn(
        'bg-card rounded-xl border border-border/60 border-l-4 overflow-hidden',
        getBorderColor(order.status, mins)
      )}>
        {/* Card header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-foreground">{displayLabel}</h3>
            <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold', getTimeBadgeColor(mins))}>
              <Clock className="w-3 h-3" />
              {getTimeLabel(mins)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">#{order.bill_number} • Server: {serverName}</p>
        </div>

        {/* Items */}
        <div className="px-4 py-2 border-t border-border/30 space-y-1.5">
          {items.slice(0, 4).map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              {order.status === 'preparing' && (
                <div className="w-5 h-5 rounded border-2 border-border/60 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{item.quantity}x {item.name}</p>
                {item.notes && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded uppercase">{item.notes}</span>
                )}
              </div>
            </div>
          ))}
          {items.length > 4 && <p className="text-xs text-muted-foreground">+{items.length - 4} more items</p>}
        </div>

        {/* Action button */}
        <div className="px-4 pb-3 pt-1">
          {order.status === 'pending' && (
            <Button
              onClick={() => updateOrderStatus(order.id, 'preparing')}
              className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 font-bold text-sm uppercase tracking-wider"
            >
              <Play className="w-4 h-4 mr-2" /> START COOKING
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button
              onClick={() => updateOrderStatus(order.id, 'ready')}
              className="w-full h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> MARK READY
            </Button>
          )}
          {order.status === 'ready' && (
            <Button
              onClick={() => updateOrderStatus(order.id, 'completed')}
              className="w-full h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> COMPLETE
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">MAXORA KDS</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">STATION: MAIN KITCHEN</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <History className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column Layout (horizontal scroll on mobile) */}
      <div className={cn(
        "flex p-4 min-h-[calc(100vh-120px)] pb-24",
        isMobile ? "flex-col w-full" : "flex-row gap-4 overflow-x-auto"
      )}>
        {/* Pending Column */}
        {(!isMobile || activeKdsTab === 'pending') && (
          <div className={cn("flex-1", isMobile ? "w-full" : "min-w-[300px]")}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">Pending</h2>
              <span className="text-xs bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full font-medium">{pendingOrders.length}</span>
            </div>
            <div className="space-y-3">
              {pendingOrders.map(renderOrderCard)}
              {pendingOrders.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-xl bg-card">
                  No pending orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preparing Column */}
        {(!isMobile || activeKdsTab === 'preparing') && (
          <div className={cn("flex-1", isMobile ? "w-full" : "min-w-[300px]", isMobile ? "mt-0" : "")}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-primary uppercase">Preparing</h2>
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">{preparingOrders.length}</span>
            </div>
            <div className="space-y-3">
              {preparingOrders.map(renderOrderCard)}
              {preparingOrders.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-xl bg-card">
                  No preparing orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ready Column */}
        {(!isMobile || activeKdsTab === 'ready') && (
          <div className={cn("flex-1", isMobile ? "w-full" : "min-w-[300px]", isMobile ? "mt-0" : "")}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-green-400 uppercase">Ready</h2>
              <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">{readyOrders.length}</span>
            </div>
            <div className="space-y-3">
              {readyOrders.map(renderOrderCard)}
              {readyOrders.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-xl bg-card">
                  No ready orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {orders.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">No active orders</p>
              <p className="text-sm text-muted-foreground/70">Orders will appear here in real-time</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-30 pb-safe">
        <div className="flex justify-around py-2">
          {[
            { icon: Flame, label: 'PENDING', id: 'pending' as const, path: '/kitchen' },
            { icon: ChefHat, label: 'PREPARING', id: 'preparing' as const, path: '/kitchen' },
            { icon: CheckCircle2, label: 'READY', id: 'ready' as const, path: '/kitchen' },
            { icon: Settings, label: 'MORE', id: 'more' as const, path: '/settings' },
          ].map((nav) => {
            const isActive = isMobile ? (nav.id === 'more' ? false : activeKdsTab === nav.id) : (nav.id === 'pending');
            return (
              <button
                key={nav.label}
                onClick={() => {
                  if (nav.id === 'more') {
                    navigate(nav.path);
                  } else {
                    if (isMobile) {
                      setActiveKdsTab(nav.id);
                    } else {
                      navigate(nav.path);
                    }
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <nav.icon className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wider">{nav.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplayPage;
