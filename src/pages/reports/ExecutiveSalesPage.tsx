import React from 'react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { Download, ArrowLeft, Briefcase, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { printReport, formatReportCurrency } from '@/lib/reportPrintUtils';

const ExecutiveSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, todayStats } = usePOS();

  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const dineInSales = orders.filter(o => o.orderType === 'dine-in').reduce((s, o) => s + o.total, 0);
  const takeawaySales = orders.filter(o => o.orderType === 'takeaway').reduce((s, o) => s + o.total, 0);
  const deliverySales = orders.filter(o => o.orderType === 'delivery').reduce((s, o) => s + o.total, 0);

  const handleExport = () => {
    const data = [
      ['Executive Sales Summary Report'],
      [''],
      ['Metric', 'Value'],
      ['Total Sales', todayStats.totalSales],
      ['Total Orders', todayStats.orderCount],
      ['Average Order Value', todayStats.avgOrderValue],
      [''],
      ['Order Status Breakdown'],
      ['Completed', completedOrders.length],
      ['Pending/Preparing', pendingOrders.length],
      ['Cancelled', cancelledOrders.length],
      [''],
      ['Sales by Order Type'],
      ['Dine-In', dineInSales],
      ['Takeaway', takeawaySales],
      ['Delivery', deliverySales],
    ];
    const csv = data.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'executive-sales-summary.csv';
    a.click();
  };

  const handlePrint = () => {
    printReport(
      { title: 'Executive Sales Summary', subtitle: 'High-level business overview', dateRange: 'Today', generatedAt: new Date() },
      [
        { type: 'stats', data: [
          { label: 'Total Revenue', value: formatReportCurrency(todayStats.totalSales) },
          { label: 'Total Orders', value: todayStats.orderCount },
          { label: 'Avg Order Value', value: formatReportCurrency(todayStats.avgOrderValue) },
        ]},
        { title: 'Order Status', type: 'list', data: [
          { label: 'Completed', value: completedOrders.length },
          { label: 'Pending/Preparing', value: pendingOrders.length },
          { label: 'Cancelled', value: cancelledOrders.length },
        ]},
        { title: 'Sales by Order Type', type: 'list', data: [
          { label: 'Dine-In', value: formatReportCurrency(dineInSales) },
          { label: 'Takeaway', value: formatReportCurrency(takeawaySales) },
          { label: 'Delivery', value: formatReportCurrency(deliverySales) },
        ]}
      ]
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Executive Sales Summary</h1>
              <p className="text-sm text-muted-foreground">High-level business overview</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">Total Revenue</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground mt-1 truncate" title={formatCurrency(todayStats.totalSales)}>{formatCurrency(todayStats.totalSales)}</p>
        </div>
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">Total Orders</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground mt-1 truncate" title={String(todayStats.orderCount)}>{todayStats.orderCount}</p>
        </div>
        <div className="pos-card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-muted-foreground truncate">Avg Order Value</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground mt-1 truncate" title={formatCurrency(todayStats.avgOrderValue)}>{formatCurrency(todayStats.avgOrderValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="pos-card p-5">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <span className="text-success font-medium">Completed</span>
              <span className="text-success font-bold">{completedOrders.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
              <span className="text-warning font-medium">Pending/Preparing</span>
              <span className="text-warning font-bold">{pendingOrders.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
              <span className="text-destructive font-medium">Cancelled</span>
              <span className="text-destructive font-bold">{cancelledOrders.length}</span>
            </div>
          </div>
        </div>

        <div className="pos-card p-5">
          <h3 className="text-lg font-semibold mb-4">Sales by Order Type</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-foreground font-medium">Dine-In</span>
              <span className="text-primary font-bold">{formatCurrency(dineInSales)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <span className="text-foreground font-medium">Takeaway</span>
              <span className="text-success font-bold">{formatCurrency(takeawaySales)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
              <span className="text-foreground font-medium">Delivery</span>
              <span className="text-warning font-bold">{formatCurrency(deliverySales)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSalesPage;