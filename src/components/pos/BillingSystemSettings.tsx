import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface BillingSystemSettingsProps {
  onBack: () => void;
}

interface BillingSystemSettingsState {
  // Order and Order Sync Settings
  restaurantClosingHour: string;
  restaurantClosingMinute: string;
  displayNotificationForExtendClosingHours: boolean;
  isOutletOpen24x7: boolean;
  syncBatchPacketSize: string;
  defaultOrderLimit: string;
  defaultAutoSyncTime: string;
  defaultAutoSyncTimeUnit: string;
  defaultPendingOrderSyncTime: string;
  defaultPendingOrderSyncTimeUnit: string;
  defaultCaptainOrderIntranetSyncTime: string;
  defaultCaptainOrderIntranetSyncTimeUnit: string;
  noOfMinutesToEditOrders: string;
  noOfMinutesToAutoSettleAfterPrint: string;
  mapDigitalTransactionEntries: boolean;

  // Payment Sync Settings
  paymentRequestSyncTime: string;
  checkPaymentRequestSyncTime: string;

  // Display settings
  billingScreenRefreshAfterBillPrint: string;
  showQRCodeOnBill: boolean;
  upiIdForQR: string;
  enableCartItemEditing: boolean;

  // Security Setting
  defaultManagerPassword: string;
  userIdleTimeForLogout: string;
}

const BillingSystemSettings: React.FC<BillingSystemSettingsProps> = ({ onBack }) => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [activeSection, setActiveSection] = useState('orderSync');
  const [settings, setSettings] = useState<BillingSystemSettingsState>({
    restaurantClosingHour: '06',
    restaurantClosingMinute: '00',
    displayNotificationForExtendClosingHours: true,
    isOutletOpen24x7: false,
    syncBatchPacketSize: '100',
    defaultOrderLimit: '500',
    defaultAutoSyncTime: '10',
    defaultAutoSyncTimeUnit: 'min',
    defaultPendingOrderSyncTime: '5',
    defaultPendingOrderSyncTimeUnit: 'sec',
    defaultCaptainOrderIntranetSyncTime: '5',
    defaultCaptainOrderIntranetSyncTimeUnit: 'sec',
    noOfMinutesToEditOrders: '2880',
    noOfMinutesToAutoSettleAfterPrint: '',
    mapDigitalTransactionEntries: false,
    paymentRequestSyncTime: '5',
    checkPaymentRequestSyncTime: '5',
    billingScreenRefreshAfterBillPrint: '0',
    showQRCodeOnBill: false,
    upiIdForQR: '',
    defaultManagerPassword: '',
    userIdleTimeForLogout: '0',
    enableCartItemEditing: false,
  });

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<BillingSystemSettingsState>('billingSystemSettings');
    if (saved) {
      setSettings(prev => ({ ...prev, ...saved }));
    } else {
      // Fallback to localStorage for migration
      const local = localStorage.getItem('billingSystemSettings');
      if (local) {
        try {
          setSettings(prev => ({ ...prev, ...JSON.parse(local) }));
        } catch {}
      }
    }

    const billSettings = getSetting<{ showQRCode?: boolean }>('pos_bill_settings');
    if (typeof billSettings?.showQRCode === 'boolean') {
      setSettings(prev => ({ ...prev, showQRCodeOnBill: billSettings.showQRCode! }));
    } else {
      const localBillSettings = localStorage.getItem('pos_bill_settings');
      if (localBillSettings) {
        try {
          const parsed = JSON.parse(localBillSettings) as { showQRCode?: boolean };
          if (typeof parsed.showQRCode === 'boolean') {
            setSettings(prev => ({ ...prev, showQRCodeOnBill: parsed.showQRCode! }));
          }
        } catch {}
      }
    }

    // Load UPI ID from bill config
    const billConfig = getSetting<{ upiId?: string }>('pos_bill_config');
    if (billConfig?.upiId) {
      setSettings(prev => ({ ...prev, upiIdForQR: billConfig.upiId! }));
    } else {
      const localBillConfig = localStorage.getItem('pos_bill_config');
      if (localBillConfig) {
        try {
          const parsed = JSON.parse(localBillConfig) as { upiId?: string };
          if (parsed.upiId) {
            setSettings(prev => ({ ...prev, upiIdForQR: parsed.upiId! }));
          }
        } catch {}
      }
    }
  }, [isLoaded, getSetting]);

  const handleSave = () => {
    saveSetting('billingSystemSettings', settings);

    const existingBillSettings = getSetting<Record<string, unknown>>('pos_bill_settings', {});
    saveSetting('pos_bill_settings', {
      ...existingBillSettings,
      showQRCode: settings.showQRCodeOnBill,
    });

    // Save UPI ID to bill config so bill template can read it
    if (settings.upiIdForQR) {
      const existingBillConfig = getSetting<Record<string, unknown>>('pos_bill_config', {});
      saveSetting('pos_bill_config', {
        ...existingBillConfig,
        upiId: settings.upiIdForQR,
      });
    }

    toast.success('Billing system settings saved successfully');
  };

  const sections = [
    { id: 'orderSync', label: 'Order and Order Sync Settings' },
    { id: 'paymentSync', label: 'Payment Sync Settings' },
    { id: 'display', label: 'Display settings' },
    { id: 'security', label: 'Security Setting' },
  ];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Outlet Settings &gt; Billing System</h1>
          </div>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r bg-background flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary border-l-4 border-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content */}
        <ScrollArea className="flex-1 p-6 bg-muted/30">
          <div className="space-y-6 max-w-4xl">
            {/* Order and Order Sync Settings */}
            {activeSection === 'orderSync' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Order and Order Sync Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings are related to Order synchronization and finalize settings.
                </p>

                <div className="space-y-6">
                  {/* Restaurant Closing Hours */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Restaurant Closing Hours</label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={settings.restaurantClosingHour}
                          onValueChange={(value) => setSettings({ ...settings, restaurantClosingHour: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {hours.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={settings.restaurantClosingMinute}
                          onValueChange={(value) => setSettings({ ...settings, restaurantClosingMinute: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => toast.info('Change closing hours')}>
                          Change Closing Hours
                        </Button>
                        <Button variant="outline" size="sm" className="text-primary" onClick={() => toast.info('Extend closing hours')}>
                          + Extend Closing Hours
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      Current day closing hours have been extended to 2025-12-30 06:00. Previous closing time was 2025-12-30 04:30.
                    </p>
                  </div>

                  {/* Display notification for Extend Closing Hours */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="displayNotificationForExtendClosingHours"
                      checked={settings.displayNotificationForExtendClosingHours}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, displayNotificationForExtendClosingHours: checked as boolean })
                      }
                    />
                    <label htmlFor="displayNotificationForExtendClosingHours" className="text-sm font-medium">
                      Display the notification (toaster) for temporary Extend Closing Hours
                    </label>
                  </div>

                  {/* Is outlet open 24x7 */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isOutletOpen24x7"
                      checked={settings.isOutletOpen24x7}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, isOutletOpen24x7: checked as boolean })
                      }
                    />
                    <label htmlFor="isOutletOpen24x7" className="text-sm font-medium">
                      Is the outlet open round-the-clock (24*7)?
                    </label>
                  </div>

                  {/* Sync Batch Packet Size */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Sync Batch Packet Size</label>
                      <Select
                        value={settings.syncBatchPacketSize}
                        onValueChange={(value) => setSettings({ ...settings, syncBatchPacketSize: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      The number of orders that would be synced in one packet.
                    </p>
                  </div>

                  {/* Default Order Limit */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Default Order Limit <span className="text-destructive">*</span> :
                      </label>
                      <Input
                        type="number"
                        value={settings.defaultOrderLimit}
                        onChange={(e) => setSettings({ ...settings, defaultOrderLimit: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      The maximum number of orders that would be displayed in PoS.
                    </p>
                  </div>

                  {/* Default Auto Sync Time */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Default Auto Sync Time</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.defaultAutoSyncTime}
                          onChange={(e) => setSettings({ ...settings, defaultAutoSyncTime: e.target.value })}
                          className="w-24 bg-muted/50"
                        />
                        <Select
                          value={settings.defaultAutoSyncTimeUnit}
                          onValueChange={(value) => setSettings({ ...settings, defaultAutoSyncTimeUnit: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sec">Sec</SelectItem>
                            <SelectItem value="min">Min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      The time taken for the orders to be synced with the dashboard automatically. Please note internet must be connected to enable auto-sync.
                    </p>
                  </div>

                  {/* Default Pending Order Sync Time */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Default Pending Order Sync Time</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.defaultPendingOrderSyncTime}
                          onChange={(e) => setSettings({ ...settings, defaultPendingOrderSyncTime: e.target.value })}
                          className="w-24 bg-muted/50"
                        />
                        <Select
                          value={settings.defaultPendingOrderSyncTimeUnit}
                          onValueChange={(value) => setSettings({ ...settings, defaultPendingOrderSyncTimeUnit: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sec">Sec</SelectItem>
                            <SelectItem value="min">Min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      The time taken for the pending orders to be synced with the dashboard. Please note internet must be connected to enable auto-sync.
                    </p>
                  </div>

                  {/* Default Captain Order Intranet Sync Time */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">Default Captain Order Intranet Sync Time</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.defaultCaptainOrderIntranetSyncTime}
                        onChange={(e) => setSettings({ ...settings, defaultCaptainOrderIntranetSyncTime: e.target.value })}
                        className="w-24 bg-muted/50"
                      />
                      <Select
                        value={settings.defaultCaptainOrderIntranetSyncTimeUnit}
                        onValueChange={(value) => setSettings({ ...settings, defaultCaptainOrderIntranetSyncTimeUnit: value })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sec">Sec</SelectItem>
                          <SelectItem value="min">Min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* No. of Minutes to Edit Orders */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      No. of Minutes to Edit Orders <span className="text-destructive">*</span> :
                    </label>
                    <Input
                      type="number"
                      value={settings.noOfMinutesToEditOrders}
                      onChange={(e) => setSettings({ ...settings, noOfMinutesToEditOrders: e.target.value })}
                      className="w-32 bg-muted/50"
                    />
                  </div>

                  {/* No. of Minutes to Auto Settle After Print */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        No. of Minutes to Auto Settle After Print <span className="text-destructive">*</span> :
                      </label>
                      <Input
                        type="number"
                        value={settings.noOfMinutesToAutoSettleAfterPrint}
                        onChange={(e) => setSettings({ ...settings, noOfMinutesToAutoSettleAfterPrint: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      Note: The order cannot be modified once it is auto settled, despite the relevant rights to modify order is given.
                    </p>
                  </div>

                  {/* Map digital transaction entries */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mapDigitalTransactionEntries"
                      checked={settings.mapDigitalTransactionEntries}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, mapDigitalTransactionEntries: checked as boolean })
                      }
                    />
                    <label htmlFor="mapDigitalTransactionEntries" className="text-sm font-medium">
                      Map digital transaction entries against invoices
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* Payment Sync Settings */}
            {activeSection === 'paymentSync' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Payment Sync Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings are related to Payment synchronization settings
                </p>

                <div className="space-y-6">
                  {/* Payment request sync time */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Payment request sync time <span className="text-destructive">*</span> :
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.paymentRequestSyncTime}
                        onChange={(e) => setSettings({ ...settings, paymentRequestSyncTime: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                      <span className="text-sm">Sec</span>
                    </div>
                  </div>

                  {/* Check payment request sync time */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Check payment request sync time <span className="text-destructive">*</span> :
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.checkPaymentRequestSyncTime}
                        onChange={(e) => setSettings({ ...settings, checkPaymentRequestSyncTime: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                      <span className="text-sm">Sec</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Display settings */}
            {activeSection === 'display' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Display settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings would be used to configure the display settings of the PoS
                </p>

                <div className="space-y-6">
                  {/* Billing Screen Refresh After No. Of Bill Print */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Billing Screen Refresh After No. Of Bill Print <span className="text-destructive">*</span>:
                      </label>
                      <Input
                        type="number"
                        value={settings.billingScreenRefreshAfterBillPrint}
                        onChange={(e) => setSettings({ ...settings, billingScreenRefreshAfterBillPrint: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      This setting describes after how many bill prints would the screen refreshes.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="showQRCodeOnBill"
                        checked={settings.showQRCodeOnBill}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, showQRCodeOnBill: checked as boolean })
                        }
                      />
                      <label htmlFor="showQRCodeOnBill" className="text-sm font-medium">
                        Show QR Code on printed bill
                      </label>
                    </div>
                    {settings.showQRCodeOnBill && (
                      <div className="ml-6 space-y-1">
                        <label className="text-sm font-medium">UPI ID <span className="text-destructive">*</span></label>
                        <Input
                          value={settings.upiIdForQR || ''}
                          onChange={(e) => setSettings({ ...settings, upiIdForQR: e.target.value })}
                          placeholder="merchant@upi or merchant@paytm"
                          className="w-64 bg-muted/50"
                        />
                        <p className="text-xs text-blue-600">QR code will only appear if UPI ID is set</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="enableCartItemEditing"
                        checked={settings.enableCartItemEditing}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, enableCartItemEditing: checked as boolean })
                        }
                      />
                      <label htmlFor="enableCartItemEditing" className="text-sm font-medium">
                        Enable Cart Item Editing (Change price & grammage directly in Cart)
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Allows cashiers to edit product price and grammage (quantity) directly inside the Cart side panel.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Security Setting */}
            {activeSection === 'security' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Security Setting</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings help in determining the settings related to security of the application.
                </p>

                <div className="space-y-6">
                  {/* Default Manager Password for Desktop Use */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Default Manager Password for Desktop Use :
                    </label>
                    <Input
                      type="password"
                      value={settings.defaultManagerPassword}
                      onChange={(e) => setSettings({ ...settings, defaultManagerPassword: e.target.value })}
                      className="w-48 bg-muted/50"
                    />
                  </div>

                  {/* User Idle time for Logout */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      User Idle time for Logout
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.userIdleTimeForLogout}
                        onChange={(e) => setSettings({ ...settings, userIdleTimeForLogout: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                      <span className="text-sm">Min</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-end gap-3 bg-background">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default BillingSystemSettings;
