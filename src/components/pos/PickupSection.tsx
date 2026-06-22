import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  ShoppingBag,
  Clock,
  User,
  Phone,
  CheckCircle,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export const PickupSection: React.FC = () => {
  const { orders } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready'>('all');

  // Filter pickup/takeaway orders
  const pickupOrders = orders.filter(o => o.orderType === 'takeaway');
  
  const filteredOrders = pickupOrders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone?.includes(searchQuery);
    
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && (order.status === 'pending' || order.status === 'preparing')) ||
      (filter === 'ready' && order.status === 'ready');
    
    return matchesSearch && matchesFilter;
  });

  const pendingCount = pickupOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
  const readyCount = pickupOrders.filter(o => o.status === 'ready').length;

  const handleNotifyCustomer = (orderId: string) => {
    toast.success('Customer notified - Pickup ready!');
  };

  const handleMarkPickedUp = (orderId: string) => {
    toast.success('Order marked as picked up');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pickup Orders</h1>
          <p className="text-muted-foreground">Manage takeaway and pickup orders</p>
        </div>
        <button className="pos-btn-primary px-4 py-2 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Pickup
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pos-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20 text-primary">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pickups</p>
              <p className="text-2xl font-bold text-foreground">{pickupOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="pos-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/20 text-warning">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="pos-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/20 text-success">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ready</p>
              <p className="text-2xl font-bold text-foreground">{readyCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 pos-input"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'ready'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-muted'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="pos-card p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No pickup orders</p>
          <p className="text-sm text-muted-foreground">Pickup orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="pos-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-lg">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                    {order.status === 'ready' && (
                      <span className="animate-pulse">
                        <Bell className="w-4 h-4 text-success" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  order.status === 'ready' ? 'bg-success/20 text-success' :
                  order.status === 'preparing' ? 'bg-warning/20 text-warning' :
                  'bg-primary/20 text-primary'
                )}>
                  {order.status}
                </span>
              </div>

              {/* Customer Info */}
              {(order.customerName || order.customerPhone) && (
                <div className="mb-3 p-2 bg-secondary rounded-lg">
                  {order.customerName && (
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {order.customerName}
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {order.customerPhone}
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-1">{order.items.length} items</p>
                <div className="text-sm text-foreground">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <span key={item.id}>
                      {item.name} x{item.quantity}
                      {idx < Math.min(order.items.length - 1, 2) && ', '}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-muted-foreground"> +{order.items.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mb-4 pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {order.status === 'ready' ? (
                  <>
                    <button
                      onClick={() => handleNotifyCustomer(order.id)}
                      className="flex-1 pos-btn-warning py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Notify
                    </button>
                    <button
                      onClick={() => handleMarkPickedUp(order.id)}
                      className="flex-1 pos-btn-success py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Picked Up
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => toast.info('Preparing order...')}
                    className="w-full pos-btn-primary py-2 text-sm"
                  >
                    {order.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
