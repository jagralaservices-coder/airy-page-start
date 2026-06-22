import React from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLocale } from '@/contexts/LocaleContext';
import { Download, ArrowLeft, ShoppingCart, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const OrderSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();
  const { filteredOrders: orders, isLoading } = useAnalytics('all');

  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const formatPaymentMethod = (o: typeof orders[0]) => {
    if (o.paymentMethod === 'part' && o.paymentBreakdown) {
      const parts: string[] = [];
      Object.entries(o.paymentBreakdown).forEach(([method, amount]) => {
        if (amount > 0) {
          parts.push(`${method.toUpperCase()}: ${formatCurrency(amount)}`);
        }
      });
      return parts.length > 0 ? `Part (${parts.join(', ')})` : 'Part';
    }
    return o.paymentMethod || 'Cash';
  };

  const formatPaymentMethodCsv = (o: typeof orders[0]) => {
    if (o.paymentMethod === 'part' && o.paymentBreakdown) {
      const parts: string[] = [];
      Object.entries(o.paymentBreakdown).forEach(([method, amount]) => {
        if (amount > 0) {
          parts.push(`${method.toUpperCase()}: ${amount}`);
        }
      });
      return parts.length > 0 ? `Part (${parts.join('; ')})` : 'Part';
    }
    return o.paymentMethod || 'Cash';
  };

  const handleExport = () => {
    const headers = ['Order ID', 'Date', 'Type', 'Items', 'Amount', 'Status', 'Payment'];
    const rows = orders.map(o => [
      o.id.slice(-6).toUpperCase(),
      new Date(o.createdAt).toLocaleString(),
      o.orderType,
      Array.isArray(o.items) ? o.items.length : 0,
      o.total,
      o.status,
      formatPaymentMethodCsv(o)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    printReport(
      {
        title: 'Order Summary Report',
        subtitle: 'All Orders Overview',
        dateRange: 'All Time',
      },
      [
        {
          title: 'Summary',
          type: 'stats',
          data: [
            { label: 'Total Orders', value: orders.length },
            { label: 'Completed', value: completedOrders.length },
            { label: 'Cancelled', value: cancelledOrders.length },
            { label: 'Total Sales', value: formatReportCurrency(completedOrders.reduce((s, o) => s + o.total, 0)) },
          ],
        },
        {
          title: 'Recent Orders',
          type: 'table',
          data: {
            headers: ['Order ID', 'Date', 'Type', 'Amount', 'Status', 'Payment'],
            rows: orders.slice(0, 30).map(o => [
              o.id.slice(-6).toUpperCase(),
              new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
              o.orderType,
              formatReportCurrency(o.total),
              o.status,
              o.paymentMethod === 'part' && o.paymentBreakdown
                ? `Part (${Object.entries(o.paymentBreakdown)
                    .filter(([_, amt]) => amt > 0)
                    .map(([m, amt]) => `${m.toUpperCase()}: ${formatReportCurrency(amt)}`)
                    .join(', ')})`
                : o.paymentMethod || 'Cash',
            ]),
          },
        },
        ...(cancelledOrders.length > 0 ? [{
          title: 'Cancelled Orders',
          type: 'table' as const,
          data: {
            headers: ['Order ID', 'Date', 'Amount', 'Reason'],
            rows: cancelledOrders.map(o => [
              o.id.slice(-6).toUpperCase(),
              new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short' }),
              formatReportCurrency(o.total),
              'Cancelled',
            ]),
          },
        }] : []),
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success';
      case 'preparing': return 'bg-warning/20 text-warning';
      case 'pending': return 'bg-primary/20 text-primary';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cat-drinks/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-cat-drinks" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Order Summary</h1>
              <p className="text-sm text-muted-foreground">All orders from database</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="pos-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {isLoading ? 'Loading orders from database...' : 'No orders available'}
                </TableCell>
              </TableRow>
            ) : (
              orders.slice().reverse().map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">#{order.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="capitalize">{order.orderType}</TableCell>
                  <TableCell className="text-right">{Array.isArray(order.items) ? order.items.length : 0}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>{formatPaymentMethod(order)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrderSummaryPage;
