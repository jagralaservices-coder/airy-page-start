import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Globe, 
  Printer,
  Bell,
  Shield,
  Palette,
  CreditCard,
  Users,
  Plus,
  Trash2,
  Wifi,
  Usb,
  FileText,
  Sun,
  Moon,
  Lock,
  Key,
  Smartphone,
  Banknote,
  QrCode,
  TestTube2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { testPrint } from '@/lib/printUtils';
import { usePOS } from '@/contexts/POSContext';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

interface PrinterConfig {
  id: string;
  name: string;
  type: 'kot' | 'bill';
  connectionType: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: string;
  isDefault: boolean;
  directPrint: boolean;
}

interface PrintSettings {
  enableDirectPrint: boolean;
  printDelay: number;
  autoPrintOnComplete: boolean;
}

interface BillSettings {
  showHeader: boolean;
  showFooter: boolean;
  showGST: boolean;
  showItemDetails: boolean;
  showPaymentMethod: boolean;
  showDateTime: boolean;
  showOrderNumber: boolean;
  showTableNumber: boolean;
  showQRCode: boolean;
  paperSize: '58mm' | '80mm';
  footerText: string;
}

interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SettingSection[] = [
  { id: 'store', label: 'Store Details', icon: Store },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'printer', label: 'Printer Settings', icon: Printer },
  { id: 'billSettings', label: 'Bill Settings', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'subscription', label: 'Subscription', icon: Users },
];

export const SettingsPage: React.FC = () => {
  const { taxPercent, setTaxPercent, activeStore, updateStore } = usePOS();
  const [activeSection, setActiveSection] = useState('store');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [storeDetails, setStoreDetails] = useState({
    name: 'MAXORA',
    address: '',
    phone: '',
    gstin: '',
    taxRate: '5'
  });
  
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [newPrinter, setNewPrinter] = useState<Partial<PrinterConfig>>({
    name: '',
    type: 'bill',
    connectionType: 'usb',
    ipAddress: '',
    port: '9100',
    isDefault: false,
    directPrint: true
  });

  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    enableDirectPrint: true,
    printDelay: 500,
    autoPrintOnComplete: false
  });
  
  const [billSettings, setBillSettings] = useState<BillSettings>({
    showHeader: true,
    showFooter: true,
    showGST: true,
    showItemDetails: true,
    showPaymentMethod: true,
    showDateTime: true,
    showOrderNumber: true,
    showTableNumber: true,
    showQRCode: false,
    paperSize: '80mm',
    footerText: 'Thank you for visiting!'
  });

  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    lowStockAlerts: true,
    staffAttendance: true,
    dailyReport: false,
    soundEnabled: true,
    autoAcceptOnlineOrders: false,
  });

  const [security, setSecurity] = useState({
    requirePin: false,
    pin: '',
    autoLock: false,
    lockTimeout: '5',
  });

  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    card: true,
    upi: true,
    split: true,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedStore = localStorage.getItem('pos_store_details');
    const savedPrinters = localStorage.getItem('pos_printers');
    const savedBillSettings = localStorage.getItem('pos_bill_settings');
    const savedTheme = localStorage.getItem('pos_theme') as 'light' | 'dark' | null;
    const savedNotifications = localStorage.getItem('pos_notifications');
    const savedSecurity = localStorage.getItem('pos_security');
    const savedPayments = localStorage.getItem('pos_payment_methods');
    const savedPrintSettings = localStorage.getItem('pos_print_settings');
    
    if (savedStore) setStoreDetails(JSON.parse(savedStore));
    if (savedPrinters) setPrinters(JSON.parse(savedPrinters));
    if (savedBillSettings) setBillSettings(JSON.parse(savedBillSettings));
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedSecurity) setSecurity(JSON.parse(savedSecurity));
    if (savedPayments) setPaymentMethods(JSON.parse(savedPayments));
    if (savedPrintSettings) setPrintSettings(JSON.parse(savedPrintSettings));
  }, []);

  // Sync taxRate with POSContext taxPercent
  useEffect(() => {
    setStoreDetails(prev => ({
      ...prev,
      taxRate: String(taxPercent)
    }));
  }, [taxPercent]);

  // Toggle theme
  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('pos_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  };

  // Save store details
  const saveStoreDetails = () => {
    localStorage.setItem('pos_store_details', JSON.stringify(storeDetails));
    const newTax = Number(storeDetails.taxRate) || 0;
    setTaxPercent(newTax);
    if (activeStore) {
      updateStore(activeStore.id, {
        taxPercentage: newTax
      });
    }
    toast.success('Store details saved!');
  };

  // Save bill settings
  const saveBillSettings = () => {
    localStorage.setItem('pos_bill_settings', JSON.stringify(billSettings));
    toast.success('Bill settings saved!');
  };

  // Save notifications
  const saveNotifications = () => {
    localStorage.setItem('pos_notifications', JSON.stringify(notifications));
    toast.success('Notification settings saved!');
  };

  // Save security
  const saveSecurity = () => {
    localStorage.setItem('pos_security', JSON.stringify(security));
    toast.success('Security settings saved!');
  };

  // Save payment methods
  const savePaymentMethods = () => {
    localStorage.setItem('pos_payment_methods', JSON.stringify(paymentMethods));
    toast.success('Payment methods saved!');
  };

  // Save print settings
  const savePrintSettings = () => {
    localStorage.setItem('pos_print_settings', JSON.stringify(printSettings));
    toast.success('Print settings saved!');
  };

  // Add new printer
  const addPrinter = () => {
    if (!newPrinter.name) {
      toast.error('Please enter printer name');
      return;
    }
    
    const printer: PrinterConfig = {
      id: Date.now().toString(),
      name: newPrinter.name,
      type: newPrinter.type || 'bill',
      connectionType: newPrinter.connectionType || 'usb',
      ipAddress: newPrinter.ipAddress,
      port: newPrinter.port,
      isDefault: printers.length === 0,
      directPrint: newPrinter.directPrint !== false
    };
    
    const updatedPrinters = [...printers, printer];
    setPrinters(updatedPrinters);
    localStorage.setItem('pos_printers', JSON.stringify(updatedPrinters));
    setShowAddPrinter(false);
    setNewPrinter({ name: '', type: 'bill', connectionType: 'usb', ipAddress: '', port: '9100', isDefault: false, directPrint: true });
    toast.success('Printer added successfully!');
  };

  // Delete printer
  const deletePrinter = (id: string) => {
    const updatedPrinters = printers.filter(p => p.id !== id);
    setPrinters(updatedPrinters);
    localStorage.setItem('pos_printers', JSON.stringify(updatedPrinters));
    toast.success('Printer removed');
  };

  // Set default printer
  const setDefaultPrinter = (id: string, type: 'kot' | 'bill') => {
    const updatedPrinters = printers.map(p => ({
      ...p,
      isDefault: p.type === type ? p.id === id : p.isDefault
    }));
    setPrinters(updatedPrinters);
    localStorage.setItem('pos_printers', JSON.stringify(updatedPrinters));
    toast.success('Default printer updated');
  };

  // Test printer
  const testPrinter = (printer: PrinterConfig) => {
    toast.success(`Test print sent to ${printer.name}`, {
      description: 'Check your printer for the test page'
    });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'store':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Store Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeDetails.name}
                    onChange={(e) => setStoreDetails({ ...storeDetails, name: e.target.value })}
                    className="pos-input"
                    placeholder="Your restaurant name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Address</label>
                  <textarea
                    value={storeDetails.address}
                    onChange={(e) => setStoreDetails({ ...storeDetails, address: e.target.value })}
                    className="pos-input min-h-[80px]"
                    placeholder="Full address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                    <input
                      type="tel"
                      value={storeDetails.phone}
                      onChange={(e) => setStoreDetails({ ...storeDetails, phone: e.target.value })}
                      className="pos-input"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={storeDetails.gstin}
                      onChange={(e) => setStoreDetails({ ...storeDetails, gstin: e.target.value })}
                      className="pos-input"
                      placeholder="GST Number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={storeDetails.taxRate}
                    onChange={(e) => setStoreDetails({ ...storeDetails, taxRate: e.target.value })}
                    className="pos-input w-32"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
            <button onClick={saveStoreDetails} className="pos-btn-primary px-6 py-2">Save Changes</button>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Select Language</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose your preferred language for the interface
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      localStorage.setItem('pos_language', lang.code);
                      toast.success(`Language changed to ${lang.name}`);
                    }}
                    className={cn(
                      'pos-card p-4 text-center transition-all',
                      selectedLanguage === lang.code
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <p className="font-semibold text-foreground">{lang.native}</p>
                    <p className="text-sm text-muted-foreground">{lang.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Theme</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose between light and dark mode
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleTheme('light')}
                  className={cn(
                    'pos-card p-6 text-center transition-all',
                    theme === 'light' ? 'border-primary bg-primary/10' : 'hover:border-primary/50'
                  )}
                >
                  <Sun className="w-12 h-12 mx-auto mb-3 text-warning" />
                  <p className="font-semibold text-foreground">Light Mode</p>
                  <p className="text-sm text-muted-foreground">Bright and clean</p>
                </button>
                <button
                  onClick={() => toggleTheme('dark')}
                  className={cn(
                    'pos-card p-6 text-center transition-all',
                    theme === 'dark' ? 'border-primary bg-primary/10' : 'hover:border-primary/50'
                  )}
                >
                  <Moon className="w-12 h-12 mx-auto mb-3 text-primary" />
                  <p className="font-semibold text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                </button>
              </div>
            </div>
          </div>
        );

      case 'printer':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Printer Configuration</h3>
                <p className="text-sm text-muted-foreground">Add and manage your printers</p>
              </div>
              <button
                onClick={() => setShowAddPrinter(true)}
                className="pos-btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Printer
              </button>
            </div>

            {/* Direct Print Settings */}
            <div className="pos-card p-4 space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Mode Settings
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Direct Print (No Dialog)</p>
                    <p className="text-xs text-muted-foreground">Print directly without showing print dialog</p>
                  </div>
                  <button
                    onClick={() => setPrintSettings({ ...printSettings, enableDirectPrint: !printSettings.enableDirectPrint })}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      printSettings.enableDirectPrint ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        printSettings.enableDirectPrint ? 'right-1' : 'left-1'
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto Print on Complete</p>
                    <p className="text-xs text-muted-foreground">Automatically print bill when order is completed</p>
                  </div>
                  <button
                    onClick={() => setPrintSettings({ ...printSettings, autoPrintOnComplete: !printSettings.autoPrintOnComplete })}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      printSettings.autoPrintOnComplete ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        printSettings.autoPrintOnComplete ? 'right-1' : 'left-1'
                      )}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Print Delay (ms)</label>
                  <select
                    value={printSettings.printDelay}
                    onChange={(e) => setPrintSettings({ ...printSettings, printDelay: Number(e.target.value) })}
                    className="pos-input w-40"
                  >
                    <option value={0}>No delay</option>
                    <option value={300}>300ms</option>
                    <option value={500}>500ms</option>
                    <option value={1000}>1 second</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={savePrintSettings} className="pos-btn-primary px-4 py-2 text-sm">Save Print Settings</button>
                <button 
                  onClick={() => testPrint()}
                  className="pos-btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                >
                  <TestTube2 className="w-4 h-4" />
                  Test Print
                </button>
              </div>
            </div>

            {showAddPrinter && (
              <div className="pos-card p-4 space-y-4 animate-slide-in-up">
                <h4 className="font-medium text-foreground">Add New Printer</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Printer Name</label>
                    <input
                      type="text"
                      value={newPrinter.name}
                      onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                      className="pos-input"
                      placeholder="e.g., Kitchen Printer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Printer Type</label>
                    <select
                      value={newPrinter.type}
                      onChange={(e) => setNewPrinter({ ...newPrinter, type: e.target.value as 'kot' | 'bill' })}
                      className="pos-input"
                    >
                      <option value="bill">Bill Printer</option>
                      <option value="kot">KOT Printer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Connection Type</label>
                    <select
                      value={newPrinter.connectionType}
                      onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value as 'usb' | 'network' | 'bluetooth' })}
                      className="pos-input"
                    >
                      <option value="usb">USB</option>
                      <option value="network">Network (WiFi/LAN)</option>
                      <option value="bluetooth">Bluetooth</option>
                    </select>
                  </div>
                  {newPrinter.connectionType === 'network' && (
                    <>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">IP Address</label>
                        <input
                          type="text"
                          value={newPrinter.ipAddress}
                          onChange={(e) => setNewPrinter({ ...newPrinter, ipAddress: e.target.value })}
                          className="pos-input"
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">Port</label>
                        <input
                          type="text"
                          value={newPrinter.port}
                          onChange={(e) => setNewPrinter({ ...newPrinter, port: e.target.value })}
                          className="pos-input"
                          placeholder="9100"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={addPrinter} className="pos-btn-primary px-4 py-2">Add Printer</button>
                  <button onClick={() => setShowAddPrinter(false)} className="pos-btn-secondary px-4 py-2">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {printers.length === 0 ? (
                <div className="pos-card p-8 text-center">
                  <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No printers configured</p>
                  <p className="text-sm text-muted-foreground">Add a printer to start printing bills and KOTs</p>
                </div>
              ) : (
                printers.map((printer) => (
                  <div key={printer.id} className="pos-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          printer.type === 'kot' ? 'bg-warning/20' : 'bg-primary/20'
                        )}>
                          <Printer className={cn(
                            'w-5 h-5',
                            printer.type === 'kot' ? 'text-warning' : 'text-primary'
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{printer.name}</p>
                            {printer.isDefault && (
                              <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">Default</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{printer.type} Printer</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {printer.connectionType === 'network' ? <Wifi className="w-3 h-3" /> : <Usb className="w-3 h-3" />}
                              {printer.connectionType}
                            </span>
                            {printer.ipAddress && <span>• {printer.ipAddress}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => testPrinter(printer)} className="pos-btn-secondary px-3 py-1.5 text-sm">Test</button>
                        {!printer.isDefault && (
                          <button onClick={() => setDefaultPrinter(printer.id, printer.type)} className="pos-btn-secondary px-3 py-1.5 text-sm">Set Default</button>
                        )}
                        <button onClick={() => deletePrinter(printer.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'billSettings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Bill Print Settings</h3>
              <p className="text-sm text-muted-foreground mb-6">Configure what appears on your printed bills</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Paper Size</label>
              <div className="flex gap-3">
                {['58mm', '80mm'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setBillSettings({ ...billSettings, paperSize: size as '58mm' | '80mm' })}
                    className={cn(
                      'px-4 py-2 rounded-lg border transition-all',
                      billSettings.paperSize === size
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Bill Content</h4>
              {[
                { key: 'showHeader', label: 'Show Store Header' },
                { key: 'showOrderNumber', label: 'Show Order Number' },
                { key: 'showDateTime', label: 'Show Date & Time' },
                { key: 'showTableNumber', label: 'Show Table Number' },
                { key: 'showItemDetails', label: 'Show Item Details' },
                { key: 'showGST', label: 'Show GST/Tax' },
                { key: 'showPaymentMethod', label: 'Show Payment Method' },
                { key: 'showQRCode', label: 'Show QR Code' },
                { key: 'showFooter', label: 'Show Footer' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-foreground">{label}</span>
                  <button
                    onClick={() => setBillSettings({ ...billSettings, [key]: !billSettings[key as keyof BillSettings] })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-all relative',
                      billSettings[key as keyof BillSettings] ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      billSettings[key as keyof BillSettings] ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Footer Message</label>
              <input
                type="text"
                value={billSettings.footerText}
                onChange={(e) => setBillSettings({ ...billSettings, footerText: e.target.value })}
                className="pos-input"
                placeholder="Thank you for visiting!"
              />
            </div>

            <button onClick={saveBillSettings} className="pos-btn-primary px-6 py-2">Save Bill Settings</button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h3>
              <div className="space-y-3">
                {[
                  { key: 'orderAlerts', label: 'New Order Alerts', icon: Bell },
                  { key: 'lowStockAlerts', label: 'Low Stock Alerts', icon: Bell },
                  { key: 'staffAttendance', label: 'Staff Attendance', icon: Users },
                  { key: 'dailyReport', label: 'Daily Reports', icon: FileText },
                  { key: 'soundEnabled', label: 'Sound Notifications', icon: Bell },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{label}</span>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [key]: !notifications[key as keyof typeof notifications] })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-all relative',
                        notifications[key as keyof typeof notifications] ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        notifications[key as keyof typeof notifications] ? 'left-7' : 'left-1'
                      )} />
                    </button>
                  </div>
                ))}

                {/* Auto Accept Online Orders */}
                <div className="flex items-center justify-between py-3 border-b border-border mt-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Auto Accept Online Orders</p>
                      <p className="text-xs text-muted-foreground">Automatically accept Swiggy/Zomato orders within 5 seconds</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, autoAcceptOnlineOrders: !notifications.autoAcceptOnlineOrders })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-all relative',
                      notifications.autoAcceptOnlineOrders ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      notifications.autoAcceptOnlineOrders ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={saveNotifications} className="pos-btn-primary px-6 py-2">Save Notifications</button>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Require PIN</p>
                      <p className="text-sm text-muted-foreground">Ask for PIN before actions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSecurity({ ...security, requirePin: !security.requirePin })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-all relative',
                      security.requirePin ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      security.requirePin ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {security.requirePin && (
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Set PIN (4 digits)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={security.pin}
                      onChange={(e) => setSecurity({ ...security, pin: e.target.value.replace(/\D/g, '') })}
                      className="pos-input w-32"
                      placeholder="****"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Auto Lock</p>
                      <p className="text-sm text-muted-foreground">Lock after inactivity</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSecurity({ ...security, autoLock: !security.autoLock })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-all relative',
                      security.autoLock ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      security.autoLock ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {security.autoLock && (
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Lock Timeout (minutes)</label>
                    <select
                      value={security.lockTimeout}
                      onChange={(e) => setSecurity({ ...security, lockTimeout: e.target.value })}
                      className="pos-input w-32"
                    >
                      <option value="1">1 min</option>
                      <option value="5">5 min</option>
                      <option value="10">10 min</option>
                      <option value="15">15 min</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            <button onClick={saveSecurity} className="pos-btn-primary px-6 py-2">Save Security</button>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Methods</h3>
              <p className="text-sm text-muted-foreground mb-4">Enable or disable payment options</p>
              <div className="space-y-3">
                {[
                  { key: 'cash', label: 'Cash', icon: Banknote },
                  { key: 'card', label: 'Card', icon: CreditCard },
                  { key: 'upi', label: 'UPI', icon: QrCode },
                  { key: 'split', label: 'Split Payment', icon: Smartphone },
                  { key: 'due', label: 'Due Payment', icon: Clock },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{label}</span>
                    </div>
                    <button
                      onClick={() => setPaymentMethods({ ...paymentMethods, [key]: !paymentMethods[key as keyof typeof paymentMethods] })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-all relative',
                        paymentMethods[key as keyof typeof paymentMethods] ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        paymentMethods[key as keyof typeof paymentMethods] ? 'left-7' : 'left-1'
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={savePaymentMethods} className="pos-btn-primary px-6 py-2">Save Payment Methods</button>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Current Plan</h3>
              <div className="pos-card p-6 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">Free Trial</p>
                    <p className="text-muted-foreground">14 days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Expires on</p>
                    <p className="font-medium text-foreground">Jan 15, 2025</p>
                  </div>
                </div>
                <button className="w-full pos-btn-primary py-3">Upgrade to Pro</button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Available Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="pos-card p-5">
                  <h4 className="font-bold text-foreground mb-2">Basic</h4>
                  <p className="text-2xl font-bold text-primary mb-4">₹999<span className="text-sm text-muted-foreground">/month</span></p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>✓ 1 Store</li>
                    <li>✓ 5 Staff</li>
                    <li>✓ Basic Support</li>
                  </ul>
                </div>
                <div className="pos-card p-5 border-primary">
                  <h4 className="font-bold text-foreground mb-2">Pro</h4>
                  <p className="text-2xl font-bold text-primary mb-4">₹2,499<span className="text-sm text-muted-foreground">/month</span></p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>✓ 3 Stores</li>
                    <li>✓ Unlimited Staff</li>
                    <li>✓ Priority Support</li>
                  </ul>
                </div>
                <div className="pos-card p-5">
                  <h4 className="font-bold text-foreground mb-2">Enterprise</h4>
                  <p className="text-2xl font-bold text-primary mb-4">Custom</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>✓ Unlimited Stores</li>
                    <li>✓ 24/7 Support</li>
                    <li>✓ Custom Features</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your POS system</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 pos-card p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};