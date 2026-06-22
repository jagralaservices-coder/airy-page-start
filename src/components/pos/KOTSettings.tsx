import React, { useState, useEffect } from 'react';
import { FileText, Save, Clock, Hash, User, MessageSquare, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface KOTSettingsData {
  showItemNotes: boolean;
  showTableNumber: boolean;
  showOrderTime: boolean;
  showOrderNumber: boolean;
  showWaiterName: boolean;
  showCategory: boolean;
  printOnNewOrder: boolean;
  printOnModify: boolean;
  kotCopies: number;
  fontSize: 'small' | 'medium' | 'large';
  paperSize: '58mm' | '80mm';
}

interface KOTSettingsProps {
  onClose?: () => void;
}

export const KOTSettings: React.FC<KOTSettingsProps> = ({ onClose }) => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [settings, setSettings] = useState<KOTSettingsData>({
    showItemNotes: true,
    showTableNumber: true,
    showOrderTime: true,
    showOrderNumber: true,
    showWaiterName: false,
    showCategory: true,
    printOnNewOrder: true,
    printOnModify: false,
    kotCopies: 1,
    fontSize: 'medium',
    paperSize: '80mm'
  });

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<KOTSettingsData>('pos_kot_settings');
    if (saved) {
      setSettings(prev => ({ ...prev, ...saved }));
    }
  }, [isLoaded, getSetting]);

  const handleSave = () => {
    saveSetting('pos_kot_settings', settings);
    toast.success('KOT settings saved successfully');
    onClose?.();
  };

  const toggleOptions = [
    { key: 'showItemNotes', label: 'Item Notes', description: 'Show special instructions for each item', icon: MessageSquare },
    { key: 'showTableNumber', label: 'Table Number', description: 'Display table number on KOT', icon: Table },
    { key: 'showOrderTime', label: 'Order Time', description: 'Show when order was placed', icon: Clock },
    { key: 'showOrderNumber', label: 'Order Number', description: 'Display order/KOT number', icon: Hash },
    { key: 'showWaiterName', label: 'Waiter Name', description: 'Show name of staff who took order', icon: User },
    { key: 'showCategory', label: 'Category Headers', description: 'Group items by category', icon: FileText },
  ];

  const printOptions = [
    { key: 'printOnNewOrder', label: 'Print on New Order', description: 'Automatically print KOT when new order is placed' },
    { key: 'printOnModify', label: 'Print on Modify', description: 'Print updated KOT when order is modified' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">KOT Settings</h3>
          <p className="text-sm text-muted-foreground">Configure Kitchen Order Ticket appearance</p>
        </div>
      </div>

      {/* KOT Content Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">KOT Content</h4>
        {toggleOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 bg-secondary rounded-lg"
          >
            <div className="flex items-center gap-3">
              <option.icon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, [option.key]: !prev[option.key as keyof KOTSettingsData] }))}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                settings[option.key as keyof KOTSettingsData] ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  settings[option.key as keyof KOTSettingsData] ? 'right-1' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Print Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Print Behavior</h4>
        {printOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 bg-secondary rounded-lg"
          >
            <div>
              <p className="font-medium text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, [option.key]: !prev[option.key as keyof KOTSettingsData] }))}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                settings[option.key as keyof KOTSettingsData] ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  settings[option.key as keyof KOTSettingsData] ? 'right-1' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Print Format</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Number of Copies</label>
            <select
              value={settings.kotCopies}
              onChange={(e) => setSettings(prev => ({ ...prev, kotCopies: Number(e.target.value) }))}
              className="pos-input"
            >
              <option value={1}>1 Copy</option>
              <option value={2}>2 Copies</option>
              <option value={3}>3 Copies</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Font Size</label>
            <select
              value={settings.fontSize}
              onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value as 'small' | 'medium' | 'large' }))}
              className="pos-input"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Paper Size</label>
            <select
              value={settings.paperSize}
              onChange={(e) => setSettings(prev => ({ ...prev, paperSize: e.target.value as '58mm' | '80mm' }))}
              className="pos-input"
            >
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full pos-btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        Save KOT Settings
      </button>
    </div>
  );
};