import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Brain, RefreshCw, AlertTriangle, TrendingUp,
  TrendingDown, Minus, Package, ShoppingCart, Zap, Clock,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface Recommendation {
  id: string;
  product_name: string;
  current_stock: number;
  min_stock: number;
  avg_daily_sales: number;
  predicted_demand_7d: number;
  suggested_quantity: number;
  reason: string;
  category: string;
  days_until_stockout: number;
  trend: string;
  status: string;
  analysis_period_start: string;
  analysis_period_end: string;
  generated_at: string;
}

interface AnalysisSummary {
  total: number;
  critical: number;
  low_stock: number;
  high_demand: number;
  warning: number;
  ai_summary: string;
  period: { start: string; end: string };
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const SmartInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeStore } = usePOS();
  const { canAccess } = useSubscription();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoDay, setAutoDay] = useState('0');
  const [filter, setFilter] = useState<string>('all');
  const [expandedAI, setExpandedAI] = useState(true);

  const storeId = activeStore?.id;

  // Load existing recommendations
  const loadRecommendations = useCallback(async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_recommendations')
        .select('*')
        .eq('store_id', storeId)
        .order('category', { ascending: true })
        .order('days_until_stockout', { ascending: true });

      if (error) throw error;
      setRecommendations((data as any[]) || []);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  // Load auto-analysis settings
  useEffect(() => {
    if (!storeId) return;
    const loadSettings = async () => {
      const { data } = await supabase
        .from('store_settings')
        .select('setting_value')
        .eq('store_id', storeId)
        .eq('setting_key', 'smart_inventory_auto')
        .maybeSingle();
      if (data?.setting_value) {
        const val = data.setting_value as any;
        setAutoEnabled(val.enabled ?? false);
        setAutoDay(val.day ?? '0');
      }
    };
    loadSettings();
    loadRecommendations();
  }, [storeId, loadRecommendations]);

  // Save auto settings
  const saveAutoSettings = async (enabled: boolean, day: string) => {
    if (!storeId) return;
    const { error } = await supabase
      .from('store_settings')
      .upsert({
        store_id: storeId,
        setting_key: 'smart_inventory_auto',
        setting_value: { enabled, day } as any,
      }, { onConflict: 'store_id,setting_key' });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!storeId) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-inventory-analysis', {
        body: { store_id: storeId },
      });

      if (error) throw error;

      if (data?.success) {
        setSummary(data.summary);
        await loadRecommendations();
        toast({ title: '✅ Analysis Complete', description: `${data.summary.total} recommendations generated` });
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (err: any) {
      toast({ title: 'Analysis Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mark recommendation as ordered
  const markOrdered = async (id: string) => {
    const { error } = await supabase
      .from('purchase_recommendations')
      .update({ status: 'ordered' } as any)
      .eq('id', id);
    if (!error) {
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'ordered' } : r));
      toast({ title: 'Marked as ordered' });
    }
  };

  const filtered = filter === 'all' ? recommendations : recommendations.filter(r => r.category === filter);
  const criticalCount = recommendations.filter(r => r.category === 'critical').length;
  const lowCount = recommendations.filter(r => r.category === 'low_stock').length;
  const highDemandCount = recommendations.filter(r => r.category === 'high_demand').length;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'low_stock': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'high_demand': return <TrendingUp className="w-4 h-4 text-primary" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing': return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
      case 'declining': return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
      default: return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getCategoryBg = (cat: string) => {
    switch (cat) {
      case 'critical': return 'bg-destructive/10 border-destructive/30';
      case 'low_stock': return 'bg-warning/10 border-warning/30';
      case 'high_demand': return 'bg-primary/10 border-primary/30';
      case 'warning': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-card border-border';
    }
  };

  // Gate: only Platinum plan can access Smart Inventory
  if (!canAccess('smartInventory')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Smart Inventory</h2>
          <p className="text-muted-foreground">This feature requires a Platinum plan. Please upgrade to access AI-powered inventory insights.</p>
          <Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-widest text-primary uppercase">AI-Powered</p>
            <h1 className="text-lg font-bold text-foreground">Smart Inventory</h1>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="rounded-xl gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Generate Plan'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 cursor-pointer" onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Critical</p>
            <p className="text-3xl font-bold text-foreground mt-1">{criticalCount}</p>
            <p className="text-xs text-destructive font-medium">Out of stock</p>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 cursor-pointer" onClick={() => setFilter(filter === 'low_stock' ? 'all' : 'low_stock')}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Low Stock</p>
            <p className="text-3xl font-bold text-foreground mt-1">{lowCount}</p>
            <p className="text-xs text-warning font-medium">Below min level</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer" onClick={() => setFilter(filter === 'high_demand' ? 'all' : 'high_demand')}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">High Demand</p>
            <p className="text-3xl font-bold text-foreground mt-1">{highDemandCount}</p>
            <p className="text-xs text-primary font-medium">Trending up</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer" onClick={() => setFilter('all')}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Items</p>
            <p className="text-3xl font-bold text-foreground mt-1">{recommendations.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Need attention</p>
          </div>
        </div>

        {/* AI Summary */}
        {summary?.ai_summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedAI(!expandedAI)}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">AI Insights</span>
              </div>
              {expandedAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            {expandedAI && (
              <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {summary.ai_summary}
              </div>
            )}
          </div>
        )}

        {/* Auto Analysis Settings */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Auto Weekly Analysis</h3>
                <p className="text-[11px] text-muted-foreground">Runs every {DAYS_OF_WEEK.find(d => d.value === autoDay)?.label}</p>
              </div>
            </div>
            <Switch
              checked={autoEnabled}
              onCheckedChange={(checked) => {
                setAutoEnabled(checked);
                saveAutoSettings(checked, autoDay);
              }}
            />
          </div>
          {autoEnabled && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Analysis Day</label>
              <Select value={autoDay} onValueChange={(val) => { setAutoDay(val); saveAutoSettings(autoEnabled, val); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: recommendations.length },
            { key: 'critical', label: 'Critical', count: criticalCount },
            { key: 'low_stock', label: 'Low Stock', count: lowCount },
            { key: 'high_demand', label: 'High Demand', count: highDemandCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
            Purchase Recommendations
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {recommendations.length === 0
                  ? 'No analysis yet. Click "Generate Plan" to start.'
                  : 'No items in this category.'}
              </p>
            </div>
          ) : (
            filtered.map(rec => (
              <div
                key={rec.id}
                className={cn('border rounded-2xl p-4 transition-all', getCategoryBg(rec.category))}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {getCategoryIcon(rec.category)}
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{rec.product_name}</h3>
                      <p className="text-[11px] text-muted-foreground">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(rec.trend)}
                    <span className="text-[10px] text-muted-foreground capitalize">{rec.trend}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-border/50">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Current</p>
                    <p className={cn('text-sm font-bold', rec.current_stock <= 0 ? 'text-destructive' : 'text-foreground')}>
                      {rec.current_stock}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Avg/Day</p>
                    <p className="text-sm font-bold text-foreground">{rec.avg_daily_sales}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Need 7d</p>
                    <p className="text-sm font-bold text-foreground">{rec.predicted_demand_7d}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Buy</p>
                    <p className="text-sm font-bold text-primary">{rec.suggested_quantity}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      ~{rec.days_until_stockout > 30 ? '30+' : Math.round(rec.days_until_stockout)} days left
                    </span>
                  </div>
                  {rec.status === 'ordered' ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">Ordered</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-[10px] h-7 px-3 font-bold"
                      onClick={() => markOrdered(rec.id)}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Mark Ordered
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInventoryPage;
