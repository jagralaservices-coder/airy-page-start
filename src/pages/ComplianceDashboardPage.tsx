import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  Plus,
  Calendar,
  Building2,
  Flame,
  BadgeCheck,
  Receipt,
  MoreVertical,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ComplianceItem {
  id: string;
  name: string;
  category: 'license' | 'safety' | 'tax' | 'health' | 'labor';
  status: 'valid' | 'expiring' | 'expired' | 'pending';
  issueDate: string;
  expiryDate: string;
  documentNumber: string;
  authority: string;
  notes?: string;
}

const CATEGORY_CONFIG = {
  license: { label: 'Licenses', icon: BadgeCheck, gradient: 'from-blue-500 to-blue-700' },
  safety: { label: 'Fire & Safety', icon: Flame, gradient: 'from-orange-500 to-red-600' },
  tax: { label: 'Tax & GST', icon: Receipt, gradient: 'from-emerald-500 to-emerald-700' },
  health: { label: 'Health & FSSAI', icon: Shield, gradient: 'from-violet-500 to-purple-700' },
  labor: { label: 'Labor Laws', icon: Building2, gradient: 'from-amber-500 to-orange-600' },
};

const STATUS_CONFIG = {
  valid: { label: 'Valid', color: 'bg-success/15 text-success border-success/30', icon: CheckCircle2 },
  expiring: { label: 'Expiring Soon', color: 'bg-warning/15 text-warning border-warning/30', icon: Clock },
  expired: { label: 'Expired', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  pending: { label: 'Pending', color: 'bg-muted/30 text-muted-foreground border-border', icon: AlertTriangle },
};

const ComplianceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'license' as ComplianceItem['category'],
    issueDate: '',
    expiryDate: '',
    documentNumber: '',
    authority: '',
    notes: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('compliance_items');
    if (stored) {
      setItems(JSON.parse(stored));
    } else {
      // Demo data
      const demo: ComplianceItem[] = [
        {
          id: '1', name: 'FSSAI License', category: 'health', status: 'valid',
          issueDate: '2025-01-15', expiryDate: '2027-01-14',
          documentNumber: 'FSSAI-2025-78432', authority: 'FSSAI India'
        },
        {
          id: '2', name: 'GST Registration', category: 'tax', status: 'valid',
          issueDate: '2024-04-01', expiryDate: '2030-03-31',
          documentNumber: 'GSTIN-29ABCDE1234F1Z5', authority: 'GST Council'
        },
        {
          id: '3', name: 'Fire Safety Certificate', category: 'safety', status: 'expiring',
          issueDate: '2024-06-01', expiryDate: '2026-05-31',
          documentNumber: 'FSC-KA-2024-1123', authority: 'Fire Department'
        },
        {
          id: '4', name: 'Trade License', category: 'license', status: 'valid',
          issueDate: '2025-04-01', expiryDate: '2026-03-31',
          documentNumber: 'TL-BLR-2025-5567', authority: 'BBMP'
        },
        {
          id: '5', name: 'Shop & Establishment', category: 'labor', status: 'expired',
          issueDate: '2023-01-01', expiryDate: '2025-12-31',
          documentNumber: 'SE-KA-2023-9912', authority: 'Labor Dept'
        },
        {
          id: '6', name: 'Liquor License', category: 'license', status: 'pending',
          issueDate: '', expiryDate: '',
          documentNumber: 'Applied', authority: 'Excise Dept'
        },
      ];
      setItems(demo);
      localStorage.setItem('compliance_items', JSON.stringify(demo));
    }
  }, []);

  const handleAdd = () => {
    if (!newItem.name) return;
    const item: ComplianceItem = {
      id: Date.now().toString(),
      ...newItem,
      status: newItem.expiryDate
        ? new Date(newItem.expiryDate) < new Date() ? 'expired'
        : new Date(newItem.expiryDate) < new Date(Date.now() + 90 * 86400000) ? 'expiring'
        : 'valid'
        : 'pending',
    };
    const updated = [item, ...items];
    setItems(updated);
    localStorage.setItem('compliance_items', JSON.stringify(updated));
    setShowAddSheet(false);
    setNewItem({ name: '', category: 'license', issueDate: '', expiryDate: '', documentNumber: '', authority: '', notes: '' });
    toast({ title: 'Compliance item added' });
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter);

  const counts = {
    all: items.length,
    valid: items.filter(i => i.status === 'valid').length,
    expiring: items.filter(i => i.status === 'expiring').length,
    expired: items.filter(i => i.status === 'expired').length,
    pending: items.filter(i => i.status === 'pending').length,
  };

  const overallScore = items.length > 0
    ? Math.round((counts.valid / items.length) * 100)
    : 0;

  const getDaysRemaining = (date: string) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Compliance</h1>
              <p className="text-xs text-muted-foreground">Licenses & Certifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {counts.expiring + counts.expired > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-warning" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">
                  {counts.expiring + counts.expired}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 -ml-6 -mb-6" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-white/70">Compliance Score</p>
                <p className="text-4xl font-bold">{overallScore}%</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="text-center p-2 bg-white/10 rounded-xl">
                <p className="text-lg font-bold">{counts.valid}</p>
                <p className="text-[10px] text-white/70">Valid</p>
              </div>
              <div className="text-center p-2 bg-white/10 rounded-xl">
                <p className="text-lg font-bold">{counts.expiring}</p>
                <p className="text-[10px] text-white/70">Expiring</p>
              </div>
              <div className="text-center p-2 bg-white/10 rounded-xl">
                <p className="text-lg font-bold">{counts.expired}</p>
                <p className="text-[10px] text-white/70">Expired</p>
              </div>
              <div className="text-center p-2 bg-white/10 rounded-xl">
                <p className="text-lg font-bold">{counts.pending}</p>
                <p className="text-[10px] text-white/70">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['all', 'valid', 'expiring', 'expired', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              )}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No compliance items found</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const catConfig = CATEGORY_CONFIG[item.category];
              const statusConfig = STATUS_CONFIG[item.status];
              const CatIcon = catConfig.icon;
              const StatusIcon = statusConfig.icon;
              const daysRemaining = getDaysRemaining(item.expiryDate);

              return (
                <div key={item.id} className="pos-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shrink-0', catConfig.gradient)}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.authority}</p>
                        </div>
                        <Badge className={cn('text-[10px] border shrink-0', statusConfig.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{item.documentNumber}</span>
                        </div>
                        {item.expiryDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className={cn('text-[11px]',
                              daysRemaining !== null && daysRemaining < 0 ? 'text-destructive font-medium' :
                              daysRemaining !== null && daysRemaining < 90 ? 'text-warning font-medium' :
                              'text-muted-foreground'
                            )}>
                              {daysRemaining !== null && daysRemaining < 0
                                ? `Expired ${Math.abs(daysRemaining)}d ago`
                                : daysRemaining !== null && daysRemaining < 365
                                ? `${daysRemaining}d remaining`
                                : new Date(item.expiryDate).toLocaleDateString()
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Add Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Compliance Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <Input
                placeholder="e.g. FSSAI License"
                value={newItem.name}
                onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <Select value={newItem.category} onValueChange={(v) => setNewItem(p => ({ ...p, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Issue Date</label>
                <Input type="date" value={newItem.issueDate} onChange={(e) => setNewItem(p => ({ ...p, issueDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry Date</label>
                <Input type="date" value={newItem.expiryDate} onChange={(e) => setNewItem(p => ({ ...p, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Number</label>
              <Input
                placeholder="License/Certificate number"
                value={newItem.documentNumber}
                onChange={(e) => setNewItem(p => ({ ...p, documentNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Issuing Authority</label>
              <Input
                placeholder="e.g. FSSAI, Fire Dept"
                value={newItem.authority}
                onChange={(e) => setNewItem(p => ({ ...p, authority: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea
                placeholder="Any additional notes..."
                value={newItem.notes}
                onChange={(e) => setNewItem(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!newItem.name}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ComplianceDashboardPage;
