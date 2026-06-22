import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TriangleAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const demandData = [
  { price: 10, demand: 90 }, { price: 14, demand: 85 }, { price: 18, demand: 78 },
  { price: 22, demand: 65 }, { price: 26, demand: 48 }, { price: 30, demand: 35 },
  { price: 34, demand: 25 }, { price: 38, demand: 18 },
];

const strategies = [
  { key: 'conservative', label: 'Conservative', sub: 'Low Risk' },
  { key: 'balanced', label: 'Balanced', sub: 'Optimal' },
  { key: 'aggressive', label: 'Aggressive', sub: 'High ROI' },
];

const priceSuggestions = [
  { item: 'Premium Roast', current: 18.50, suggested: 20.25, demand: 'High' },
  { item: 'Espresso Blend', current: 24.00, suggested: 22.50, demand: 'Low' },
  { item: 'Chai Latte', current: 12.00, suggested: 13.75, demand: 'High' },
  { item: 'Cold Brew', current: 15.00, suggested: 14.25, demand: 'Medium' },
];

const DynamicPricingPage: React.FC = () => {
  const [activeStrategy, setActiveStrategy] = useState('balanced');
  const [realtime, setRealtime] = useState(true);
  const [costIncrease, setCostIncrease] = useState([8]);
  const [competitorDelta, setCompetitorDelta] = useState([-3]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">MAXORA <span className="text-muted-foreground font-normal">Pricing</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Real-time</span>
            <Switch checked={realtime} onCheckedChange={setRealtime} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Pricing Strategy */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Pricing Strategy</p>
          <div className="flex gap-2">
            {strategies.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveStrategy(s.key)}
                className={cn(
                  'flex-1 rounded-xl py-2.5 px-3 text-center transition-all border',
                  activeStrategy === s.key
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-card border-border text-foreground hover:border-primary/40'
                )}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p className={cn('text-[10px]', activeStrategy === s.key ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{s.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Demand vs Price Curve */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Demand vs Price Curve</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData}>
                <XAxis dataKey="price" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Demand']}
                  labelFormatter={l => `Price: $${l}`}
                />
                <Line type="monotone" dataKey="demand" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Revenue Forecast</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ label: 'Current', value: 45 }, { label: 'Predicted', value: 72 }]}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Price Suggestions */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Dynamic Price Suggestions</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left pb-2 font-semibold">Item</th>
                  <th className="text-right pb-2 font-semibold">Current</th>
                  <th className="text-right pb-2 font-semibold">Suggested</th>
                  <th className="text-right pb-2 font-semibold">Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {priceSuggestions.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium text-foreground">{item.item}</td>
                    <td className="py-2.5 text-right text-muted-foreground">${item.current.toFixed(2)}</td>
                    <td className={cn('py-2.5 text-right font-semibold', item.suggested > item.current ? 'text-success' : 'text-destructive')}>
                      ${item.suggested.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={cn(
                        'text-xs font-medium',
                        item.demand === 'High' ? 'text-success' : item.demand === 'Low' ? 'text-destructive' : 'text-warning'
                      )}>
                        {item.demand}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scenario Simulation */}
        <div className="bg-card border border-border rounded-2xl p-4 border-dashed">
          <div className="flex items-center gap-2 mb-4">
            <TriangleAlert className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground">Scenario Simulation</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Base Increase</span>
                <span className="text-sm font-bold text-primary">+{costIncrease[0]}%</span>
              </div>
              <Slider value={costIncrease} onValueChange={setCostIncrease} min={0} max={25} step={1} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor Price Delta</span>
                <span className="text-sm font-bold text-destructive">{competitorDelta[0]}%</span>
              </div>
              <Slider value={competitorDelta} onValueChange={setCompetitorDelta} min={-15} max={15} step={1} />
            </div>

            <Button className="w-full rounded-xl h-11 font-bold">
              RUN ANALYSIS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicPricingPage;
