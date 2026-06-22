import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  Settings, 
  Store, 
  Users, 
  Eye, 
  Shield, 
  Building,
  FileText,
  BarChart3,
  Package,
  Wallet,
  Truck,
  MessageCircle,
  ChefHat,
  Radio,
  Save,
  Globe,
  CreditCard,
  Bell,
  ScrollText,
  Coins,
  Brain,
  TrendingUp,
  Gauge,
  Code,
  Calculator,
  LineChart,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  Layers,
  MapPin,
  Clock,
  Fingerprint,
  Camera,
  Bike,
  Search,
  QrCode,
  Printer,
  LayoutGrid,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  CalendarDays,
  ClipboardList,
  DollarSign,
  PieChart,
  ListOrdered,
  Grid3X3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ServiceToggles {
  // Core Modules
  dashboard: boolean;
  pos: boolean;
  orders: boolean;
  menu: boolean;
  tables: boolean;
  inventory: boolean;
  expenses: boolean;
  pickup: boolean;

  // Staff & HR
  staff: boolean;
  staffAttendance: boolean;
  staffSchedule: boolean;
  leaveManagement: boolean;
  advanceRequests: boolean;
  staffNotifications: boolean;
  faceVerification: boolean;
  staffPortal: boolean;

  // Customer
  customers: boolean;
  customerNotifications: boolean;

  // Delivery & Online
  delivery: boolean;
  deliveryBoys: boolean;
  onlineOrders: boolean;

  // Kitchen & Dining
  kitchen: boolean;
  kot: boolean;
  liveView: boolean;
  dineIn: boolean;

  // Reports
  reports: boolean;
  salesSummary: boolean;
  executiveSales: boolean;
  orderSummary: boolean;
  itemSummary: boolean;
  categorySummary: boolean;
  groupSummary: boolean;
  employeeSummary: boolean;
  counterSummary: boolean;
  coverSizeSummary: boolean;
  variationSummary: boolean;
  tipSummary: boolean;
  dailySalesReport: boolean;
  overtimeReport: boolean;
  attendanceReports: boolean;
  workforceAnalytics: boolean;

  // Payment & Finance
  duePayments: boolean;
  cashManagement: boolean;

  // Communication
  chat: boolean;

  // Strategic / Admin
  executiveDashboard: boolean;
  aiControlCenter: boolean;
  dynamicPricing: boolean;
  apiManagement: boolean;
  taxEngine: boolean;
  revenueForecast: boolean;
  compliance: boolean;
  purchaseOrders: boolean;

  // Store Management
  multiStore: boolean;
  storeLocation: boolean;

  // Billing Features
  gstVatBilling: boolean;
  barcodeScanner: boolean;
  billPrinting: boolean;
  splitBill: boolean;
  discounts: boolean;
  itemOnOff: boolean;
  searchBill: boolean;
  bulkMenuUpload: boolean;
  bulkInventoryUpload: boolean;

  // Settings Sub-features
  displaySettings: boolean;
  calculationsSettings: boolean;
  linkedServices: boolean;
  printSettings: boolean;
  customerSettings: boolean;
  onlineOrderConfig: boolean;
  billingSystem: boolean;
  localeSettings: boolean;
  tableSettings: boolean;
  feedbackSettings: boolean;
  staffShifts: boolean;
}

interface StoreIdSettings {
  showStoreCode: boolean;
  allowStoreLogin: boolean;
  requirePinForAccess: boolean;
  autoLogoutMinutes: number;
  allowMultipleSessions: boolean;
}

const defaultServiceToggles: ServiceToggles = {
  dashboard: true, pos: true, orders: true, menu: true, tables: true,
  inventory: true, expenses: true, pickup: true,
  staff: true, staffAttendance: true, staffSchedule: true, leaveManagement: true,
  advanceRequests: true, staffNotifications: true, faceVerification: true, staffPortal: true,
  customers: true, customerNotifications: true,
  delivery: true, deliveryBoys: true, onlineOrders: true,
  kitchen: true, kot: true, liveView: true, dineIn: true,
  reports: true, salesSummary: true, executiveSales: true, orderSummary: true,
  itemSummary: true, categorySummary: true, groupSummary: true, employeeSummary: true,
  counterSummary: true, coverSizeSummary: true, variationSummary: true, tipSummary: true,
  dailySalesReport: true, overtimeReport: true, attendanceReports: true, workforceAnalytics: true,
  duePayments: true, cashManagement: true,
  chat: true,
  executiveDashboard: true, aiControlCenter: true, dynamicPricing: true,
  apiManagement: true, taxEngine: true, revenueForecast: true, compliance: true, purchaseOrders: true,
  multiStore: true, storeLocation: true,
  gstVatBilling: true, barcodeScanner: true, billPrinting: true, splitBill: true,
  discounts: true, itemOnOff: true, searchBill: true, bulkMenuUpload: true, bulkInventoryUpload: true,
  displaySettings: true, calculationsSettings: true, linkedServices: true, printSettings: true,
  customerSettings: true, onlineOrderConfig: true, billingSystem: true, localeSettings: true,
  tableSettings: true, feedbackSettings: true, staffShifts: true,
};

const defaultStoreSettings: StoreIdSettings = {
  showStoreCode: true,
  allowStoreLogin: true,
  requirePinForAccess: false,
  autoLogoutMinutes: 30,
  allowMultipleSessions: false,
};

interface ServiceItem {
  key: keyof ServiceToggles;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface ServiceSection {
  title: string;
  icon: React.ElementType;
  items: ServiceItem[];
}

export const AdminOwnerSettings: React.FC = () => {
  const { t } = useLocale();
  const [serviceToggles, setServiceToggles] = useState<ServiceToggles>(defaultServiceToggles);
  const [storeSettings, setStoreSettings] = useState<StoreIdSettings>(defaultStoreSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_service_toggles');
    const savedStore = localStorage.getItem('admin_store_settings');
    // Also load legacy format
    const savedLegacy = localStorage.getItem('admin_page_visibility');
    
    if (saved) {
      try { setServiceToggles({ ...defaultServiceToggles, ...JSON.parse(saved) }); } catch {}
    } else if (savedLegacy) {
      try { setServiceToggles({ ...defaultServiceToggles, ...JSON.parse(savedLegacy) }); } catch {}
    }
    if (savedStore) {
      try { setStoreSettings(JSON.parse(savedStore)); } catch {}
    }
  }, []);

  const handleToggle = (key: keyof ServiceToggles, value: boolean) => {
    setServiceToggles(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleStoreSettingChange = (setting: keyof StoreIdSettings, value: boolean | number) => {
    setStoreSettings(prev => ({ ...prev, [setting]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('admin_service_toggles', JSON.stringify(serviceToggles));
    localStorage.setItem('admin_page_visibility', JSON.stringify(serviceToggles)); // backward compat
    localStorage.setItem('admin_store_settings', JSON.stringify(storeSettings));
    setHasChanges(false);
    toast.success('Settings saved successfully!');
  };

  const handleEnableAll = () => {
    const allOn = { ...defaultServiceToggles };
    setServiceToggles(allOn);
    setHasChanges(true);
  };

  const handleDisableAll = () => {
    const allOff = Object.fromEntries(
      Object.keys(defaultServiceToggles).map(k => [k, false])
    ) as unknown as ServiceToggles;
    // Keep core ones on
    allOff.pos = true;
    allOff.dashboard = true;
    setServiceToggles(allOff);
    setHasChanges(true);
  };

  const serviceSections: ServiceSection[] = [
    {
      title: 'Core Modules',
      icon: LayoutGrid,
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Main analytics dashboard' },
        { key: 'pos', label: 'POS Billing', icon: ShoppingCart, description: 'Point of sale billing screen' },
        { key: 'orders', label: 'Orders', icon: Receipt, description: 'Order management & history' },
        { key: 'menu', label: 'Menu Management', icon: Package, description: 'Menu items, categories & pricing' },
        { key: 'tables', label: 'Table Management', icon: UtensilsCrossed, description: 'Table layout & reservations' },
        { key: 'inventory', label: 'Inventory', icon: Package, description: 'Stock tracking & management' },
        { key: 'expenses', label: 'Expense Tracker', icon: Wallet, description: 'Track business expenses' },
        { key: 'pickup', label: 'Takeaway/Pickup', icon: Package, description: 'Takeaway order management' },
      ]
    },
    {
      title: 'Staff & HR',
      icon: Users,
      items: [
        { key: 'staff', label: 'Staff Management', icon: Users, description: 'Manage staff accounts & roles' },
        { key: 'staffAttendance', label: 'Staff Attendance', icon: UserCheck, description: 'Check-in/out tracking' },
        { key: 'staffSchedule', label: 'Staff Schedule', icon: CalendarDays, description: 'Shift scheduling' },
        { key: 'leaveManagement', label: 'Leave Management', icon: CalendarDays, description: 'Leave requests & approvals' },
        { key: 'advanceRequests', label: 'Advance Requests', icon: DollarSign, description: 'Salary advance requests' },
        { key: 'staffNotifications', label: 'Staff Notifications', icon: Bell, description: 'Notifications for staff' },
        { key: 'faceVerification', label: 'Face Verification', icon: Camera, description: 'Biometric face check-in' },
        { key: 'staffPortal', label: 'Staff Portal', icon: Users, description: 'Self-service staff portal' },
        { key: 'staffShifts', label: 'Staff Working Hours', icon: Clock, description: 'Configure shift timings' },
      ]
    },
    {
      title: 'Customer Management',
      icon: Users,
      items: [
        { key: 'customers', label: 'Customer Database', icon: Users, description: 'Customer records & info' },
        { key: 'customerNotifications', label: 'Customer Notifications', icon: MessageSquare, description: 'Payment & order alerts' },
      ]
    },
    {
      title: 'Delivery & Online',
      icon: Truck,
      items: [
        { key: 'delivery', label: 'Delivery Management', icon: Truck, description: 'Delivery order tracking' },
        { key: 'deliveryBoys', label: 'Delivery Boys', icon: Bike, description: 'Delivery personnel management' },
        { key: 'onlineOrders', label: 'Online Orders (Swiggy/Zomato)', icon: Globe, description: 'Third-party order integration' },
      ]
    },
    {
      title: 'Kitchen & Dining',
      icon: ChefHat,
      items: [
        { key: 'kitchen', label: 'Kitchen Display', icon: ChefHat, description: 'Kitchen order display screen' },
        { key: 'kot', label: 'KOT (Kitchen Order Tickets)', icon: FileText, description: 'Print kitchen order tickets' },
        
        { key: 'dineIn', label: 'Dine-In Mode', icon: UtensilsCrossed, description: 'Dine-in order management' },
      ]
    },
    {
      title: 'Reports & Analytics',
      icon: BarChart3,
      items: [
        { key: 'reports', label: 'Reports (Master)', icon: BarChart3, description: 'Enable/disable all reports' },
        { key: 'salesSummary', label: 'Sales Summary', icon: DollarSign, description: 'Daily/weekly/monthly sales' },
        { key: 'executiveSales', label: 'Executive Sales', icon: PieChart, description: 'Executive-level sales view' },
        { key: 'orderSummary', label: 'Order Summary', icon: ListOrdered, description: 'Order analytics' },
        { key: 'itemSummary', label: 'Item Summary', icon: Package, description: 'Item-wise sales breakdown' },
        { key: 'categorySummary', label: 'Category Summary', icon: Grid3X3, description: 'Category-wise analytics' },
        { key: 'groupSummary', label: 'Group Summary', icon: Layers, description: 'Group-wise breakdown' },
        { key: 'employeeSummary', label: 'Employee Summary', icon: Users, description: 'Staff performance report' },
        { key: 'counterSummary', label: 'Counter Summary', icon: Receipt, description: 'Counter-wise sales' },
        { key: 'coverSizeSummary', label: 'Cover Size Summary', icon: FileText, description: 'Cover analytics' },
        { key: 'variationSummary', label: 'Variation Summary', icon: Layers, description: 'Variation-wise sales' },
        { key: 'tipSummary', label: 'Tip Summary', icon: Coins, description: 'Tip collection report' },
        { key: 'dailySalesReport', label: 'Daily Sales Report', icon: BarChart3, description: 'End-of-day report' },
        { key: 'overtimeReport', label: 'Overtime Report', icon: Clock, description: 'Staff overtime tracking' },
        { key: 'attendanceReports', label: 'Attendance Reports', icon: UserCheck, description: 'Attendance analytics' },
        { key: 'workforceAnalytics', label: 'Workforce Analytics', icon: PieChart, description: 'HR analytics dashboard' },
      ]
    },
    {
      title: 'Payment & Finance',
      icon: CreditCard,
      items: [
        { key: 'duePayments', label: 'Due Payments', icon: AlertTriangle, description: 'Credit & due tracking' },
        { key: 'cashManagement', label: 'Cash Management', icon: Wallet, description: 'Cash drawer & withdrawals' },
      ]
    },
    {
      title: 'Communication',
      icon: MessageCircle,
      items: [
        { key: 'chat', label: 'Team Chat', icon: MessageCircle, description: 'Internal team messaging' },
      ]
    },
    {
      title: 'Strategic & Admin Tools',
      icon: Brain,
      items: [
        { key: 'executiveDashboard', label: 'Executive Dashboard', icon: Gauge, description: 'High-level business metrics' },
        { key: 'aiControlCenter', label: 'AI Control Center', icon: Brain, description: 'AI-powered automation' },
        { key: 'dynamicPricing', label: 'Dynamic Pricing', icon: TrendingUp, description: 'Price optimization' },
        { key: 'apiManagement', label: 'API Management', icon: Code, description: 'API keys & webhooks' },
        { key: 'taxEngine', label: 'Tax Engine', icon: Calculator, description: 'Tax rules configuration' },
        { key: 'revenueForecast', label: 'Revenue Forecast', icon: LineChart, description: 'Predictive analytics' },
        { key: 'compliance', label: 'Compliance Dashboard', icon: Shield, description: 'Regulatory compliance' },
        { key: 'purchaseOrders', label: 'Purchase Orders', icon: ClipboardList, description: 'Purchase order management' },
      ]
    },
    {
      title: 'Store Management',
      icon: Store,
      items: [
        { key: 'multiStore', label: 'Multi-Store Management', icon: Building, description: 'Manage multiple stores' },
        { key: 'storeLocation', label: 'Store Location', icon: MapPin, description: 'GPS & location settings' },
      ]
    },
    {
      title: 'Billing Features',
      icon: ShoppingCart,
      items: [
        { key: 'gstVatBilling', label: 'GST/VAT Billing', icon: Receipt, description: 'Tax invoice generation' },
        { key: 'barcodeScanner', label: 'Barcode Scanner', icon: QrCode, description: 'Scan items by barcode' },
        { key: 'billPrinting', label: 'Bill Printing', icon: Printer, description: 'Print bills & receipts' },
        { key: 'splitBill', label: 'Split Bill', icon: Layers, description: 'Split bills between customers' },
        { key: 'discounts', label: 'Discounts', icon: DollarSign, description: 'Apply discounts on bills' },
        
        { key: 'searchBill', label: 'Search Bill', icon: Search, description: 'Search past bills' },
        { key: 'bulkMenuUpload', label: 'Bulk Menu Upload', icon: Package, description: 'Upload menu via CSV/Excel' },
        { key: 'bulkInventoryUpload', label: 'Bulk Inventory Upload', icon: Package, description: 'Upload inventory in bulk' },
      ]
    },
    {
      title: 'Settings Sub-Features',
      icon: Settings,
      items: [
        { key: 'displaySettings', label: 'Display Settings', icon: Eye, description: 'Billing screen display options' },
        { key: 'calculationsSettings', label: 'Calculations', icon: Calculator, description: 'Service charges & rounding' },
        { key: 'linkedServices', label: 'Linked Services', icon: Globe, description: 'Add-on service integrations' },
        { key: 'printSettings', label: 'Print Settings', icon: Printer, description: 'Bill & KOT print config' },
        { key: 'customerSettings', label: 'Customer Settings', icon: Users, description: 'Phone validation & dues' },
        { key: 'onlineOrderConfig', label: 'Online Order Config', icon: Globe, description: 'Auto-accept & timings' },
        { key: 'billingSystem', label: 'Billing System', icon: Settings, description: 'Central system sync' },
        { key: 'localeSettings', label: 'Language & Currency', icon: Globe, description: 'Country, language, currency' },
        { key: 'tableSettings', label: 'Table Settings', icon: LayoutGrid, description: 'Table sections & booking' },
        { key: 'feedbackSettings', label: 'Feedback', icon: MessageSquare, description: 'Customer feedback collection' },
      ]
    },
  ];

  // Filter sections by search
  const filteredSections = serviceSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const totalServices = Object.keys(defaultServiceToggles).length;
  const enabledCount = Object.values(serviceToggles).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.ownerSettings')}</h2>
          <p className="text-muted-foreground">Manage all services & modules • {enabledCount}/{totalServices} enabled</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        )}
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services" className="gap-2">
            <Eye className="w-4 h-4" />
            Service Controls
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Store className="w-4 h-4" />
            {t('admin.storeIdSettings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6 space-y-4">
          {/* Search & bulk actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleEnableAll}>Enable All</Button>
            <Button variant="outline" size="sm" onClick={handleDisableAll}>Disable All</Button>
          </div>

          {filteredSections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.title}
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    {section.items.filter(i => serviceToggles[i.key]).length}/{section.items.length} on
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        serviceToggles[item.key] ? 'bg-card border-border' : 'bg-muted/30 border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${serviceToggles[item.key] ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <Label htmlFor={item.key} className="cursor-pointer text-sm font-medium truncate block">
                            {item.label}
                          </Label>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <Switch
                        id={item.key}
                        checked={serviceToggles[item.key]}
                        onCheckedChange={(checked) => handleToggle(item.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services found</h3>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="store" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                {t('admin.storeIdSettings')}
              </CardTitle>
              <CardDescription>{t('settings.store')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">{t('auth.storeCode')}</Label>
                  <p className="text-sm text-muted-foreground">Show store code to users</p>
                </div>
                <Switch
                  checked={storeSettings.showStoreCode}
                  onCheckedChange={(checked) => handleStoreSettingChange('showStoreCode', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">{t('auth.storeLogin')}</Label>
                  <p className="text-sm text-muted-foreground">Allow store-level login</p>
                </div>
                <Switch
                  checked={storeSettings.allowStoreLogin}
                  onCheckedChange={(checked) => handleStoreSettingChange('allowStoreLogin', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Require PIN</Label>
                  <p className="text-sm text-muted-foreground">Require PIN for store access</p>
                </div>
                <Switch
                  checked={storeSettings.requirePinForAccess}
                  onCheckedChange={(checked) => handleStoreSettingChange('requirePinForAccess', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Multiple Sessions</Label>
                  <p className="text-sm text-muted-foreground">Allow login from multiple devices</p>
                </div>
                <Switch
                  checked={storeSettings.allowMultipleSessions}
                  onCheckedChange={(checked) => handleStoreSettingChange('allowMultipleSessions', checked)}
                />
              </div>
              <div className="p-4 rounded-lg border">
                <Label className="text-base">Auto Logout</Label>
                <p className="text-sm text-muted-foreground mb-3">Auto logout after inactivity</p>
                <select
                  value={storeSettings.autoLogoutMinutes}
                  onChange={(e) => handleStoreSettingChange('autoLogoutMinutes', parseInt(e.target.value))}
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={120}>120 minutes</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOwnerSettings;
