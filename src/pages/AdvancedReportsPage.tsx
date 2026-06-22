import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdvancedReports, ReportType } from '@/hooks/useAdvancedReports';
import { usePOS } from '@/contexts/POSContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Clock, Table2,
  ShoppingCart, CreditCard, Receipt, Percent, AlertTriangle,
  FileText, Building, Brain, Download, Calendar, ArrowLeft,
  BarChart3, PieChartIcon, Activity, IndianRupee, Loader2,
  Package, Repeat, Target, ChefHat, Truck, Printer
} from 'lucide-react';
import {
  ItemPerformanceReport, CustomerRetentionReport, TargetAchievementReport,
  KitchenPerformanceReport, DeliveryPerformanceReport, InvoiceReport, MultiOutletReport
} from '@/components/reports/AdvancedReportTabs';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { printBillReport } from '@/lib/reportPrintUtils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8884d8', '#82ca9d', '#ffc658'];

const formatCurrency = (val: number) => `₹${val?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}`;

const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: { 
  title: string; value: string; subtitle?: string; icon: React.ElementType; trend?: number 
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

// ──── P&L Report ────
const PLReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;
  
  const categories = Array.isArray(data.category_breakdown) ? data.category_breakdown : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Revenue" value={formatCurrency(data.total_revenue)} icon={IndianRupee} />
        <MetricCard title="Total Expenses" value={formatCurrency(data.total_expenses)} icon={DollarSign} />
        <MetricCard title="Net Profit" value={formatCurrency(data.net_profit)} icon={TrendingUp} trend={data.profit_margin} />
        <MetricCard title="Profit Margin" value={`${data.profit_margin}%`} icon={Percent} />
      </div>
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Category-wise Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categories}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── Sales Trend Report ────
const SalesTrendReport = ({ data, loading, granularity, setGranularity }: {
  data: any; loading: boolean; granularity: string; setGranularity: (g: string) => void;
}) => {
  if (loading) return <ReportLoader />;
  const trends = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['daily', 'weekly', 'monthly'].map(g => (
          <Button key={g} size="sm" variant={granularity === g ? 'default' : 'outline'} onClick={() => setGranularity(g)}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </Button>
        ))}
      </div>
      {trends.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Total Revenue" value={formatCurrency(trends.reduce((s: number, t: any) => s + (t.revenue || 0), 0))} icon={IndianRupee} />
            <MetricCard title="Total Orders" value={trends.reduce((s: number, t: any) => s + (t.order_count || 0), 0).toString()} icon={ShoppingCart} />
            <MetricCard title="Avg Order Value" value={formatCurrency(trends.reduce((s: number, t: any) => s + (t.avg_order_value || 0), 0) / trends.length)} icon={BarChart3} />
          </div>
          <Card>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : <EmptyReport />}
    </div>
  );
};

// ──── Hourly Sales ────
const HourlySalesReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  const hourly = Array.isArray(data) ? data : [];
  const peakHour = hourly.reduce((max: any, h: any) => (!max || h.revenue > max.revenue) ? h : max, null);

  return (
    <div className="space-y-4">
      {peakHour && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard title="Peak Hour" value={`${peakHour.hour}:00 - ${peakHour.hour + 1}:00`} subtitle={`${peakHour.order_count} orders`} icon={Clock} />
          <MetricCard title="Peak Revenue" value={formatCurrency(peakHour.revenue)} icon={IndianRupee} />
          <MetricCard title="Total Hours Active" value={hourly.length.toString()} icon={Activity} />
        </div>
      )}
      {hourly.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Hour</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}:00`} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(h: number) => `${h}:00 - ${h + 1}:00`} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── Customer Analytics ────
const CustomerAnalyticsReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const topCustomers = Array.isArray(data.top_customers) ? data.top_customers : [];
  const pieData = [
    { name: 'New', value: data.new_customers || 0 },
    { name: 'Returning', value: data.repeat_customers || 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Customers" value={(data.total_customers || 0).toString()} icon={Users} />
        <MetricCard title="New Customers" value={(data.new_customers || 0).toString()} icon={Users} />
        <MetricCard title="Repeat Rate" value={`${data.repeat_rate || 0}%`} icon={Activity} />
        <MetricCard title="Avg Order Value" value={formatCurrency(data.avg_order_value || 0)} icon={IndianRupee} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">New vs Returning</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {topCustomers.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.order_count} orders</p>
                    </div>
                    <p className="text-sm font-bold">{formatCurrency(c.total_spent)}</p>
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

// ──── Table Performance ────
const TablePerformanceReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  const tables = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      {tables.length > 0 ? (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Table-wise Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tables}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="table_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="order_count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Table</th>
                      <th className="text-right p-2">Orders</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Avg Value</th>
                      <th className="text-right p-2">Active Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t: any, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2 font-medium">{t.table_name}</td>
                        <td className="p-2 text-right">{t.order_count}</td>
                        <td className="p-2 text-right">{formatCurrency(t.revenue)}</td>
                        <td className="p-2 text-right">{formatCurrency(t.avg_order_value)}</td>
                        <td className="p-2 text-right">{t.active_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : <EmptyReport message="No table orders found for this period" />}
    </div>
  );
};

// ──── Order Behavior ────
const OrderBehaviorReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const types = Array.isArray(data.type_breakdown) ? data.type_breakdown : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Orders" value={(data.total_orders || 0).toString()} icon={ShoppingCart} />
        <MetricCard title="Completed" value={(data.completed_orders || 0).toString()} icon={Activity} />
        <MetricCard title="Cancelled" value={(data.cancelled_orders || 0).toString()} icon={AlertTriangle} />
        <MetricCard title="Completion Rate" value={`${data.completion_rate || 0}%`} icon={Percent} />
      </div>
      {types.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Order Type Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={types} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="order_type" label={({ order_type, percent }) => `${order_type} ${(percent * 100).toFixed(0)}%`}>
                    {types.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={types}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="order_type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ──── Payment Breakdown ────
const PaymentReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const methods = Array.isArray(data.method_breakdown) ? data.method_breakdown : [];
  const gateway = Array.isArray(data.gateway_stats) ? data.gateway_stats : [];

  return (
    <div className="space-y-4">
      {methods.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={methods} cx="50%" cy="50%" outerRadius={90} dataKey="amount" nameKey="payment_method" label={({ payment_method, percent }) => `${payment_method} ${(percent * 100).toFixed(0)}%`}>
                    {methods.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Method Details</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {methods.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-sm font-medium capitalize">{m.payment_method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(m.amount)}</p>
                      <p className="text-xs text-muted-foreground">{m.count} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {gateway.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Gateway Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gateway.map((g: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{g.status}</p>
                  <p className="text-lg font-bold">{g.count}</p>
                  <p className="text-xs">{formatCurrency(g.total_amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── Tax Report ────
const TaxReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const taxBreakdown = [
    { name: 'CGST', value: data.cgst || 0 },
    { name: 'SGST', value: data.sgst || 0 },
    { name: 'IGST', value: data.igst || 0 },
  ].filter(t => t.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Tax Collected" value={formatCurrency(data.total_tax)} icon={Receipt} />
        <MetricCard title="Taxable Amount" value={formatCurrency(data.taxable_amount)} icon={IndianRupee} />
        <MetricCard title="Effective Tax Rate" value={`${data.effective_tax_rate}%`} icon={Percent} />
        <MetricCard title="Total Invoices" value={(data.order_count || 0).toString()} icon={FileText} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">GST Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>CGST</span><span className="font-bold">{formatCurrency(data.cgst)}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>SGST</span><span className="font-bold">{formatCurrency(data.sgst)}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>IGST</span><span className="font-bold">{formatCurrency(data.igst)}</span>
              </div>
              <div className="flex justify-between p-3 bg-primary/10 rounded font-bold">
                <span>Total GST</span><span>{formatCurrency(data.total_tax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {taxBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Tax Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taxBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {taxBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ──── Discount Report ────
const DiscountReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Discounts" value={formatCurrency(data.total_discounts)} icon={Percent} />
        <MetricCard title="Discounted Orders" value={`${data.orders_with_discount}/${data.total_orders}`} icon={ShoppingCart} />
        <MetricCard title="Avg Discount" value={formatCurrency(data.avg_discount)} icon={DollarSign} />
        <MetricCard title="Revenue Impact" value={formatCurrency(data.revenue_impact)} icon={AlertTriangle} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-muted/50 rounded">
              <span>Revenue Before Discount</span><span className="font-bold">{formatCurrency(data.revenue_before_discount)}</span>
            </div>
            <div className="flex justify-between p-3 bg-red-500/10 rounded text-red-600">
              <span>Discounts Given</span><span className="font-bold">-{formatCurrency(data.total_discounts)}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-500/10 rounded font-bold">
              <span>Revenue After Discount</span><span>{formatCurrency(data.revenue_after_discount)}</span>
            </div>
            <div className="flex justify-between p-3 bg-muted/50 rounded">
              <span>Discount Rate</span><span className="font-bold">{data.discount_rate}% of orders</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ──── Loss Control ────
const LossControlReport = ({ data, loading }: { data: any; loading: boolean }) => {
  if (loading) return <ReportLoader />;
  if (!data) return <EmptyReport />;

  const reasons = Array.isArray(data.cancellation_reasons) ? data.cancellation_reasons : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Cancelled Orders" value={(data.total_cancelled || 0).toString()} icon={AlertTriangle} />
        <MetricCard title="Lost Revenue" value={formatCurrency(data.cancelled_revenue)} icon={TrendingDown} />
        <MetricCard title="Discounts Given" value={formatCurrency(data.total_discounts_given)} icon={Percent} />
        <MetricCard title="Completed Orders" value={(data.total_completed || 0).toString()} icon={Activity} />
      </div>
      {reasons.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cancellation Reasons</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="reason" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="lost_revenue" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ──── AI Insights ────
const AIInsightsPanel = ({ storeId, dateRange }: { storeId: string; dateRange: { start: Date; end: Date } }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: plData, fetchReport: fetchPL } = useAdvancedReports(storeId);
  const { data: salesData, fetchReport: fetchSales } = useAdvancedReports(storeId);
  const { data: hourlyData, fetchReport: fetchHourly } = useAdvancedReports(storeId);

  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      await Promise.all([
        fetchPL('pl', dateRange),
        fetchSales('salesTrend', dateRange, { granularity: 'daily' }),
        fetchHourly('hourly', dateRange),
      ]);
      setLoading(false);
    };
    loadInsights();
  }, [storeId, dateRange]);

  useEffect(() => {
    const calculated: string[] = [];
    
    if (plData) {
      if (plData.net_profit < 0) calculated.push(`⚠️ You're running at a loss of ${formatCurrency(Math.abs(plData.net_profit))}`);
      else calculated.push(`✅ Net Profit: ${formatCurrency(plData.net_profit)} (${plData.profit_margin}% margin)`);
    }

    if (Array.isArray(salesData) && salesData.length > 1) {
      const last = salesData[salesData.length - 1];
      const prev = salesData[salesData.length - 2];
      if (last && prev && prev.revenue > 0) {
        const change = ((last.revenue - prev.revenue) / prev.revenue * 100).toFixed(1);
        if (Number(change) < 0) calculated.push(`📉 Sales dropped by ${Math.abs(Number(change))}% compared to previous period`);
        else calculated.push(`📈 Sales grew by ${change}% compared to previous period`);
      }
    }

    if (Array.isArray(hourlyData) && hourlyData.length > 0) {
      const peak = hourlyData.reduce((max: any, h: any) => (!max || h.revenue > max.revenue) ? h : max, null);
      if (peak) calculated.push(`🕐 Peak hour is ${peak.hour}:00 - ${peak.hour + 1}:00 with ${peak.order_count} orders`);
    }

    if (Array.isArray(salesData) && salesData.length > 0) {
      const topDay = salesData.reduce((max: any, d: any) => (!max || d.revenue > max.revenue) ? d : max, null);
      if (topDay) calculated.push(`🏆 Best day: ${topDay.period} with ${formatCurrency(topDay.revenue)} revenue`);
    }

    setInsights(calculated);
  }, [plData, salesData, hourlyData]);

  const generateAISummary = async () => {
    setLoading(true);
    try {
      const context = {
        insights,
        pl: plData,
        recentTrends: Array.isArray(salesData) ? salesData.slice(-7) : [],
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'You are a business analytics expert. Give brief, actionable insights in 3-5 bullet points based on the POS data. Keep it concise and practical.' },
              { role: 'user', content: `Analyze this POS business data and give insights:\n${JSON.stringify(context)}` }
            ]
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.reply || data.message || 'No AI summary available');
      }
    } catch (err) {
      console.error('AI insights error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> Calculated Insights
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">{insight}</div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading insights...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" /> AI Smart Summary
            </CardTitle>
            <Button size="sm" onClick={generateAISummary} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Brain className="w-3 h-3 mr-1" />}
              Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg text-sm whitespace-pre-wrap">{aiSummary}</div>
          ) : (
            <p className="text-sm text-muted-foreground">Click "Generate" to get AI-powered analysis of your business data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ──── Helper Components ────
const ReportLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const EmptyReport = ({ message = "No data available for this period" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

// ──── Main Component ────
const AdvancedReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeStore } = usePOS();
  const storeId = activeStore?.id || null;
  const [activeTab, setActiveTab] = useState<ReportType | null>(null);
  const [granularity, setGranularity] = useState('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  const { loading, data, fetchReport } = useAdvancedReports(storeId);

  useEffect(() => {
    if (storeId && activeTab && activeTab !== 'aiInsights' && dateRange?.from) {
      // Ensure 'to' date is set (default to 'from' if missing to avoid errors)
      const validDateRange = {
        start: dateRange.from,
        end: dateRange.to || dateRange.from
      };
      fetchReport(activeTab, validDateRange, { granularity });
    }
  }, [activeTab, storeId, dateRange, granularity]);

  const tabs = [
    { id: 'pl' as ReportType, label: 'P&L', icon: DollarSign },
    { id: 'salesTrend' as ReportType, label: 'Sales Trend', icon: TrendingUp },
    { id: 'hourly' as ReportType, label: 'Hourly', icon: Clock },
    { id: 'customer' as ReportType, label: 'Customers', icon: Users },
    { id: 'table' as ReportType, label: 'Tables', icon: Table2 },
    { id: 'orderBehavior' as ReportType, label: 'Orders', icon: ShoppingCart },
    { id: 'payment' as ReportType, label: 'Payments', icon: CreditCard },
    { id: 'discount' as ReportType, label: 'Discounts', icon: Percent },
    { id: 'lossControl' as ReportType, label: 'Loss Control', icon: AlertTriangle },
    { id: 'tax' as ReportType, label: 'Tax/GST', icon: Receipt },
    { id: 'itemPerformance' as ReportType, label: 'Items', icon: Package },
    { id: 'retention' as ReportType, label: 'Retention', icon: Repeat },
    { id: 'targetAchievement' as ReportType, label: 'Targets', icon: Target },
    { id: 'kitchen' as ReportType, label: 'Kitchen', icon: ChefHat },
    { id: 'delivery' as ReportType, label: 'Delivery', icon: Truck },
    { id: 'invoice' as ReportType, label: 'Invoices', icon: FileText },
    { id: 'multiOutlet' as ReportType, label: 'Outlets', icon: Building },
    { id: 'aiInsights' as ReportType, label: 'AI Insights ⭐', icon: Brain },
  ];

  const handlePrintReport = () => {
    if (!data || !activeTab || !dateRange?.from) return;
    const dateStr = `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to || dateRange.from, 'dd MMM yyyy')}`;
    const tabLabel = tabs.find(t => t.id === activeTab)?.label || activeTab;
    const rows: { label: string; value: string }[] = [];

    // Build rows based on report type
    if (activeTab === 'pl') {
      rows.push({ label: 'Total Revenue', value: formatCurrency(data.total_revenue || 0) });
      rows.push({ label: 'Total Expenses', value: formatCurrency(data.total_expenses || 0) });
      rows.push({ label: 'Net Profit', value: formatCurrency(data.net_profit || 0) });
      rows.push({ label: 'Profit Margin', value: `${data.profit_margin || 0}%` });
    } else if (activeTab === 'tax') {
      rows.push({ label: 'Total Tax', value: formatCurrency(data.total_tax || 0) });
      rows.push({ label: 'CGST', value: formatCurrency(data.cgst || 0) });
      rows.push({ label: 'SGST', value: formatCurrency(data.sgst || 0) });
      rows.push({ label: 'IGST', value: formatCurrency(data.igst || 0) });
      rows.push({ label: 'Taxable Amount', value: formatCurrency(data.taxable_amount || 0) });
    } else if (activeTab === 'discount') {
      rows.push({ label: 'Total Discounts', value: formatCurrency(data.total_discounts || 0) });
      rows.push({ label: 'Discounted Orders', value: `${data.orders_with_discount || 0}/${data.total_orders || 0}` });
      rows.push({ label: 'Avg Discount', value: formatCurrency(data.avg_discount || 0) });
      rows.push({ label: 'Revenue Impact', value: formatCurrency(data.revenue_impact || 0) });
    } else if (activeTab === 'lossControl') {
      rows.push({ label: 'Cancelled Orders', value: String(data.total_cancelled || 0) });
      rows.push({ label: 'Lost Revenue', value: formatCurrency(data.cancelled_revenue || 0) });
      rows.push({ label: 'Discounts Given', value: formatCurrency(data.total_discounts_given || 0) });
    } else if (activeTab === 'orderBehavior') {
      rows.push({ label: 'Total Orders', value: String(data.total_orders || 0) });
      rows.push({ label: 'Completed', value: String(data.completed_orders || 0) });
      rows.push({ label: 'Cancelled', value: String(data.cancelled_orders || 0) });
      rows.push({ label: 'Completion Rate', value: `${data.completion_rate || 0}%` });
    } else if (activeTab === 'customer') {
      rows.push({ label: 'Total Customers', value: String(data.total_customers || 0) });
      rows.push({ label: 'New Customers', value: String(data.new_customers || 0) });
      rows.push({ label: 'Repeat Rate', value: `${data.repeat_rate || 0}%` });
      rows.push({ label: 'Avg Order Value', value: formatCurrency(data.avg_order_value || 0) });
    } else if (activeTab === 'payment') {
      const methods = Array.isArray(data.method_breakdown) ? data.method_breakdown : [];
      methods.forEach((m: any) => rows.push({ label: String(m.payment_method).toUpperCase(), value: formatCurrency(m.amount || 0) }));
    } else if (activeTab === 'kitchen') {
      rows.push({ label: 'Total Orders', value: String(data.total_orders || 0) });
      rows.push({ label: 'Completed', value: String(data.completed_orders || 0) });
      rows.push({ label: 'Cancelled', value: String(data.cancelled_orders || 0) });
      rows.push({ label: 'Efficiency', value: `${data.efficiency_score || 0}%` });
    } else if (activeTab === 'retention') {
      rows.push({ label: 'Total Customers', value: String(data.total_customers || 0) });
      rows.push({ label: 'Repeat Customers', value: String(data.repeat_customers || 0) });
      rows.push({ label: 'Retention Rate', value: `${data.retention_rate || 0}%` });
      rows.push({ label: 'Churn Rate', value: `${data.churn_rate || 0}%` });
    } else if (activeTab === 'invoice') {
      rows.push({ label: 'Total Credit Sales', value: formatCurrency(data.total_credit_sales || 0) });
      rows.push({ label: 'Total Paid', value: formatCurrency(data.total_paid || 0) });
      rows.push({ label: 'Outstanding', value: formatCurrency(data.total_outstanding || 0) });
      rows.push({ label: 'Unpaid Invoices', value: String(data.unpaid_count || 0) });
    } else if (activeTab === 'targetAchievement') {
      rows.push({ label: 'Total Revenue', value: formatCurrency(data.total_revenue || 0) });
      rows.push({ label: 'Active Days', value: String(data.total_days || 0) });
      rows.push({ label: 'Avg Daily Revenue', value: formatCurrency(data.avg_daily_revenue || 0) });
    } else if (activeTab === 'delivery') {
      rows.push({ label: 'Total Deliveries', value: String(data.total_deliveries || 0) });
      rows.push({ label: 'Completed', value: String(data.completed_deliveries || 0) });
      rows.push({ label: 'Avg Time', value: `${data.avg_delivery_time_mins || 0} min` });
      rows.push({ label: 'Completion Rate', value: `${data.completion_rate || 0}%` });
    } else if (activeTab === 'itemPerformance') {
      rows.push({ label: 'Total Revenue', value: formatCurrency(data.total_revenue || 0) });
      rows.push({ label: 'Unique Items', value: String(data.total_items || 0) });
      const items = Array.isArray(data.items) ? data.items.slice(0, 10) : [];
      items.forEach((it: any) => rows.push({ label: it.name, value: formatCurrency(it.revenue || 0) }));
    } else if (Array.isArray(data)) {
      // salesTrend, hourly, table, multiOutlet
      data.slice(0, 15).forEach((d: any) => {
        const label = d.period || d.table_name || d.store_name || `${d.hour}:00` || 'Item';
        rows.push({ label, value: formatCurrency(d.revenue || 0) });
      });
    }

    if (rows.length === 0) {
      rows.push({ label: 'No data', value: '-' });
    }

    printBillReport(tabLabel, dateStr, rows);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => activeTab ? setActiveTab(null) : navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {activeTab ? tabs.find(t => t.id === activeTab)?.label || 'Report' : 'Advanced Reports'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {dateRange?.from ? format(dateRange.from, 'MMM dd') : ''} {dateRange?.to ? `- ${format(dateRange.to, 'MMM dd, yyyy')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab && activeTab !== 'aiInsights' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintReport}>
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant={!dateRange || (dateRange.from && !dateRange.to && dateRange.from.toDateString() === new Date().toDateString()) ? 'default' : 'outline'} onClick={() => setDateRange({ from: new Date(), to: new Date() })} className="h-9">Today</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </div>
      </div>

      {/* Grid View or Detail View */}
      {!activeTab ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-2 md:gap-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 active:scale-95 transition-all duration-200 min-h-[80px] md:min-h-[100px] group touch-manipulation"
              >
                <Icon className="w-6 h-6 md:w-8 md:h-8 text-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] md:text-xs text-center text-foreground font-medium leading-tight line-clamp-2">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {activeTab === 'pl' && <PLReport data={data} loading={loading} />}
          {activeTab === 'salesTrend' && <SalesTrendReport data={data} loading={loading} granularity={granularity} setGranularity={setGranularity} />}
          {activeTab === 'hourly' && <HourlySalesReport data={data} loading={loading} />}
          {activeTab === 'customer' && <CustomerAnalyticsReport data={data} loading={loading} />}
          {activeTab === 'table' && <TablePerformanceReport data={data} loading={loading} />}
          {activeTab === 'orderBehavior' && <OrderBehaviorReport data={data} loading={loading} />}
          {activeTab === 'payment' && <PaymentReport data={data} loading={loading} />}
          {activeTab === 'tax' && <TaxReport data={data} loading={loading} />}
          {activeTab === 'discount' && <DiscountReport data={data} loading={loading} />}
          {activeTab === 'lossControl' && <LossControlReport data={data} loading={loading} />}
          {activeTab === 'itemPerformance' && <ItemPerformanceReport data={data} loading={loading} />}
          {activeTab === 'retention' && <CustomerRetentionReport data={data} loading={loading} />}
          {activeTab === 'targetAchievement' && <TargetAchievementReport data={data} loading={loading} />}
          {activeTab === 'kitchen' && <KitchenPerformanceReport data={data} loading={loading} />}
          {activeTab === 'delivery' && <DeliveryPerformanceReport data={data} loading={loading} />}
          {activeTab === 'invoice' && <InvoiceReport data={data} loading={loading} />}
          {activeTab === 'multiOutlet' && <MultiOutletReport data={data} loading={loading} />}
          {activeTab === 'aiInsights' && storeId && dateRange?.from && <AIInsightsPanel storeId={storeId} dateRange={{ start: dateRange.from, end: dateRange.to || dateRange.from }} />}
        </div>
      )}
    </div>
  );
};

export default AdvancedReportsPage;
