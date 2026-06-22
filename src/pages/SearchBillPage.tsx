import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Receipt, Phone, User, Printer, FileText } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscription } from '@/hooks/useSubscription';
import { directPrint } from '@/lib/printUtils';
import { generateProfessionalBill, generateKOTContent } from '@/lib/billTemplate';
import { sendBillViaWhatsApp, sendBillViaEmail } from '@/lib/billShareUtils';

const SearchBillPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { orders } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'bill' | 'customer' | 'kot'>(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'kot' || type === 'customer' || type === 'bill') {
      return type;
    }
    return 'bill';
  });
  const { canAccess } = useSubscription();
  const showKot = canAccess('kot');

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    switch (searchType) {
      case 'bill':
        return (
          order.id.toLowerCase().includes(query) ||
          order.billNumber?.toLowerCase().includes(query)
        );
      case 'customer':
        return (
          order.customerName?.toLowerCase().includes(query) ||
          order.customerPhone?.includes(query)
        );
      case 'kot':
        return (
          order.id.toLowerCase().includes(query) ||
          order.kotNumber?.toLowerCase().includes(query)
        );
      default:
        return true;
    }
  });

  const handlePrint = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    if (searchType === 'kot') {
      const kotNo = order.kotNumber || orderId.slice(-6).toUpperCase();
      const kotContent = generateKOTContent({
        ...order,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt || new Date().toISOString()),
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        total: order.total || 0,
        paymentMethod: order.paymentMethod || 'cash'
      } as any);
      directPrint(kotContent, () => {
        toast.success(`Printing KOT #${kotNo}`);
      });
    } else {
      const billNo = order.billNumber || orderId.slice(-6).toUpperCase();
      const billContent = generateProfessionalBill({
        ...order,
        paymentMethod: order.paymentMethod || 'cash',
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        customerAddress: order.customerAddress,
      } as any);
      
      directPrint(billContent, () => {
        toast.success(`Printing bill #${billNo}`);
      });
    }
  };

  const handleEBill = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const billNo = order.billNumber || orderId.slice(-6).toUpperCase();
    if (order.customerPhone) {
      sendBillViaWhatsApp({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        billNumber: billNo,
        total: order.total,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
      });
    } else if (order.customerEmail) {
      sendBillViaEmail({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        billNumber: billNo,
        total: order.total,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
      });
    } else {
      toast.error('No phone or email configured for this customer');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Page Header with Back Button */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Search Orders</h1>
      </div>

      {/* Search Type Tabs */}
      <div className="p-4 bg-card border-b border-border space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSearchType('bill')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
              searchType === 'bill' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
            )}
          >
            <Receipt className="w-5 h-5" />
            Bill No
          </button>
          <button
            onClick={() => setSearchType('customer')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
              searchType === 'customer' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
            )}
          >
            <User className="w-5 h-5" />
            Customer
          </button>
          {showKot && (
            <button
              onClick={() => setSearchType('kot')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
                searchType === 'kot' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
              )}
            >
              <FileText className="w-5 h-5" />
              KOT
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={
              searchType === 'bill' ? 'Search by bill number...' :
              searchType === 'customer' ? 'Search by name or phone...' :
              'Search by KOT number...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-lg text-foreground">
                      {searchType === 'kot' 
                        ? `KOT #${order.kotNumber || order.id.slice(-6).toUpperCase()}`
                        : `#${order.billNumber || order.id.slice(-6).toUpperCase()}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{formatCurrency(order.total)}</p>
                    <span className={cn(
                      'text-xs px-3 py-1 rounded-full',
                      order.status === 'completed' ? 'bg-success/20 text-success' :
                      order.status === 'pending' ? 'bg-warning/20 text-warning' :
                      'bg-primary/20 text-primary'
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                {(order.customerName || order.customerPhone) && (
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    {order.customerName && (
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {order.customerName}
                      </span>
                    )}
                    {order.customerPhone && (
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {order.customerPhone}
                      </span>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="text-sm text-muted-foreground mb-4 p-3 bg-secondary/50 rounded-xl">
                  {order.items.map(item => item.name).join(', ')}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handlePrint(order.id)}
                    className="flex-1 h-12 text-base"
                  >
                    {searchType === 'kot' ? (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        Print KOT
                      </>
                    ) : (
                      <>
                        <Printer className="w-5 h-5 mr-2" />
                        Print
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleEBill(order.id)}
                    className="flex-1 h-12 text-base"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    E-Bill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBillPage;
