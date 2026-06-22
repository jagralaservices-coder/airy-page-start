import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInventoryDeduction } from '@/hooks/useInventoryDeduction';
import { usePOS } from '@/contexts/POSContext';
import { usePaymentSound } from '@/hooks/usePaymentSound';
import { useLocale } from '@/contexts/LocaleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, QrCode, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { smartPrint } from '@/lib/printUtils';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { sendQROrderStatusWhatsApp } from '@/lib/billShareUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QROrder {
  id: string;
  order_number: string;
  table_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

// Generate KOT HTML for thermal printer
const generateKOT = (order: QROrder, storeName: string): string => {
  const now = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = order.items.map((item: any) =>
    `<tr><td style="font-size:18px;font-weight:900;padding:6px 0;">${item.name}</td><td style="font-size:20px;font-weight:900;text-align:right;padding:6px 0;">×${item.quantity}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    @page{size:80mm auto;margin:2mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial Black',Arial,sans-serif;width:80mm;max-width:80mm;margin:0 auto;padding:10px 8px;color:#000;background:#fff}
  </style></head><body>
    <div style="text-align:center;border-bottom:3px dashed #000;padding-bottom:10px;margin-bottom:10px">
      <div style="font-size:28px;font-weight:900;letter-spacing:2px">🍳 KOT</div>
      <div style="font-size:14px;font-weight:700;margin-top:4px">${storeName}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:8px">
      <span>Order #${order.order_number}</span>
      <span>QR ORDER</span>
    </div>
    <div style="font-size:12px;margin-bottom:8px">${now}</div>
    ${order.customer_name ? `<div style="font-size:13px;font-weight:700;margin-bottom:4px">Customer: ${order.customer_name}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;border-top:2px solid #000;border-bottom:2px solid #000;margin:8px 0">${itemsHtml}</table>
    ${order.notes ? `<div style="font-size:12px;font-weight:600;border:1px dashed #000;padding:6px;margin-top:8px;border-radius:4px">📝 ${order.notes}</div>` : ''}
    <div style="text-align:center;margin-top:12px;font-size:11px;color:#666">--- QR Menu Order ---</div>
  </body></html>`;
};

export const QROrdersPanel: React.FC = () => {
  const { activeStore } = usePOS();
  const { formatCurrency } = useLocale();
  const { deductInventoryForOrder } = useInventoryDeduction();
  const { playSuccessSound } = usePaymentSound();
  const [orders, setOrders] = useState<QROrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<QROrder | null>(null);
  const [loading, setLoading] = useState(true);

  const storeId = activeStore?.id;
  const storeName = activeStore?.name || 'Store';

  // Auto-print KOT + Bill for new QR order
  const autoPrintOrder = useCallback((order: QROrder) => {
    try {
      // 1. Print KOT
      const kotHtml = generateKOT(order, storeName);
      smartPrint(kotHtml, () => {
        // 2. Print Customer Bill after KOT
        const billHtml = generateProfessionalBill({
          id: order.id,
          billNumber: `QR-${order.order_number}`,
          createdAt: order.created_at,
          orderType: 'QR Order',
          customerName: order.customer_name || undefined,
          customerPhone: order.customer_phone || undefined,
          items: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          discount: 0,
          total: order.total,
          paymentMethod: 'Pending',
        });
        smartPrint(billHtml);
      });
    } catch (e) {
      console.error('Auto print failed:', e);
    }
  }, [storeName]);

  useEffect(() => {
    if (!storeId) return;
    fetchOrders();

    // Realtime subscription
    const channel = supabase
      .channel('qr-orders-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'qr_orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const newOrder = payload.new as QROrder;
        setOrders(prev => [newOrder, ...prev]);
        
        // Notification
        toast.info(`🔔 New QR Order #${newOrder.order_number}${newOrder.customer_name ? ` - ${newOrder.customer_name}` : ''}`, {
          duration: 15000,
        });

        // Play notification sound using centralized payment sound settings
        playSuccessSound(`qr-order-${newOrder.order_number}`);

        // Auto-print KOT + Bill
        autoPrintOrder(newOrder);

        // Send WhatsApp confirmation
        if (newOrder.customer_phone) {
          sendQROrderStatusWhatsApp(
            storeId,
            newOrder.customer_phone,
            newOrder.customer_name || 'Valued Guest',
            storeName,
            newOrder.order_number,
            'pending',
            newOrder.total
          ).catch(err => console.error('[QROrdersPanel] Failed to send status WhatsApp on insert:', err));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'qr_orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as QROrder : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId, autoPrintOrder, playSuccessSound]);

  const fetchOrders = async () => {
    if (!storeId) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('qr_orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as QROrder[]);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('qr_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    
    if (error) {
      toast.error('Failed to update order');
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order && storeId) {
      // Send WhatsApp status update
      if (order.customer_phone) {
        sendQROrderStatusWhatsApp(
          storeId,
          order.customer_phone,
          order.customer_name || 'Valued Guest',
          storeName,
          order.order_number,
          status,
          order.total
        ).catch(err => console.error('[QROrdersPanel] Failed to send status WhatsApp on update:', err));
      }
    }

    // When QR order is completed, insert into main orders table for sales/reports
    if (status === 'completed') {
      const order = orders.find(o => o.id === orderId);
      if (order && storeId) {
        try {
          // Check if already inserted (prevent duplicates)
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('bill_number', `QR-${order.order_number}`)
            .eq('store_id', storeId)
            .maybeSingle();

          if (!existing) {
            // Enrich items with category from menu_items
            const { data: menuItems } = await supabase
              .from('menu_items')
              .select('name, category')
              .eq('store_id', storeId);

            const categoryMap = new Map<string, string>();
            (menuItems || []).forEach((mi: any) => {
              categoryMap.set(mi.name.toLowerCase().trim(), mi.category);
            });

            const enrichedItems = (order.items || []).map((item: any) => ({
              ...item,
              category: item.category || categoryMap.get((item.name || '').toLowerCase().trim()) || 'General',
            }));

            const billNumber = `QR-${order.order_number}`;
            const { error: insertError } = await supabase.from('orders').insert({
              store_id: storeId,
              bill_number: billNumber,
              items: enrichedItems as any,
              subtotal: order.subtotal,
              tax: order.tax,
              discount: 0,
              total: order.total,
              payment_method: 'cash',
              status: 'completed',
              order_type: 'qr',
              customer_name: order.customer_name || null,
              customer_phone: order.customer_phone || null,
              table_number: order.table_number || null,
              created_at: order.created_at,
            });
            
            if (insertError) {
              console.error(`[QROrders] ❌ Failed to insert QR-${order.order_number} into orders:`, insertError);
              toast.error(`Failed to add QR order to sales: ${insertError.message}`);
            } else {
              console.log(`[QROrders] ✅ Order QR-${order.order_number} pushed to sales with categories`);
              toast.success(`QR Order #${order.order_number} added to sales reports`);

              // Deduct inventory for QR order items
              try {
                const itemsForDeduction = enrichedItems.map((item: any) => ({
                  id: item.id || item.name,
                  name: item.name,
                  quantity: item.quantity || 1,
                  category: item.category,
                }));
                await deductInventoryForOrder(storeId, itemsForDeduction);
                console.log(`[QROrders] 📦 Inventory deducted for QR-${order.order_number}`);
              } catch (invErr) {
                console.error('[QROrders] Inventory deduction error:', invErr);
              }
            }
          } else {
            console.log(`[QROrders] ⏩ Order QR-${order.order_number} already in sales, skipped`);
          }
        } catch (e) {
          console.error('[QROrders] Failed to add to orders table:', e);
        }
      }
    }

    toast.success(`Order ${status}`);
    setSelectedOrder(null);
  };

  const manualPrint = (order: QROrder) => {
    autoPrintOrder(order);
    toast.success('Print sent!');
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'preparing': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ready': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          QR Orders
          {pendingCount > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 animate-pulse">
              {pendingCount} new
            </Badge>
          )}
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchOrders} className="text-xs h-7">
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No QR orders today
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={cn(
                'w-full text-left rounded-xl p-3 border transition-all hover:shadow-md',
                order.status === 'pending' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20' : 'bg-card border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">#{order.order_number}</span>
                  {order.customer_name && (
                    <span className="text-xs text-muted-foreground">· {order.customer_name}</span>
                  )}
                </div>
                <Badge className={cn('text-[10px] px-1.5 border', getStatusColor(order.status))}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {order.items.length} items · {formatCurrency(order.total)}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {timeAgo(order.created_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Order #{selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.customer_name && `Customer: ${selectedOrder.customer_name}`}
              {selectedOrder?.customer_phone && ` · ${selectedOrder.customer_phone}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-xs text-yellow-700 dark:text-yellow-400 mb-1">Notes</p>
                  <p className="text-yellow-800 dark:text-yellow-300">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Print Button */}
              <Button variant="outline" className="w-full" onClick={() => manualPrint(selectedOrder)}>
                <Printer className="w-4 h-4 mr-2" /> Print KOT + Bill
              </Button>

              {/* Action buttons */}
              {selectedOrder.status === 'pending' && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => updateStatus(selectedOrder.id, 'accepted')}>
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button variant="destructive" onClick={() => updateStatus(selectedOrder.id, 'cancelled')}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {selectedOrder.status === 'accepted' && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, 'preparing')}>
                  Start Preparing
                </Button>
              )}
              {selectedOrder.status === 'preparing' && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, 'ready')}>
                  Mark Ready
                </Button>
              )}
              {selectedOrder.status === 'ready' && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, 'completed')}>
                  Complete Order
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
