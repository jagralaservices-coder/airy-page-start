import React, { useState, useCallback } from 'react';
import {
  useUICustomization,
  DEFAULT_SHORTCUTS,
} from '@/hooks/useUICustomization';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  GripVertical,
  Eye,
  EyeOff,
  Keyboard,
  Layout,
  ToggleLeft,
  RotateCcw,
  Check,
  ChevronUp,
  ChevronDown,
  Settings,
  Menu,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UICustomizationPanelProps {
  onBack?: () => void;
}

const SHORTCUT_LABELS: Record<string, string> = {
  hold: 'Hold Bill',
  print: 'Print Bill',
  kot: 'Generate KOT',
  kotPrint: 'KOT + Print',
  newOrder: 'New Order',
  search: 'Search Items',
  tables: 'Table Management',
  dineIn: 'Dine In Mode',
  takeaway: 'Takeaway Mode',
  delivery: 'Delivery Mode',
  orderList: 'Order Listing',
  kotList: 'KOT Listing',
  salesReport: 'Sales Report',
  itemReport: 'Item Report',
  help: 'Help / Support',
  back: 'Go Back',
};

export const UICustomizationPanel: React.FC<UICustomizationPanelProps> = ({ onBack }) => {
  const {
    config,
    updateLayout,
    toggleButton,
    reorderButtons,
    updateSingleShortcut,
    hasShortcutConflict,
    getGroupButtons,
    toggleSidebarItem,
    reorderSidebarItems,
    renameSidebarItem,
    getSortedSidebarItems,
    resetToDefault,
  } = useUICustomization();

  const [capturingShortcut, setCapturingShortcut] = useState<string | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<string>('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');

  const handleKeyCapture = useCallback((e: React.KeyboardEvent, actionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setCapturingShortcut(null);
      setCapturedKeys('');
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = e.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      if (key.startsWith('F') && key.length <= 3) {
        parts.push(key);
      } else {
        parts.push(key.toUpperCase());
      }

      const shortcutStr = parts.join('+');
      if (hasShortcutConflict(actionId, shortcutStr)) {
        toast.error(`Shortcut "${shortcutStr}" is already assigned to another action`);
        return;
      }
      updateSingleShortcut(actionId, shortcutStr);
      setCapturingShortcut(null);
      setCapturedKeys('');
      toast.success(`Shortcut set: ${shortcutStr}`);
    } else {
      setCapturedKeys(parts.join('+') + '+...');
    }
  }, [hasShortcutConflict, updateSingleShortcut]);

  const renderButtonGroup = (group: string, label: string) => {
    const buttons = getGroupButtons(group);
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <div className="space-y-1">
          {buttons.map((btn, index) => (
            <div
              key={btn.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                btn.visible ? 'bg-card border-border' : 'bg-muted/50 border-border/50 opacity-60'
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{btn.label}</p>
                <p className="text-xs text-muted-foreground">Position: {index + 1}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (index > 0) reorderButtons(group, index, index - 1); }}
                  disabled={index === 0}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (index < buttons.length - 1) reorderButtons(group, index, index + 1); }}
                  disabled={index === buttons.length - 1}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleButton(btn.id)}
                  className={cn(
                    'w-7 h-7 rounded flex items-center justify-center transition-colors',
                    btn.visible ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  )}
                >
                  {btn.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sidebarItems = getSortedSidebarItems();

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Customize Software
          </h1>
          <p className="text-sm text-muted-foreground">Full UI builder — rearrange, hide, rename anything</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { resetToDefault(); toast.success('Reset to defaults'); }} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </Button>
      </div>

      <Tabs defaultValue="sidebar" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="sidebar" className="gap-1.5 text-xs sm:text-sm">
            <Menu className="w-3.5 h-3.5" />
            Sidebar
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-1.5 text-xs sm:text-sm">
            <Layout className="w-3.5 h-3.5" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="buttons" className="gap-1.5 text-xs sm:text-sm">
            <ToggleLeft className="w-3.5 h-3.5" />
            Buttons
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-1.5 text-xs sm:text-sm">
            <Keyboard className="w-3.5 h-3.5" />
            Shortcuts
          </TabsTrigger>
        </TabsList>

        {/* SIDEBAR TAB */}
        <TabsContent value="sidebar" className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-primary font-medium">🔧 Reorder, rename, or hide sidebar menu items. Changes apply immediately.</p>
          </div>
          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  item.visible ? 'bg-card border-border' : 'bg-muted/50 border-border/50 opacity-60'
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  {editingLabel === item.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameSidebarItem(item.id, editLabelValue);
                            setEditingLabel(null);
                            toast.success('Label updated');
                          }
                          if (e.key === 'Escape') setEditingLabel(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        renameSidebarItem(item.id, editLabelValue);
                        setEditingLabel(null);
                        toast.success('Label updated');
                      }}>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <button
                        onClick={() => { setEditingLabel(item.id); setEditLabelValue(item.label); }}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">{item.path}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setEditingLabel(item.id); setEditLabelValue(item.label); }}
                    className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { if (index > 0) reorderSidebarItems(index, index - 1); }}
                    disabled={index === 0}
                    className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (index < sidebarItems.length - 1) reorderSidebarItems(index, index + 1); }}
                    disabled={index === sidebarItems.length - 1}
                    className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSidebarItem(item.id)}
                    className={cn(
                      'w-7 h-7 rounded flex items-center justify-center transition-colors',
                      item.visible ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    )}
                  >
                    {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* LAYOUT TAB */}
        <TabsContent value="layout" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Menu Panel Position</Label>
              <Select value={config.layout.menuPosition} onValueChange={(v) => updateLayout({ menuPosition: v as 'left' | 'right' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left Side</SelectItem>
                  <SelectItem value="right">Right Side</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order Panel Position</Label>
              <Select value={config.layout.orderPanelPosition} onValueChange={(v) => updateLayout({ orderPanelPosition: v as 'left' | 'right' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left Side</SelectItem>
                  <SelectItem value="right">Right Side</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Menu Grid Columns</Label>
              <Select value={String(config.layout.menuGridCols)} onValueChange={(v) => updateLayout({ menuGridCols: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} Columns</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category Bar Position</Label>
              <Select value={config.layout.categoryPosition} onValueChange={(v) => updateLayout({ categoryPosition: v as 'left' | 'top' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left Sidebar</SelectItem>
                  <SelectItem value="top">Top Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Show Menu Images</Label>
              <p className="text-xs text-muted-foreground">Display product images in menu grid</p>
            </div>
            <Switch checked={config.layout.showImages} onCheckedChange={(v) => updateLayout({ showImages: v })} />
          </div>
        </TabsContent>

        {/* BUTTONS TAB */}
        <TabsContent value="buttons" className="space-y-6">
          {renderButtonGroup('cart_actions', '🛒 Cart & Action Buttons')}
          {renderButtonGroup('payment_actions', '💳 Payment Method Buttons')}
        </TabsContent>

        {/* SHORTCUTS TAB */}
        <TabsContent value="shortcuts" className="space-y-3">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-primary font-medium">⌨️ Click "Record" then press your desired key combo. Press Escape to cancel.</p>
          </div>
          {Object.entries(SHORTCUT_LABELS).map(([actionId, label]) => {
            const currentShortcut = config.shortcuts[actionId] || DEFAULT_SHORTCUTS[actionId] || '';
            const isCapturing = capturingShortcut === actionId;

            return (
              <div key={actionId} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                </div>
                {isCapturing ? (
                  <div
                    className="px-3 py-1.5 rounded-md border-2 border-primary bg-primary/10 text-sm font-mono min-w-[120px] text-center animate-pulse"
                    tabIndex={0}
                    autoFocus
                    onKeyDown={(e) => handleKeyCapture(e, actionId)}
                    onBlur={() => { setCapturingShortcut(null); setCapturedKeys(''); }}
                  >
                    {capturedKeys || 'Press keys...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">{currentShortcut}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setCapturingShortcut(actionId)}
                    >
                      Record
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};
