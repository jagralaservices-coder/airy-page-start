import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Zap, TrendingUp, Users, Package, DollarSign,
  Megaphone, Leaf, AlertTriangle, ArrowLeft, Activity
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AIModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  metrics: { label: string; value: string; color: string }[];
  warning?: string;
}

interface AIDecision {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'price' | 'restock' | 'promo';
}

const AIControlCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<AIModule[]>([
    { id: 'restock', name: 'Auto Restock Engine', description: 'Predictive inventory sourcing', icon: Package, enabled: true, metrics: [{ label: 'EST. SAVINGS', value: '$2,450/mo', color: 'text-success' }, { label: 'CONFIDENCE', value: '98%', color: 'text-primary' }] },
    { id: 'pricing', name: 'Dynamic Pricing', description: 'Real-time margin optimization', icon: DollarSign, enabled: true, metrics: [{ label: 'REVENUE GAIN', value: '+4.2%', color: 'text-success' }, { label: 'CONFIDENCE', value: '92%', color: 'text-primary' }] },
    { id: 'staff', name: 'Staff Optimization', description: 'Requires manual sync', icon: Users, enabled: false, metrics: [], warning: 'PENDING SCHEDULE APPROVAL' },
    { id: 'promo', name: 'Promotion Engine', description: 'Automated loyalty rewards', icon: Megaphone, enabled: true, metrics: [{ label: 'RETENTION', value: '+18%', color: 'text-success' }, { label: 'CONFIDENCE', value: '89%', color: 'text-primary' }] },
    { id: 'waste', name: 'Waste Reduction AI', description: 'Perishable shelf-life tracking', icon: Leaf, enabled: true, metrics: [{ label: 'SAVED QTY', value: '412 units', color: 'text-success' }, { label: 'CONFIDENCE', value: '95%', color: 'text-primary' }] },
  ]);

  const decisions: AIDecision[] = [
    { id: '1', time: 'JUST NOW', title: 'Price Adjusted: SKU-4920', description: 'Increased by 4.2% based on competitor stock depletion in 5km radius.', type: 'price' },
    { id: '2', time: '12M AGO', title: 'Restock Order Generated', description: "Ordered 500 units of 'Organic Milk' to arrive before predicted heatwave.", type: 'restock' },
    { id: '3', time: '45M AGO', title: 'Promo Triggered: Mid-Day Lull', description: 'Sent "Coffee & Donut" 15% discount to 45 local users via push.', type: 'promo' },
  ];

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const activeCount = modules.filter(m => m.enabled).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-widest text-primary uppercase">AI Control Center</p>
            <h1 className="text-lg font-bold text-foreground">MAXORA</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Optimization Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Optimization Score</p>
            <p className="text-3xl font-bold text-foreground mt-1">94%</p>
            <p className="text-xs text-success font-medium">↑ 2.1%</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue Impact</p>
            <p className="text-3xl font-bold text-foreground mt-1">+12.4%</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cost Reduction</p>
            <p className="text-3xl font-bold text-foreground mt-1">8.2%</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active Modules</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {activeCount} <span className="text-sm font-normal text-muted-foreground">/ {modules.length}</span>
            </p>
          </div>
        </div>

        {/* Active Modules Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Autonomous Modules</h2>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-success animate-pulse" />
              <span className="text-[10px] font-bold text-success tracking-wider">LIVE ENGINE</span>
            </div>
          </div>

          <div className="space-y-2">
            {modules.map(mod => (
              <div
                key={mod.id}
                className={cn(
                  'bg-card border rounded-2xl p-4 transition-all',
                  mod.enabled ? 'border-border' : 'border-warning/30 bg-warning/5'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', mod.enabled ? 'bg-primary/10' : 'bg-warning/10')}>
                      <mod.icon className={cn('w-4 h-4', mod.enabled ? 'text-primary' : 'text-warning')} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{mod.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  <Switch checked={mod.enabled} onCheckedChange={() => toggleModule(mod.id)} />
                </div>

                {mod.warning && (
                  <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-warning/10 rounded-xl">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    <span className="text-[10px] font-bold text-warning tracking-wider">{mod.warning}</span>
                  </div>
                )}

                {mod.metrics.length > 0 && (
                  <div className="flex items-center gap-6 mt-3 pt-2 border-t border-border/50">
                    {mod.metrics.map((metric, i) => (
                      <div key={i}>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{metric.label}</p>
                        <p className={cn('text-base font-bold', metric.color)}>{metric.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Decision Log */}
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">AI Decision Log</h2>
          <div className="space-y-3">
            {decisions.map(decision => (
              <div key={decision.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5', decision.time === 'JUST NOW' ? 'bg-success' : 'bg-muted-foreground/30')} />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className={cn('text-[10px] font-bold tracking-wider', decision.time === 'JUST NOW' ? 'text-success' : 'text-muted-foreground')}>
                        {decision.time}
                      </p>
                      <h3 className="font-bold text-foreground text-sm">{decision.title}</h3>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] h-7 px-3 font-bold tracking-wider">
                      OVERRIDE
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{decision.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIControlCenterPage;
