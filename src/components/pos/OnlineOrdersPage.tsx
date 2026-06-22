import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Globe, RefreshCw, Check, X, Clock, 
  Copy, Package, Volume2, VolumeX,
  TrendingUp, DollarSign, Percent, Printer, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/store';
import { usePaymentSound } from '@/hooks/usePaymentSound';
import { silentIframePrint } from '@/lib/printUtils';

interface OnlineOrder {
  id: string;
  platform: string;
  platform_order_id: string;
  items: Array<{ name: string; quantity: number; price: number; notes?: string }>;
  subtotal: number;
  tax: number;
  delivery_charge: number;
  total: number;
  commission_percentage: number;
  commission_amount: number;
  net_receivable: number;
  status: string;
  created_at: string;
  raw_payload: any;
}

interface OnlineOrderSettings {
  kotPrintAfterAutoaccept: boolean;
  billPrintAfterAutoaccept: boolean;
  autoCancelDuration: string;
}

const getOnlineOrderSettings = (): OnlineOrderSettings => {
  try {
    const saved = localStorage.getItem('onlineOrderSettings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { kotPrintAfterAutoaccept: true, billPrintAfterAutoaccept: true, autoCancelDuration: '15' };
};

const AUTO_ACCEPT_SECONDS = 5;

// Auto-accept countdown component
const CountdownTimer: React.FC<{ orderId: string; onAutoAccept: (id: string) => void; createdAt: string }> = ({ orderId, onAutoAccept, createdAt }) => {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, AUTO_ACCEPT_SECONDS - elapsed);
  });

  useEffect(() => {
    if (remaining <= 0) {
      onAutoAccept(orderId);
      return;
    }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, orderId, onAutoAccept]);

  const pct = (remaining / AUTO_ACCEPT_SECONDS) * 100;

  return (
    <div className="flex items-center gap-2 mb-2">
      <Timer className="w-4 h-4 text-yellow-500 animate-pulse" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-yellow-500 transition-all duration-1000 ease-linear rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-yellow-500 min-w-[20px]">{remaining}s</span>
      <span className="text-xs text-muted-foreground">Auto Accept</span>
    </div>
  );
};

const generateOnlineOrderBillHtml = (order: OnlineOrder, storeName: string): string => {
  const itemsHtml = (order.items as any[]).map(item => `
    <tr>
      <td style="padding:2px 0;font-size:12px;">${item.quantity}x ${item.name}</td>
      <td style="text-align:right;padding:2px 0;font-size:12px;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="width:280px;font-family:monospace;padding:8px;">
      <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:6px;margin-bottom:6px;">
        <div style="font-size:16px;font-weight:bold;">${storeName}</div>
        <div style="font-size:11px;margin-top:4px;">ONLINE ORDER - ${order.platform.toUpperCase()}</div>
        <div style="font-size:11px;">#${order.platform_order_id}</div>
        <div style="font-size:10px;color:#666;">${new Date(order.created_at).toLocaleString()}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
      </table>
      <div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>₹${order.subtotal.toFixed(2)}</span></div>
        ${order.tax > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Tax</span><span>₹${order.tax.toFixed(2)}</span></div>` : ''}
        ${order.delivery_charge > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Delivery</span><span>₹${order.delivery_charge.toFixed(2)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px dashed #000;padding-top:4px;margin-top:4px;">
          <span>TOTAL</span><span>₹${order.total.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#666;font-size:10px;margin-top:2px;">
          <span>Commission (${order.commission_percentage}%)</span><span>-₹${order.commission_amount.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;color:green;font-size:11px;">
          <span>Net Receivable</span><span>₹${order.net_receivable.toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:8px;font-size:10px;border-top:1px dashed #000;padding-top:6px;">
        Auto-accepted | ${order.platform.toUpperCase()} Order
      </div>
    </div>
  `;
};

export const OnlineOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSuccessSound } = usePaymentSound();
  const autoAcceptedRef = useRef<Set<string>>(new Set());

  const storeId = (() => {
    try {
      const data = localStorage.getItem('pos_active_store_data');
      return data ? JSON.parse(data)?.id : null;
    } catch { return null; }
  })();

  const storeName = (() => {
    try {
      const data = localStorage.getItem('pos_active_store_data');
      return data ? JSON.parse(data)?.store_name || 'Store' : 'Store';
    } catch { return 'Store'; }
  })();

  const loadOrders = useCallback(async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from('online_orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setOrders(data as unknown as OnlineOrder[]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    loadOrders();
    // NOTE: 10s polling removed — realtime subscription below handles updates
    // (fix #8: duplicate API calls every 10s while channel is already live).
  }, [loadOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel('online-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_orders', filter: `store_id=eq.${storeId}` }, (payload) => {
        loadOrders();
        if (soundEnabled) {
          const orderId = payload.new && typeof payload.new === 'object' && 'id' in payload.new ? (payload.new as any).id : `online-${Date.now()}`;
          playSuccessSound(`online-order-${orderId}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId, loadOrders, soundEnabled, playSuccessSound]);

  const autoAcceptAndPrint = useCallback(async (orderId: string) => {
    if (autoAcceptedRef.current.has(orderId)) return;
    autoAcceptedRef.current.add(orderId);

    const { error } = await supabase
      .from('online_orders')
      .update({ status: 'accepted' })
      .eq('id', orderId);

    if (error) {
      toast.error('Auto-accept failed');
      autoAcceptedRef.current.delete(orderId);
      return;
    }

    toast.success('Order auto-accepted!', { icon: <Check className="w-4 h-4" /> });

    // Auto print bill if enabled
    const settings = getOnlineOrderSettings();
    if (settings.billPrintAfterAutoaccept) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const html = generateOnlineOrderBillHtml(order, storeName);
        try {
          silentIframePrint(html);
          toast.success('Bill printed automatically', { icon: <Printer className="w-4 h-4" /> });
        } catch {
          toast.error('Auto-print failed');
        }
      }
    }

    loadOrders();
  }, [orders, storeName, loadOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('online_orders')
      .update({ status })
      .eq('id', orderId);
    if (error) {
      toast.error('Failed to update order');
    } else {
      toast.success(`Order ${status}`);
      loadOrders();
    }
  };

  const printOrderBill = (order: OnlineOrder) => {
    const html = generateOnlineOrderBillHtml(order, storeName);
    silentIframePrint(html);
    toast.success('Bill sent to printer');
  };

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/online-order-webhook`;

  const copyWebhookUrl = (platform: string) => {
    const url = `${webhookUrl}?platform=${platform}&store_id=${storeId}`;
    navigator.clipboard.writeText(url);
    toast.success(`${platform} webhook URL copied!`);
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'swiggy': return 'bg-orange-500';
      case 'zomato': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'preparing': return 'bg-purple-500';
      case 'ready': return 'bg-green-500';
      case 'picked': return 'bg-muted-foreground';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'pending') return o.status === 'pending';
    if (filter === 'accepted') return ['accepted', 'preparing', 'ready'].includes(o.status);
    if (filter === 'completed') return ['picked', 'cancelled'].includes(o.status);
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  // Commission analytics
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at).toDateString();
    return orderDate === new Date().toDateString() && o.status !== 'cancelled';
  });
  const todayTotal = todayOrders.reduce((s, o) => s + o.total, 0);
  const todayCommission = todayOrders.reduce((s, o) => s + o.commission_amount, 0);
  const todayNet = todayOrders.reduce((s, o) => s + o.net_receivable, 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Online Orders
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount} new</Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">Swiggy, Zomato & more • Auto-accept in {AUTO_ACCEPT_SECONDS}s</p>
        </div>
        <Button size="sm" variant={soundEnabled ? 'default' : 'outline'} onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={loadOrders}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Commission Analytics */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-border">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Today's Sales</div>
            <div className="font-bold text-sm">{formatCurrency(todayTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Percent className="w-4 h-4 mx-auto text-destructive mb-1" />
            <div className="text-xs text-muted-foreground">Commission</div>
            <div className="font-bold text-sm text-destructive">-{formatCurrency(todayCommission)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <div className="text-xs text-muted-foreground">Net Revenue</div>
            <div className="font-bold text-sm text-green-500">{formatCurrency(todayNet)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook URLs */}
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold mb-2">Webhook URLs</h3>
        <div className="flex flex-wrap gap-2">
          {['swiggy', 'zomato', 'other'].map(platform => (
            <Button key={platform} size="sm" variant="outline" className="gap-1 text-xs" onClick={() => copyWebhookUrl(platform)}>
              <Copy className="w-3 h-3" />
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
        {(['all', 'pending', 'accepted', 'completed'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Orders will appear here when received via webhook</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={`p-4 rounded-xl border bg-card ${order.status === 'pending' ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-border'}`}>
              {/* Auto-accept countdown for pending orders */}
              {order.status === 'pending' && (
                <CountdownTimer orderId={order.id} onAutoAccept={autoAcceptAndPrint} createdAt={order.created_at} />
              )}

              {/* Order Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPlatformColor(order.platform)} text-white`}>
                      {order.platform.toUpperCase()}
                    </Badge>
                    <span className="font-bold">#{order.platform_order_id}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(order.status)} text-white`}>{order.status}</Badge>
                  {order.status !== 'pending' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => printOrderBill(order)}>
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {(order.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Commission breakdown */}
              <div className="p-2 rounded-lg bg-muted/50 mb-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                )}
                {order.delivery_charge > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{formatCurrency(order.delivery_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Commission ({order.commission_percentage}%)</span>
                  <span>-{formatCurrency(order.commission_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-500">
                  <span>Net Receivable</span>
                  <span>{formatCurrency(order.net_receivable)}</span>
                </div>
              </div>

              {/* Actions */}
              {order.status === 'pending' && (
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => { autoAcceptedRef.current.add(order.id); updateOrderStatus(order.id, 'accepted'); }}>
                    <Check className="w-4 h-4 mr-1" /> Accept Now
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { autoAcceptedRef.current.add(order.id); updateOrderStatus(order.id, 'cancelled'); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {order.status === 'accepted' && (
                <Button className="w-full" size="sm" variant="secondary" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                  Start Preparing
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button className="w-full" size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>
                  Mark Ready
                </Button>
              )}
              {order.status === 'ready' && (
                <Button className="w-full" size="sm" variant="secondary" onClick={() => updateOrderStatus(order.id, 'picked')}>
                  Mark Picked Up
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
