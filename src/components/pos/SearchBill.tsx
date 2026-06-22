import React, { useState } from 'react';
import { Search, X, Receipt, Phone, User, Printer, FileText } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SearchBillProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchBill: React.FC<SearchBillProps> = ({ isOpen, onClose }) => {
  const { orders } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'bill' | 'customer' | 'kot'>('bill');

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    switch (searchType) {
      case 'bill':
        return order.id.toLowerCase().includes(query);
      case 'customer':
        return (
          order.customerName?.toLowerCase().includes(query) ||
          order.customerPhone?.includes(query)
        );
      case 'kot':
        return order.id.toLowerCase().includes(query) && order.kotPrinted;
      default:
        return true;
    }
  });

  const handlePrint = (orderId: string) => {
    toast.success(`Printing bill #${orderId.slice(-6).toUpperCase()}`);
  };

  const handleEBill = (orderId: string) => {
    toast.success('E-Bill sent successfully');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Search Orders</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Type Tabs */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchType('bill')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                searchType === 'bill' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
              )}
            >
              <Receipt className="w-4 h-4" />
              Bill No
            </button>
            <button
              onClick={() => setSearchType('customer')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                searchType === 'customer' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
              )}
            >
              <User className="w-4 h-4" />
              Customer
            </button>
            <button
              onClick={() => setSearchType('kot')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                searchType === 'kot' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
              )}
            >
              <FileText className="w-4 h-4" />
              KOT
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                searchType === 'bill' ? 'Search by bill number...' :
                searchType === 'customer' ? 'Search by name or phone...' :
                'Search by KOT number...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 pos-input"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-4 overflow-y-auto max-h-96">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div key={order.id} className="pos-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">
                        #{order.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
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
                    <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                      {order.customerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.customerName}
                        </span>
                      )}
                      {order.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {order.customerPhone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="text-sm text-muted-foreground mb-3">
                    {order.items.map(item => item.name).join(', ')}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrint(order.id)}
                      className="flex-1 pos-btn-primary py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button
                      onClick={() => handleEBill(order.id)}
                      className="flex-1 pos-btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      E-Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
