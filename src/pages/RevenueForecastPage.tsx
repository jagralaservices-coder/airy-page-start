import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, BarChart3, Calculator, Target, TrendingDown, Inbox } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RevenueForecastPage = () => {
  const [growthRate, setGrowthRate] = useState([8]);
  const [seasonalFactor, setSeasonalFactor] = useState([5]);
  const [timeRange, setTimeRange] = useState("6months");

  const [history, setHistory] = useState<Array<{ month: string; revenue: number; expenses: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const [ords, exps] = await Promise.all([
        supabase.from("orders").select("total, created_at").gte("created_at", since).limit(20000),
        supabase.from("expenses").select("amount, created_at").gte("created_at", since).limit(20000),
      ]);
      if (cancelled) return;
      const rev = new Map<string, number>();
      ((ords.data ?? []) as any[]).forEach((o) => {
        const k = (o.created_at ?? "").slice(0, 7);
        if (k) rev.set(k, (rev.get(k) ?? 0) + Number(o.total ?? 0));
      });
      const exp = new Map<string, number>();
      ((exps.data ?? []) as any[]).forEach((e) => {
        const k = (e.created_at ?? "").slice(0, 7);
        if (k) exp.set(k, (exp.get(k) ?? 0) + Number(e.amount ?? 0));
      });
      const keys = Array.from(new Set([...rev.keys(), ...exp.keys()])).sort();
      setHistory(
        keys.map((k) => ({
          month: MONTHS[Number(k.slice(5, 7)) - 1] ?? k,
          revenue: rev.get(k) ?? 0,
          expenses: exp.get(k) ?? 0,
        }))
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const revenue = history.reduce((s, m) => s + m.revenue, 0);
    const expenses = history.reduce((s, m) => s + m.expenses, 0);
    const profit = revenue - expenses;
    return { revenue, expenses, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 };
  }, [history]);

  // Simple linear-trend forecast for the next 6 months based on recent average
  const forecast = useMemo(() => {
    if (history.length === 0) return [];
    const last3 = history.slice(-3);
    const baseline = last3.reduce((s, m) => s + m.revenue, 0) / Math.max(last3.length, 1);
    const growth = 1 + growthRate[0] / 100;
    const seasonal = 1 + seasonalFactor[0] / 100;
    const lastIdx = MONTHS.indexOf(history[history.length - 1].month);
    return Array.from({ length: 6 }).map((_, i) => {
      const m = MONTHS[(lastIdx + 1 + i) % 12];
      const forecastValue = Math.round(baseline * Math.pow(growth, (i + 1) / 12) * seasonal);
      return { month: m, forecast: forecastValue, simulated: forecastValue };
    });
  }, [history, growthRate, seasonalFactor]);

  const chartData = [...history.map((h) => ({ ...h, forecast: 0, simulated: 0 })), ...forecast.map((f) => ({ month: f.month, revenue: 0, expenses: 0, forecast: f.forecast, simulated: f.simulated }))];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">📈 Revenue Forecast</h1>
            <p className="text-xs text-muted-foreground">Projected from live order & expense history</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[110px] h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Revenue (12m)</p>
            <p className="text-2xl font-bold mt-1">₹{totals.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <DollarSign className="w-5 h-5 text-primary mt-2" />
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Expenses (12m)</p>
            <p className="text-2xl font-bold mt-1">₹{totals.expenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <TrendingDown className="w-5 h-5 text-destructive mt-2" />
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Net Profit</p>
            <p className="text-2xl font-bold mt-1">₹{totals.profit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <BarChart3 className="w-5 h-5 text-green-600 mt-2" />
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Profit Margin</p>
            <p className="text-2xl font-bold mt-1">{totals.margin.toFixed(1)}%</p>
            <Target className="w-5 h-5 text-accent-foreground mt-2" />
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Revenue & Forecast Trend</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm">No order history yet — forecast unavailable</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} className="text-xs" />
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} strokeDasharray="6 3" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" /> Scenario Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Growth Rate</span><span className="font-semibold">{growthRate[0]}%</span></div>
                <Slider value={growthRate} onValueChange={setGrowthRate} min={0} max={25} step={1} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Seasonal Factor</span><span className="font-semibold">{seasonalFactor[0]}%</span></div>
                <Slider value={seasonalFactor} onValueChange={setSeasonalFactor} min={-10} max={20} step={1} />
              </div>
              <Button className="w-full" size="sm" variant="outline">Export Forecast Report</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} className="text-xs" />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueForecastPage;
