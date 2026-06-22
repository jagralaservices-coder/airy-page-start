import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Clock,
  ShoppingCart, Percent, AlertTriangle, FileText, Building,
  IndianRupee, Activity, Truck, Target, ChefHat, BarChart3,
  Repeat, Package
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8884d8', '#82ca9d', '#ffc658'];
const formatCurrency = (val: number) => `₹${val?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}`;

const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; trend?: number;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ReportLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const EmptyReport = ({ message = "No data available for this period" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

// ──── Item Performance ────
export const ItemPerformanceReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const items = Array.isArray(data.items) ? data.items : [];
  const top10 = items.slice(0, 10);
  const slow10 = [...items].reverse().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard title="Total Revenue" value={formatCurrency(data.total_revenue)} icon={IndianRupee} />
        <MetricCard title="Unique Items Sold" value={(data.total_items || 0).toString()} icon={Package} />
        <MetricCard title="Top Item" value={top10[0]?.name || 'N/A'} subtitle={top10[0] ? formatCurrency(top10[0].revenue) : ''} icon={TrendingUp} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">🏆 Top Selling Items</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Revenue Contribution %</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={top10.slice(0, 6)} cx="50%" cy="50%" outerRadius={90} dataKey="revenue" nameKey="name"
                  label={({ name, contribution_pct }) => `${name?.slice(0, 8)} ${contribution_pct}%`}>
                  {top10.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">🐢 Slow Moving Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left p-2">Item</th><th className="text-left p-2">Category</th>
                <th className="text-right p-2">Qty Sold</th><th className="text-right p-2">Revenue</th>
                <th className="text-right p-2">Contribution</th>
              </tr></thead>
              <tbody>
                {slow10.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2 text-muted-foreground">{item.category}</td>
                    <td className="p-2 text-right">{item.qty_sold}</td>
                    <td className="p-2 text-right">{formatCurrency(item.revenue)}</td>
                    <td className="p-2 text-right">{item.contribution_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ──── Customer Retention ────
export const CustomerRetentionReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const freqData = Array.isArray(data.frequency_breakdown) ? data.frequency_breakdown : [];
  const pieData = [
    { name: 'Repeat', value: data.repeat_customers || 0 },
    { name: 'Single Visit', value: data.single_visit || 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Customers" value={(data.total_customers || 0).toString()} icon={Users} />
        <MetricCard title="Repeat Customers" value={(data.repeat_customers || 0).toString()} icon={Repeat} />
        <MetricCard title="Retention Rate" value={`${data.retention_rate || 0}%`} icon={TrendingUp} />
        <MetricCard title="Churn Rate" value={`${data.churn_rate || 0}%`} icon={TrendingDown} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Retention Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Visit Frequency</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={freqData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="visit_count" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="customer_count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ──── Target vs Achievement ────
export const TargetAchievementReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const dailyData = Array.isArray(data.daily_data) ? data.daily_data : [];
  const avgDaily = data.avg_daily_revenue || 0;
  const chartData = dailyData.map((d: any) => ({
    ...d,
    target: avgDaily,
    achievement: d.revenue >= avgDaily ? 100 : Math.round((d.revenue / avgDaily) * 100),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Revenue" value={formatCurrency(data.total_revenue)} icon={IndianRupee} />
        <MetricCard title="Active Days" value={(data.total_days || 0).toString()} icon={Activity} />
        <MetricCard title="Avg Daily Revenue" value={formatCurrency(avgDaily)} icon={Target} />
        <MetricCard title="Days Above Avg" value={chartData.filter((d: any) => d.revenue >= avgDaily).length.toString()} subtitle={`of ${data.total_days}`} icon={TrendingUp} />
      </div>
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Revenue vs Average Target</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── Kitchen Performance ────
export const KitchenPerformanceReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Orders" value={(data.total_orders || 0).toString()} icon={ShoppingCart} />
        <MetricCard title="Completed" value={(data.completed_orders || 0).toString()} icon={Activity} />
        <MetricCard title="Cancelled" value={(data.cancelled_orders || 0).toString()} icon={AlertTriangle} />
        <MetricCard title="Efficiency Score" value={`${data.efficiency_score || 0}%`} icon={ChefHat} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Completion Rate</span><span className="font-bold">{data.completion_rate}%</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Avg Items/Order</span><span className="font-bold">{data.avg_items_per_order}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-500/10 rounded font-bold">
                <span>Efficiency Score</span>
                <Badge variant={data.efficiency_score >= 90 ? 'default' : data.efficiency_score >= 70 ? 'secondary' : 'destructive'}>
                  {data.efficiency_score}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Order Completion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: 'Completed', value: data.completed_orders || 0 },
                  { name: 'Cancelled', value: data.cancelled_orders || 0 },
                ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="hsl(var(--chart-2))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ──── Delivery Performance ────
export const DeliveryPerformanceReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const staff = Array.isArray(data.staff_performance) ? data.staff_performance : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Deliveries" value={(data.total_deliveries || 0).toString()} icon={Truck} />
        <MetricCard title="Completed" value={(data.completed_deliveries || 0).toString()} icon={Activity} />
        <MetricCard title="Avg Time" value={`${data.avg_delivery_time_mins || 0} min`} icon={Clock} />
        <MetricCard title="Completion Rate" value={`${data.completion_rate || 0}%`} icon={Percent} />
      </div>
      {staff.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery Staff Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left p-2">Staff</th>
                  <th className="text-right p-2">Deliveries</th>
                  <th className="text-right p-2">Completed</th>
                  <th className="text-right p-2">Avg Time (min)</th>
                </tr></thead>
                <tbody>
                  {staff.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2 text-right">{s.deliveries}</td>
                      <td className="p-2 text-right">{s.completed}</td>
                      <td className="p-2 text-right">{Math.round(s.avg_mins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── Invoice & Due Report ────
export const InvoiceReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const entries = Array.isArray(data.recent_entries) ? data.recent_entries : [];
  const statusPie = [
    { name: 'Paid', value: data.paid_count || 0 },
    { name: 'Partial', value: data.partial_count || 0 },
    { name: 'Unpaid', value: data.unpaid_count || 0 },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Credit Sales" value={formatCurrency(data.total_credit_sales)} icon={FileText} />
        <MetricCard title="Total Paid" value={formatCurrency(data.total_paid)} icon={IndianRupee} />
        <MetricCard title="Outstanding" value={formatCurrency(data.total_outstanding)} icon={AlertTriangle} />
        <MetricCard title="Unpaid Invoices" value={(data.unpaid_count || 0).toString()} icon={DollarSign} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Status</CardTitle></CardHeader>
          <CardContent>
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill="hsl(var(--chart-2))" />
                    <Cell fill="hsl(var(--chart-4))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyReport message="No credit entries" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Entries</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-2">
                {entries.slice(0, 10).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{e.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{e.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(e.due_amount)}</p>
                      <Badge variant={e.payment_status === 'paid' ? 'default' : e.payment_status === 'partial' ? 'secondary' : 'destructive'} className="text-xs">
                        {e.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ──── Multi-Outlet Report ────
export const MultiOutletReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  const outlets = Array.isArray(data) ? data : [];
  if (outlets.length === 0) return <EmptyReport message="No outlet data available" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Outlet-wise Revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={outlets}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="store_name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left p-2">Outlet</th>
                <th className="text-right p-2">Orders</th>
                <th className="text-right p-2">Revenue</th>
                <th className="text-right p-2">Avg Order</th>
              </tr></thead>
              <tbody>
                {outlets.map((o: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2 font-medium">{o.store_name}</td>
                    <td className="p-2 text-right">{o.order_count}</td>
                    <td className="p-2 text-right">{formatCurrency(o.revenue)}</td>
                    <td className="p-2 text-right">{formatCurrency(o.avg_order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
