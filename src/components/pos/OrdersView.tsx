import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, ChefHat, Printer, Package } from 'lucide-react';
import { toast } from 'sonner';

export const OrdersView: React.FC = () => {
  const { orders, printKOT } = usePOS();
  const { t, formatCurrency } = useLocale();
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed'>('all');

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; dot: string }> = {
    pending: { bg: 'bg-primary/10 border-primary/20', text: 'text-primary', icon: <Clock className="w-4 h-4" />, dot: 'bg-primary' },
    preparing: { bg: 'bg-warning/10 border-warning/20', text: 'text-warning', icon: <ChefHat className="w-4 h-4" />, dot: 'bg-warning' },
    ready: { bg: 'bg-success/10 border-success/20', text: 'text-success', icon: <CheckCircle className="w-4 h-4" />, dot: 'bg-success' },
    completed: { bg: 'bg-muted border-border', text: 'text-muted-foreground', icon: <CheckCircle className="w-4 h-4" />, dot: 'bg-muted-foreground' },
    cancelled: { bg: 'bg-destructive/10 border-destructive/20', text: 'text-destructive', icon: <XCircle className="w-4 h-4" />, dot: 'bg-destructive' }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'all': return t('common.all');
      case 'pending': return t('orders.pending');
      case 'preparing': return t('orders.preparing');
      case 'ready': return t('orders.ready');
      case 'completed': return t('orders.completed');
      default: return status;
    }
  };

  const filterCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('nav.orders')}</h1>
            <p className="text-xs text-muted-foreground">{orders.length} {t('orders.activeOrders')}</p>
          </div>
          <Package className="w-5 h-5 text-primary" />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'pending', 'preparing', 'ready', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5',
                filter === status ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              )}
            >
              {status !== 'all' && <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig[status]?.dot)} />}
              {getStatusLabel(status)}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', filter === status ? 'bg-primary-foreground/20' : 'bg-secondary')}>
                {filterCounts[status]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            return (
              <div key={order.id} className={cn('rounded-2xl border overflow-hidden', config.bg)}>
                {/* Order Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-base">#{order.id.slice(-6).toUpperCase()}</span>
                      {order.tableNumber && (
                        <span className="text-[10px] px-2 py-0.5 bg-secondary rounded-full font-medium">
                          T{order.tableNumber}
                        </span>
                      )}
                    </div>
                    <div className={cn('flex items-center gap-1 text-xs font-bold', config.text)}>
                      {config.icon}
                      <span className="uppercase tracking-wider text-[10px]">{getStatusLabel(order.status)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.orderType} • {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                {/* Items */}
                <div className="px-4 pb-3">
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}× {item.name}</span>
                        <span className="text-muted-foreground font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t('common.total')}</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <div className="px-4 pb-4 flex gap-2">
                    {!order.kotPrinted && (
                      <button onClick={() => { printKOT(order); toast.success(t('msg.orderPlaced')); }} className="flex-1 py-2 rounded-xl bg-warning/20 text-warning text-xs font-bold flex items-center justify-center gap-1.5">
                        <Printer className="w-3.5 h-3.5" /> {t('pos.printKOT')}
                      </button>
                    )}
                    <button className="flex-1 py-2 rounded-xl bg-success/20 text-success text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> {t('orders.ready')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-muted-foreground text-sm">{t('orders.noOrders')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
