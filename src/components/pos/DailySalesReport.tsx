import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLocale } from '@/contexts/LocaleContext';
import { getPaymentBreakdownSummary } from '@/lib/paymentBreakdown';
import { smartPrint } from '@/lib/printUtils';
import { X, Printer, Calendar, TrendingUp, CreditCard, Banknote, Smartphone, DollarSign, Globe, ShoppingBag, UtensilsCrossed, Truck, Loader2, QrCode, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DailySalesReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailySalesReport: React.FC<DailySalesReportProps> = ({ isOpen, onClose }) => {
  const { formatCurrency } = useLocale();
  const { filteredOrders: allOrders, isLoading } = useAnalytics('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedDateOrders = allOrders.filter(order => {
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    return orderDate === selectedDate && order.status === 'completed';
  });

  const selectedDateCancelledOrders = allOrders.filter(order => {
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    return orderDate === selectedDate && order.status === 'cancelled';
  });

  // Calculate totals
  const totalSales = selectedDateOrders.reduce((sum, order) => sum + order.total, 0);
  const totalTax = selectedDateOrders.reduce((sum, order) => sum + order.tax, 0);
  const totalDiscount = selectedDateOrders.reduce((sum, order) => sum + order.discount, 0);
  const netSales = totalSales - totalTax;

  // Payment method breakdown with order counts
  // Dynamic payment method breakdown with order counts
  const paymentBreakdown = {
    cash: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 },
    upi: { amount: 0, count: 0 },
    credit: { amount: 0, count: 0 },
    qr: { amount: 0, count: 0 },
    cancelled: { 
      amount: selectedDateCancelledOrders.reduce((sum, order) => sum + order.total, 0), 
      count: selectedDateCancelledOrders.length 
    },
  };

  selectedDateOrders.forEach(order => {
    const method = String(order.paymentMethod || '').toLowerCase().trim();
    if (method === 'qr') {
      paymentBreakdown.qr.amount += order.total;
      paymentBreakdown.qr.count += 1;
    } else {
      const breakdown = getPaymentBreakdownSummary(order);
      paymentBreakdown.cash.amount += breakdown.amounts.cash;
      paymentBreakdown.card.amount += breakdown.amounts.card;
      paymentBreakdown.upi.amount += breakdown.amounts.upi;
      paymentBreakdown.credit.amount += breakdown.amounts.credit;
      paymentBreakdown.cash.count += breakdown.counts.cash;
      paymentBreakdown.card.count += breakdown.counts.card;
      paymentBreakdown.upi.count += breakdown.counts.upi;
      paymentBreakdown.credit.count += breakdown.counts.credit;
    }
  });

  // Order type breakdown with amounts
  const orderTypeBreakdown = {
    'dine-in': {
      count: selectedDateOrders.filter(o => o.orderType === 'dine-in').length,
      amount: selectedDateOrders.filter(o => o.orderType === 'dine-in').reduce((sum, o) => sum + o.total, 0)
    },
    'takeaway': {
      count: selectedDateOrders.filter(o => o.orderType === 'takeaway').length,
      amount: selectedDateOrders.filter(o => o.orderType === 'takeaway').reduce((sum, o) => sum + o.total, 0)
    },
    'delivery': {
      count: selectedDateOrders.filter(o => o.orderType === 'delivery').length,
      amount: selectedDateOrders.filter(o => o.orderType === 'delivery').reduce((sum, o) => sum + o.total, 0)
    },
    'online': {
      count: selectedDateOrders.filter(o => o.orderType === 'online').length,
      amount: selectedDateOrders.filter(o => o.orderType === 'online').reduce((sum, o) => sum + o.total, 0)
    },
  };

  // Popular items
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  selectedDateOrders.forEach(order => {
    if (!Array.isArray(order.items)) return;
    order.items.forEach((item: any) => {
      const key = item.id || item.name;
      if (!itemCounts[key]) {
        itemCounts[key] = { name: item.name || 'Unknown', count: 0, revenue: 0 };
      }
      itemCounts[key].count += (item.quantity || 1);
      itemCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const popularItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const handlePrint = () => {
    const storeDetails = JSON.parse(localStorage.getItem('pos_store_details') || '{}');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; font-size: 11px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .store-name { font-size: 16px; font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; margin: 10px 0; text-align: center; background: #000; color: #fff; padding: 5px; }
          .date { text-align: center; margin-bottom: 15px; }
          .section { margin: 12px 0; padding: 8px 0; border-bottom: 1px dashed #000; }
          .section-title { font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .row-detail { display: flex; justify-content: space-between; margin: 3px 0; padding-left: 10px; font-size: 10px; }
          .total-row { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          .highlight { background: #f0f0f0; padding: 5px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeDetails.name || 'MAXORA'}</div>
          ${storeDetails.address ? `<div>${storeDetails.address}</div>` : ''}
          ${storeDetails.phone ? `<div>Tel: ${storeDetails.phone}</div>` : ''}
          ${storeDetails.gst ? `<div>GST: ${storeDetails.gst}</div>` : ''}
        </div>
        
        <div class="title">DAILY SALES REPORT</div>
        <div class="date">${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        
        <div class="section">
          <div class="section-title">SALES SUMMARY</div>
          <div class="row"><span>Total Orders:</span><span>${selectedDateOrders.length}</span></div>
          <div class="row"><span>Gross Sales:</span><span>₹${totalSales.toFixed(2)}</span></div>
          <div class="row"><span>Tax Collected (GST):</span><span>₹${totalTax.toFixed(2)}</span></div>
          <div class="row"><span>Discounts Given:</span><span>-₹${totalDiscount.toFixed(2)}</span></div>
          <div class="row total-row"><span>NET SALES:</span><span>₹${netSales.toFixed(2)}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">PAYMENT METHODS</div>
          <div class="highlight">
            <div class="row"><span>💵 Cash Sales:</span><span>₹${paymentBreakdown.cash.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.cash.count})</span></div>
          </div>
          <div class="highlight">
            <div class="row"><span>💳 Card Sales:</span><span>₹${paymentBreakdown.card.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.card.count})</span></div>
          </div>
          <div class="highlight">
            <div class="row"><span>📱 UPI Sales:</span><span>₹${paymentBreakdown.upi.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.upi.count})</span></div>
          </div>
          <div class="highlight">
            <div class="row"><span>🌀 QR Orders:</span><span>₹${paymentBreakdown.qr.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.qr.count})</span></div>
          </div>
          <div class="highlight">
            <div class="row"><span>⏳ Credit Sales:</span><span>₹${paymentBreakdown.credit.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.credit.count})</span></div>
          </div>
          <div class="highlight" style="color: #dc2626;">
            <div class="row"><span>❌ Cancelled:</span><span>₹${paymentBreakdown.cancelled.amount.toFixed(2)}</span></div>
            <div class="row-detail"><span>(Qty: ${paymentBreakdown.cancelled.count})</span></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">ORDER TYPES</div>
          <div class="row"><span>🍽️ Dine-In:</span><span>${orderTypeBreakdown['dine-in'].count} orders - ₹${orderTypeBreakdown['dine-in'].amount.toFixed(2)}</span></div>
          <div class="row"><span>🛍️ Takeaway:</span><span>${orderTypeBreakdown['takeaway'].count} orders - ₹${orderTypeBreakdown['takeaway'].amount.toFixed(2)}</span></div>
          <div class="row"><span>🚚 Delivery:</span><span>${orderTypeBreakdown['delivery'].count} orders - ₹${orderTypeBreakdown['delivery'].amount.toFixed(2)}</span></div>
          <div class="row"><span>🌐 Online:</span><span>${orderTypeBreakdown['online'].count} orders - ₹${orderTypeBreakdown['online'].amount.toFixed(2)}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">TOP SELLING ITEMS</div>
          ${popularItems.map((item, i) => `
            <div class="row"><span>${i + 1}. ${item.name}</span><span>${item.count} pcs - ₹${item.revenue.toFixed(2)}</span></div>
          `).join('')}
          ${popularItems.length === 0 ? '<div style="text-align:center;">No items sold</div>' : ''}
        </div>
        
        <div class="footer">
          <div>━━━━━━━━━━━━━━━━━━━━━━</div>
          <div style="margin: 5px 0;">Report Generated: ${new Date().toLocaleString('en-IN')}</div>
          <div>Powered by MAXORA</div>
        </div>
      </body>
      </html>
    `;

    smartPrint(printContent, () => {
      toast.success('Report printed successfully');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card rounded-xl p-6 w-[600px] shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Daily Sales Report</h2>
              <p className="text-sm text-muted-foreground">End-of-day summary (from database)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pos-input w-48"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalSales)}</p>
            <p className="text-xs text-muted-foreground">{selectedDateOrders.length} orders</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Net Sales</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(netSales)}</p>
            <p className="text-xs text-muted-foreground">After tax deduction</p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Payment Methods</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <Banknote className="w-5 h-5 mx-auto mb-1.5 text-success" />
              <p className="text-[10px] text-muted-foreground">Cash</p>
              <p className="font-bold text-sm">{formatCurrency(paymentBreakdown.cash.amount)}</p>
              <p className="text-[10px] text-muted-foreground">Qty: {paymentBreakdown.cash.count}</p>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <CreditCard className="w-5 h-5 mx-auto mb-1.5 text-primary" />
              <p className="text-[10px] text-muted-foreground">Card</p>
              <p className="font-bold text-sm">{formatCurrency(paymentBreakdown.card.amount)}</p>
              <p className="text-[10px] text-muted-foreground">Qty: {paymentBreakdown.card.count}</p>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <Smartphone className="w-5 h-5 mx-auto mb-1.5 text-purple-500" />
              <p className="text-[10px] text-muted-foreground">UPI</p>
              <p className="font-bold text-sm">{formatCurrency(paymentBreakdown.upi.amount)}</p>
              <p className="text-[10px] text-muted-foreground">Qty: {paymentBreakdown.upi.count}</p>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <QrCode className="w-5 h-5 mx-auto mb-1.5 text-orange-500" />
              <p className="text-[10px] text-muted-foreground">QR Order</p>
              <p className="font-bold text-sm">{formatCurrency(paymentBreakdown.qr.amount)}</p>
              <p className="text-[10px] text-muted-foreground">Qty: {paymentBreakdown.qr.count}</p>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1.5 text-indigo-500" />
              <p className="text-[10px] text-muted-foreground">Credit</p>
              <p className="font-bold text-sm">{formatCurrency(paymentBreakdown.credit.amount)}</p>
              <p className="text-[10px] text-muted-foreground">Qty: {paymentBreakdown.credit.count}</p>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 text-center">
              <XCircle className="w-5 h-5 mx-auto mb-1.5 text-destructive" />
              <p className="text-[10px] text-destructive">Cancelled</p>
              <p className="font-bold text-sm text-destructive">{formatCurrency(paymentBreakdown.cancelled.amount)}</p>
              <p className="text-[10px] text-destructive/80">Qty: {paymentBreakdown.cancelled.count}</p>
            </div>
          </div>
        </div>

        {/* Order Types */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Order Types</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <UtensilsCrossed className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-xs text-muted-foreground">Dine-In</p>
              <p className="font-semibold">{formatCurrency(orderTypeBreakdown['dine-in'].amount)}</p>
              <p className="text-xs text-muted-foreground">{orderTypeBreakdown['dine-in'].count} orders</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-xs text-muted-foreground">Takeaway</p>
              <p className="font-semibold">{formatCurrency(orderTypeBreakdown['takeaway'].amount)}</p>
              <p className="text-xs text-muted-foreground">{orderTypeBreakdown['takeaway'].count} orders</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <Truck className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="font-semibold">{formatCurrency(orderTypeBreakdown['delivery'].amount)}</p>
              <p className="text-xs text-muted-foreground">{orderTypeBreakdown['delivery'].count} orders</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <Globe className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="font-semibold">{formatCurrency(orderTypeBreakdown['online'].amount)}</p>
              <p className="text-xs text-muted-foreground">{orderTypeBreakdown['online'].count} orders</p>
            </div>
          </div>
        </div>

        {/* Popular Items */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Top Selling Items</h3>
          {popularItems.length > 0 ? (
            <div className="space-y-2">
              {popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{item.count} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No sales data for this date</p>
          )}
        </div>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="w-full pos-btn-primary py-3 flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Report
        </button>
      </div>
    </div>
  );
};
