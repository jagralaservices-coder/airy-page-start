import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  Eye, 
  Printer, 
  X, 
  LayoutGrid,
  UtensilsCrossed,
  Truck,
  ShoppingBag,
  RefreshCw,
  MoreVertical,
  Clock,
  CheckCircle2,
  ChefHat,
  Bell,
  Calendar,
  CircleCheck,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { smartPrint } from '@/lib/printUtils';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { Order } from '@/lib/store';
import { CancelOrderDialog } from '@/components/pos/CancelOrderDialog';

type OrderTab = 'current' | 'online' | 'advance';
type OrderTypeFilter = 'all' | 'dine-in' | 'delivery' | 'pickup';
type SortOption = 'latest' | 'oldest' | 'amount-high' | 'amount-low';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { orders, cancelOrder, updateOrderPaymentMethod, updateOrderStatus } = usePOS();
  const [activeTab, setActiveTab] = useState<OrderTab>('current');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [mobileStatusFilter, setMobileStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  
  // View order sheet state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Cancel confirmation state
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Filter orders based on tab, type, and search
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (activeTab === 'online' && order.orderType !== 'online') return false;
    if (activeTab === 'advance') return false;
    if (activeTab === 'current' && order.orderType === 'online') return false;

    // Type filter
    if (orderTypeFilter === 'dine-in' && order.orderType !== 'dine-in') return false;
    if (orderTypeFilter === 'delivery' && order.orderType !== 'delivery') return false;
    if (orderTypeFilter === 'pickup' && order.orderType !== 'takeaway') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesId = order.id.toLowerCase().includes(query);
      const matchesBillNo = order.billNumber?.toString().includes(query);
      const matchesCustomer = order.customerName?.toLowerCase().includes(query);
      const matchesPhone = order.customerPhone?.includes(query);
      if (!matchesId && !matchesBillNo && !matchesCustomer && !matchesPhone) return false;
    }

    return true;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'latest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'amount-high':
        return b.total - a.total;
      case 'amount-low':
        return a.total - b.total;
      default:
        return 0;
    }
  });

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const handlePrint = (order: Order) => {
    const billContent = generateBillHTML(order);
    smartPrint(billContent, () => {
      toast.success(`Bill printed for order ${order.billNumber || order.id.slice(-4).toUpperCase()}`);
    });
  };

  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = (reason: string) => {
    if (orderToCancel) {
      cancelOrder(orderToCancel.id, reason);
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  // Generate bill HTML for printing - using centralized template
  const generateBillHTML = (order: Order): string => {
    return generateProfessionalBill({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
      tableNumber: order.tableNumber ? String(order.tableNumber) : undefined,
      paymentMethod: order.paymentMethod || 'cash'
    });
  };

  const tabs = [
    { id: 'current', label: 'Current Order' },
    { id: 'online', label: 'Online Order' },
    { id: 'advance', label: 'Advance Order' },
  ];

  const typeFilters = [
    { id: 'all', label: 'All', icon: LayoutGrid },
    { id: 'dine-in', label: 'Dine In', icon: UtensilsCrossed },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'pickup', label: 'Pick Up', icon: ShoppingBag },
  ];

  // Helper: time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  // Helper: status config for badges
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', badgeClass: 'bg-warning/20 text-warning', borderColor: 'border-l-warning' };
      case 'preparing':
        return { label: 'Preparing', badgeClass: 'bg-info/20 text-info', borderColor: 'border-l-info' };
      case 'ready':
        return { label: 'Ready', badgeClass: 'bg-success/20 text-success', borderColor: 'border-l-success' };
      case 'completed':
        return { label: 'Completed', badgeClass: 'bg-muted text-muted-foreground', borderColor: 'border-l-muted' };
      case 'cancelled':
        return { label: 'Cancelled', badgeClass: 'bg-destructive/20 text-destructive', borderColor: 'border-l-destructive' };
      default:
        return { label: status, badgeClass: 'bg-secondary text-foreground', borderColor: 'border-l-border' };
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      {/* Mobile-first Header */}
      {isMobile ? (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Orders</h1>
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
            </div>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary relative">
              <Bell className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <button className="h-11 w-11 rounded-xl border border-border flex items-center justify-center hover:bg-secondary">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Status Filter Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All', count: orders.length },
              { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
              { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
              { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
              { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setMobileStatusFilter(status.id as any)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all',
                  mobileStatusFilter === status.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                {status.label} ({status.count})
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as OrderTab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'online' && (
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      )}

      {/* Current Order Tab Content */}
      {activeTab === 'current' && (
        <>
          {/* Type Filters */}
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <div className="flex gap-2">
              {typeFilters.map((filter) => {
                const IconComponent = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setOrderTypeFilter(filter.id as OrderTypeFilter)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-6 py-3 rounded-lg border transition-all min-w-[80px]',
                      orderTypeFilter === filter.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-xs font-medium">{filter.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <Button variant="outline" className="text-primary border-primary">
              Get Past Orders
            </Button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-4 p-4 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="p-2">
                  <Input
                    placeholder="Search by order ID, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort By</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Date</SelectItem>
                  <SelectItem value="oldest">Oldest Date</SelectItem>
                  <SelectItem value="amount-high">Amount High</SelectItem>
                  <SelectItem value="amount-low">Amount Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-muted border border-border" />
                <span>Saved Bill</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span>Printed Bill</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>Cancelled Bill</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span>Paid</span>
              </div>
            </div>
          </div>

          {/* Orders Table - Desktop */}
          <div className="flex-1 overflow-auto p-4 hidden md:block">
            {sortedOrders.length > 0 ? (
              <div className="rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order No.</TableHead>
                      <TableHead>Order Type</TableHead>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">My Amount (₹)</TableHead>
                      <TableHead className="text-right">Tax (₹)</TableHead>
                      <TableHead className="text-right">Discount (₹)</TableHead>
                      <TableHead className="text-right">Grand Total (₹)</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrders.map((order) => (
                      <TableRow key={order.id} className={cn(
                        order.status === 'completed' && 'bg-success/5',
                        order.status === 'cancelled' && 'bg-destructive/5'
                      )}>
                        <TableCell>
                          <span className="text-primary font-medium underline cursor-pointer" onClick={() => handleView(order)}>
                            {order.billNumber || order.id.slice(-4).toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="capitalize">{order.orderType}</span>
                            {order.tableNumber && (
                              <span className="text-muted-foreground"> ({order.tableNumber})</span>
                            )}
                            <div className="text-xs text-primary font-medium">
                              ({order.orderType === 'dine-in' ? 'Dine In' : order.orderType})
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{order.customerPhone || '-'}</TableCell>
                        <TableCell>{order.customerName || '-'}</TableCell>
                        <TableCell>{order.paymentMethod || 'Other [UPI]'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(order.subtotal || order.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(order.tax || 0)}</TableCell>
                        <TableCell className="text-right">({formatCurrency(order.discount || 0)})</TableCell>
                        <TableCell className="text-right">
                          <span className="text-primary font-medium underline cursor-pointer" onClick={() => handleView(order)}>
                            {formatCurrency(order.total)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                            <br />
                            <span className="text-muted-foreground">
                              {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {/* View Button */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-full border-border"
                              onClick={() => handleView(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Print Button */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-full border-border"
                              onClick={() => handlePrint(order)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {/* Cancel Button */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleCancelClick(order)}
                              disabled={order.status === 'cancelled'}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="w-24 h-24 mb-4 bg-muted rounded-lg flex items-center justify-center">
                  <X className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <p>There are no orders available.</p>
              </div>
            )}
          </div>

          {/* Orders Cards - Mobile - Reference Design */}
          <div className="flex-1 overflow-auto p-3 md:hidden">
            {(() => {
              const mobileOrders = sortedOrders.filter(o => mobileStatusFilter === 'all' || o.status === mobileStatusFilter);
              return mobileOrders.length > 0 ? (
              <div className="space-y-3">
                {mobileOrders.map((order) => {
                  const timeAgo = getTimeAgo(new Date(order.createdAt));
                  const statusConfig = getStatusConfig(order.status);
                  
                  return (
                    <div 
                      key={order.id} 
                      className={cn(
                        "bg-card rounded-2xl border border-border p-4 transition-all",
                        statusConfig.borderColor
                      )}
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ORDER</span>
                            <span className="font-bold text-sm text-foreground">
                              #ORD-{order.billNumber || order.id.slice(-4).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-foreground leading-tight">
                            {order.customerName || 'Walk-in Customer'}
                          </h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={cn(
                            "inline-block px-2.5 py-1 rounded-lg text-xs font-bold",
                            statusConfig.badgeClass
                          )}>
                            {statusConfig.label}
                          </span>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <p className="text-sm text-foreground mb-1.5 leading-relaxed">
                        {order.items.map((item, idx) => (
                          <span key={idx}>
                            <strong>{item.quantity}x</strong> {item.name}
                            {idx < order.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </p>

                      {/* Order Meta */}
                      <p className="text-xs text-muted-foreground mb-3">
                        {order.orderType === 'dine-in' ? 'Dine-in' : order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                        {order.tableNumber && ` • Table ${order.tableNumber}`}
                        {' • '}
                        {order.paymentMethod ? `Paid via ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}` : 'Unpaid'}
                      </p>

                      {/* Action Buttons based on status */}
                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (updateOrderStatus) updateOrderStatus(order.id, 'preparing');
                              toast.success(`Order accepted`);
                            }}
                            className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Accept Order
                          </button>
                          <button
                            onClick={() => handleCancelClick(order)}
                            className="w-12 rounded-xl border border-border flex items-center justify-center hover:bg-destructive/10"
                          >
                            <X className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      )}

                      {order.status === 'preparing' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePrint(order)}
                            className="flex-1 bg-secondary text-foreground py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform border border-border"
                          >
                            <Printer className="w-4 h-4" />
                            Print KOT
                          </button>
                          <button
                            onClick={() => {
                              if (updateOrderStatus) updateOrderStatus(order.id, 'ready');
                              toast.success(`Order marked ready`);
                            }}
                            className="flex-1 bg-success text-success-foreground py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Ready
                          </button>
                        </div>
                      )}

                      {order.status === 'ready' && (
                        <button
                          onClick={() => {
                            if (updateOrderStatus) updateOrderStatus(order.id, 'completed');
                            toast.success(`Order completed`);
                          }}
                          className="w-full bg-success text-success-foreground py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                          <CircleCheck className="w-4 h-4" />
                          Complete Order
                        </button>
                      )}
                    </div>
                  );
                })}
                
                {/* End of list */}
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-2">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <span className="text-xs">End of list</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <div className="w-20 h-20 mb-4 bg-muted rounded-lg flex items-center justify-center">
                  <X className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p>No orders available</p>
              </div>
            );
            })()}
          </div>
        </>
      )}

      {/* Online Order Tab Content */}
      {activeTab === 'online' && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
          <div className="w-32 h-32 mb-4 flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 bg-muted rounded-lg" />
              <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-muted-foreground/30 rounded-lg" />
            </div>
          </div>
          <p className="text-center max-w-md">
            Integrating with multiple online order integrators and manage them seamlessly.
            <br />
            That's how 95% of the users optimise on their operations related efforts.
          </p>
        </div>
      )}

      {/* Advance Order Tab Content */}
      {activeTab === 'advance' && (
        <>
          {/* Time Filters */}
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <div className="flex gap-2">
              <button className="flex flex-col items-center gap-1 px-6 py-3 rounded-lg border border-primary bg-primary/10 text-primary min-w-[80px]">
                <LayoutGrid className="h-5 w-5" />
                <span className="text-xs font-medium">All</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-6 py-3 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/50 min-w-[80px]">
                <span className="text-lg font-bold">📅</span>
                <span className="text-xs font-medium">Today</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-6 py-3 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/50 min-w-[80px]">
                <span className="text-xs">Within</span>
                <span className="text-xs font-bold text-primary">1 Day</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-6 py-3 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/50 min-w-[80px]">
                <span className="text-xs">Within</span>
                <span className="text-xs font-bold text-primary">2 Day(s)</span>
              </button>
            </div>
            <div className="flex-1" />
            <Button variant="outline" className="text-primary border-primary">
              Get Past Advance Orders
            </Button>
            <Button variant="outline" className="text-primary border-primary">
              Cumulative Items
            </Button>
          </div>

          {/* Empty State for Advance Orders */}
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-24 h-24 mb-4 bg-muted rounded-lg flex items-center justify-center">
              <X className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <p>There are no advance orders available.</p>
          </div>
        </>
      )}

      {/* Order View Sheet/Sidebar */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">
              Order Details #{selectedOrder?.billNumber || selectedOrder?.id.slice(-4).toUpperCase()}
            </SheetTitle>
          </SheetHeader>
          
          {selectedOrder && (
            <div className="mt-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className={cn(
                    'font-medium capitalize',
                    selectedOrder.status === 'completed' && 'text-success',
                    selectedOrder.status === 'cancelled' && 'text-destructive',
                    selectedOrder.status === 'pending' && 'text-warning'
                  )}>
                    {selectedOrder.status}
                  </p>
                </div>
                {selectedOrder.tableNumber && (
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-medium">{selectedOrder.tableNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedOrder.paymentMethod || 'cash'}
                      onValueChange={(value: Order['paymentMethod']) => {
                        updateOrderPaymentMethod(selectedOrder.id, value);
                        setSelectedOrder({ ...selectedOrder, paymentMethod: value });
                      }}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-sm font-medium capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="split">Split</SelectItem>
                        <SelectItem value="part">Part</SelectItem>
                        <SelectItem value="due">Due</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              {(selectedOrder.customerName || selectedOrder.customerPhone) && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-2">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedOrder.customerName && (
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedOrder.customerName}</p>
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedOrder.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selectedOrder.tax || 0)}</span>
                </div>
                {selectedOrder.discount && selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    handlePrint(selectedOrder);
                    setIsViewOpen(false);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Bill
                </Button>
                {selectedOrder.status !== 'cancelled' && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setIsViewOpen(false);
                      handleCancelClick(selectedOrder);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel Order Dialog with Password Verification */}
      <CancelOrderDialog
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false);
          setOrderToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        orderNumber={orderToCancel?.billNumber || orderToCancel?.id.slice(-4).toUpperCase() || ''}
      />
    </div>
  );
};

export default OrdersPage;
