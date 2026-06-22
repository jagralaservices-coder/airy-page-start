import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Landmark, Plus, Search, Filter, Check, Pause, Minus, Globe, UtensilsCrossed, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePOS } from '@/contexts/POSContext';
import { toast } from 'sonner';

interface TaxRule {
  id: string;
  country: string;
  flag: string;
  type: string;
  filing: string;
  rate: number;
  pricing: 'inclusive' | 'exclusive';
  status: 'active' | 'paused';
  digital?: boolean;
}

const taxRules: TaxRule[] = [
  { id: '1', country: 'United Kingdom', flag: '🇬🇧', type: 'VAT', filing: 'Quarterly', rate: 20.0, pricing: 'inclusive', status: 'active', digital: true },
  { id: '2', country: 'Germany', flag: '🇩🇪', type: 'VAT', filing: 'Monthly', rate: 19.0, pricing: 'exclusive', status: 'paused' },
  { id: '3', country: 'India', flag: '🇮🇳', type: 'GST', filing: 'Monthly', rate: 18.0, pricing: 'exclusive', status: 'active', digital: true },
  { id: '4', country: 'Saudi Arabia', flag: '🇸🇦', type: 'VAT', filing: 'Quarterly', rate: 15.0, pricing: 'inclusive', status: 'active' },
];

const tabs = [
  { key: 'active', label: 'Active Rules' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

const TaxEnginePage: React.FC = () => {
  const { taxPercent, setTaxPercent, activeStore, updateStore } = usePOS();
  const [activeTab, setActiveTab] = useState('active');
  const [taxCategory, setTaxCategory] = useState<'food' | 'alcohol'>('food');
  const [taxRate, setTaxRate] = useState(() => {
    const rate = Number(taxPercent);
    return isNaN(rate) ? 5 : rate;
  });
  const [inclusive, setInclusive] = useState(() => {
    if (activeStore) {
      return activeStore.taxType === 'inclusive';
    }
    return localStorage.getItem('pos_tax_inclusive') !== 'false';
  });
  const [baseAmount] = useState(100);

  useEffect(() => {
    const rate = Number(taxPercent);
    if (!isNaN(rate)) {
      setTaxRate(rate);
    }
  }, [taxPercent]);

  useEffect(() => {
    if (activeStore) {
      setInclusive(activeStore.taxType === 'inclusive');
    }
  }, [activeStore]);

  const filteredRules = taxRules.filter(rule => {
    if (activeTab === 'active') return rule.status === 'active';
    if (activeTab === 'drafts') return rule.status === 'paused';
    return false; // archived
  });

  const handleSaveTaxConfig = () => {
    setTaxPercent(taxRate);
    localStorage.setItem('pos_tax_inclusive', String(inclusive));
    if (activeStore) {
      updateStore(activeStore.id, {
        taxPercentage: taxRate,
        taxType: inclusive ? 'inclusive' : 'exclusive'
      });
    }
    toast.success('Tax configuration saved successfully!');
  };

  const taxAmount = inclusive ? (baseAmount * taxRate) / (100 + taxRate) : (baseAmount * taxRate) / 100;
  const totalAmount = inclusive ? baseAmount : baseAmount + taxAmount;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Tax Engine</h1>
              <p className="text-[10px] text-success font-medium">✓ Auto-synced</p>
            </div>
          </div>
          <Button size="icon" className="rounded-xl h-9 w-9 bg-primary">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 pb-24">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tax rules..." className="pl-10 bg-card border-border rounded-xl h-10" />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-all',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Regional Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Regional Rules</p>
            <Badge variant="secondary" className="text-[10px]">{filteredRules.length} tax rules</Badge>
          </div>

          <div className="space-y-3">
            {filteredRules.map(rule => (
              <div key={rule.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{rule.flag}</span>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{rule.country}</h3>
                      <p className="text-[10px] text-muted-foreground">Tax type: {rule.type} • Filing: {rule.filing}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] h-5', rule.status === 'active' ? 'text-success border-success/30' : 'text-warning border-warning/30')}
                    >
                      ● {rule.status === 'active' ? 'Active' : 'Paused'}
                    </Badge>
                    {rule.digital && (
                      <Badge variant="secondary" className="text-[10px] h-5 bg-primary/20 text-primary">DIGITAL_FILING</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rate</p>
                    <p className="text-lg font-bold text-success">{rule.rate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pricing</p>
                    <p className="text-sm font-medium text-foreground">Tax {rule.pricing}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Configurator */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Tax Configurator</p>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="font-bold text-foreground text-sm">Tax Slabs</p>

            {/* Category Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setTaxCategory('food')}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all',
                  taxCategory === 'food' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                )}
              >
                <UtensilsCrossed className="w-5 h-5" />
                <span className="text-xs font-medium">Food</span>
              </button>
              <button
                onClick={() => setTaxCategory('alcohol')}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all',
                  taxCategory === 'alcohol' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                )}
              >
                <Wine className="w-5 h-5" />
                <span className="text-xs font-medium">Alcohol</span>
              </button>
            </div>

            {/* Rate Adjuster */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tax Percentage</p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline" size="icon" className="rounded-xl h-10 w-10"
                  onClick={() => setTaxRate(prev => Math.max(0, prev - 0.5))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 bg-muted rounded-xl h-12 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{taxRate.toFixed(2)}%</span>
                </div>
                <Button
                  variant="outline" size="icon" className="rounded-xl h-10 w-10"
                  onClick={() => setTaxRate(prev => Math.min(100, prev + 0.5))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Inclusive Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Tax inclusive pricing</span>
              <Switch checked={inclusive} onCheckedChange={setInclusive} />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveTaxConfig}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold mt-2"
            >
              Save Tax Settings
            </Button>
          </div>
        </div>

        {/* Tax Preview */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Tax Section Preview</p>

          {/* Calculator Widget */}
          <div className="bg-card border border-primary/30 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tax Calculator</p>
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Base Amount</p>
              <p className="text-3xl font-bold text-success">${baseAmount.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Tax</p>
                <p className="text-lg font-bold text-primary">${taxAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Final Total</p>
                <p className="text-lg font-bold text-foreground">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="bg-card border border-border rounded-2xl p-4 border-dashed">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-center mb-3">Invoice Preview</p>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item #001 ({taxCategory === 'food' ? 'Food' : 'Alcohol'})</span>
                <span className="text-foreground">${baseAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SUBTOTAL</span>
                <span className="text-foreground">${baseAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>{inclusive ? 'VAT (Incl.)' : 'VAT'} ({taxRate}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span className="text-foreground">TOTAL</span>
                <span className="text-foreground">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxEnginePage;
