import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { cn } from '@/lib/utils';
import { formatCurrency, Order } from '@/lib/store';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  Eye, 
  Printer
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
  DropdownMenu,
  DropdownMenuContent,
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

type KOTStatus = 'used-in-bill' | 'active' | 'cancelled' | 'not-prepared' | 'preparing';

const KOTListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  
  // View order sheet state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Get KOT orders (orders with kotNumber)
  const kotOrders = orders
    .filter(order => order.kotNumber || order.kotPrinted)
    .map(order => ({
      ...order,
      kotStatus: order.billPrinted ? 'used-in-bill' : 
                 order.status === 'cancelled' ? 'cancelled' :
                 order.status === 'preparing' ? 'preparing' :
                 order.status === 'pending' ? 'not-prepared' : 'active'
    }));

  // Filter by search
  const filteredOrders = kotOrders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      String(order.kotNumber || '').includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.customerPhone?.includes(query)
    );
  });

  // Sort by KOT number descending
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const kotA = Number(a.kotNumber) || 0;
    const kotB = Number(b.kotNumber) || 0;
    return kotB - kotA;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'used-in-bill': return 'text-muted-foreground';
      case 'active': return 'text-success';
      case 'cancelled': return 'text-destructive';
      case 'not-prepared': return 'text-info';
      case 'preparing': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'used-in-bill': return 'Used in Bill';
      case 'active': return 'Active';
      case 'cancelled': return 'Cancelled/Shifted';
      case 'not-prepared': return 'Not Prepared';
      case 'preparing': return 'Preparing';
      default: return status;
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const handlePrint = (order: Order) => {
    const kotContent = generateKOTHTML(order);
    smartPrint(kotContent, () => {
      toast.success(`KOT #${order.kotNumber} printed successfully`);
    });
  };

  // Generate KOT HTML for printing
  const generateKOTHTML = (order: Order): string => {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="text-align:left; padding: 4px 0;">${item.quantity}x ${item.name}</td>
        <td style="text-align:right; padding: 4px 0;">${item.notes || ''}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT #${order.kotNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 14px; width: 80mm; margin: 0; padding: 5mm; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .header h2 { margin: 0; font-size: 20px; font-weight: bold; }
          .info { margin: 10px 0; }
          .info p { margin: 3px 0; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 4px 0; vertical-align: top; }
          .items { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>KOT #${order.kotNumber}</h2>
          <p>${new Date(order.createdAt).toLocaleString('en-IN')}</p>
        </div>
        <div class="info">
          <p><strong>Order Type:</strong> ${order.orderType.toUpperCase()}</p>
          ${order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
          ${order.customerName ? `<p><strong>Customer:</strong> ${order.customerName}</p>` : ''}
          ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
        </div>
        <div class="line"></div>
        <table class="items">
          <tr>
            <td><strong>Item</strong></td>
            <td style="text-align:right;"><strong>Notes</strong></td>
          </tr>
          ${itemsHTML}
        </table>
        <div class="line"></div>
        <p><strong>Total Items:</strong> ${order.items.length}</p>
        <p><strong>Total Qty:</strong> ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
        <div class="footer">
          <p>*** KITCHEN ORDER TICKET ***</p>
        </div>
      </body>
      </html>
    `;
  };

  const calculateDuration = (createdAt: string, billPrinted?: boolean) => {
    if (!billPrinted) return '--';
    const start = new Date(createdAt).getTime();
    const end = Date.now();
    const diff = Math.floor((end - start) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-bold">Kot Listing</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between p-4 border-b border-border">
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
                placeholder="Search by KOT No, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-muted border border-border" />
            <span>Used in Bill</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Cancelled/Shifted</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-info" />
            <span>Not Prepared</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Preparing</span>
          </div>
        </div>
      </div>

      {/* KOT Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KOT No.</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Customer Phone</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>No. of Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Bill Print Date</TableHead>
                <TableHead>Complete Duration</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No KOT orders found
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.kotNumber || '--'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="capitalize">{order.orderType}</span>
                        {order.tableNumber && (
                          <span className="text-muted-foreground"> ({order.tableNumber})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.customerPhone || '-'}</TableCell>
                    <TableCell>{order.customerName || '-'}</TableCell>
                    <TableCell>
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-medium', getStatusStyle(order.kotStatus))}>
                        {getStatusLabel(order.kotStatus)}
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
                      {order.billPrinted ? (
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
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {calculateDuration(String(order.createdAt), order.billPrinted)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-border"
                          onClick={() => handleView(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-border"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View KOT Sidebar Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KOT Details - #{selectedOrder?.kotNumber}</SheetTitle>
          </SheetHeader>
          
          {selectedOrder && (
            <div className="mt-6 space-y-6">
              {/* KOT Info */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KOT Number</span>
                  <span className="font-medium">#{selectedOrder.kotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type</span>
                  <span className="capitalize">{selectedOrder.orderType}</span>
                </div>
                {selectedOrder.tableNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Table</span>
                    <span>{selectedOrder.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn('font-medium', getStatusStyle(
                    selectedOrder.billPrinted ? 'used-in-bill' : 
                    selectedOrder.status === 'cancelled' ? 'cancelled' :
                    selectedOrder.status === 'preparing' ? 'preparing' :
                    selectedOrder.status === 'pending' ? 'not-prepared' : 'active'
                  ))}>
                    {getStatusLabel(
                      selectedOrder.billPrinted ? 'used-in-bill' : 
                      selectedOrder.status === 'cancelled' ? 'cancelled' :
                      selectedOrder.status === 'preparing' ? 'preparing' :
                      selectedOrder.status === 'pending' ? 'not-prepared' : 'active'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Customer Info */}
              {(selectedOrder.customerName || selectedOrder.customerPhone) && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="font-semibold">Customer Details</h4>
                  {selectedOrder.customerName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                  )}
                  {selectedOrder.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="font-semibold">Items ({selectedOrder.items.length})</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">Note: {item.notes}</p>
                        )}
                      </div>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    handlePrint(selectedOrder);
                    setIsViewOpen(false);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print KOT
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default KOTListingPage;
