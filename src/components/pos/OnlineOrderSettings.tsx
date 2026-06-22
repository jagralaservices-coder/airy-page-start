import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface OnlineOrderSettingsProps {
  onBack: () => void;
}

interface OnlineOrderSettingsState {
  // Online Order Auto Acceptance
  kotPrintAfterAutoaccept: boolean;
  kotInAdvanceOrder: boolean;
  billPrintAfterAutoaccept: boolean;
  defaultActionOnAccept: string;

  // Online Orders System Configuration
  ignoreOnlineOrderDeliveryCharge: boolean;
  deliveryCharges: string;
  minimumOrderAmount: string;
  autoCancelDuration: string;
  acceptOnlinePayment: boolean;
  generateInvoicesOnAccept: boolean;
  setSound: string;
  volume: number;
  showOnlineOrderDeliveryNotification: boolean;
  hideOrdersAfterFoodReady: boolean;
  printRiderTempDetails: boolean;
  notifyItemsGoingInStock: boolean;
  notificationOn: string;
  notifyMarkfoodReadyAfter: string;
  remindMeAfterEvery: string;

  // Delivery and Preparation time
  minimumPreparationTime: string;
  minimumDeliveryTime: string;

  // Advance Order Setting
  priorReminderForAdvanceOrder: string;
  doNotCreateMemoForAdvanceOrders: boolean;
  createKotOnCreatingMemo: boolean;
  createInvoiceFromMemoManually: boolean;
  printKotOnAcceptingAdvanceOrder: boolean;
  doNotCheckOfflineStock: boolean;
}

const OnlineOrderSettings: React.FC<OnlineOrderSettingsProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('autoAcceptance');
  const [settings, setSettings] = useState<OnlineOrderSettingsState>({
    kotPrintAfterAutoaccept: true,
    kotInAdvanceOrder: false,
    billPrintAfterAutoaccept: true,
    defaultActionOnAccept: 'save',
    ignoreOnlineOrderDeliveryCharge: false,
    deliveryCharges: '0',
    minimumOrderAmount: '0',
    autoCancelDuration: '15',
    acceptOnlinePayment: false,
    generateInvoicesOnAccept: false,
    setSound: 'sound-1',
    volume: 80,
    showOnlineOrderDeliveryNotification: true,
    hideOrdersAfterFoodReady: false,
    printRiderTempDetails: true,
    notifyItemsGoingInStock: true,
    notificationOn: 'fixed',
    notifyMarkfoodReadyAfter: '15',
    remindMeAfterEvery: '5',
    minimumPreparationTime: '30',
    minimumDeliveryTime: '30',
    priorReminderForAdvanceOrder: '60',
    doNotCreateMemoForAdvanceOrders: false,
    createKotOnCreatingMemo: false,
    createInvoiceFromMemoManually: false,
    printKotOnAcceptingAdvanceOrder: false,
    doNotCheckOfflineStock: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('onlineOrderSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('onlineOrderSettings', JSON.stringify(settings));
    toast.success('Online order settings saved successfully');
  };

  const sections = [
    { id: 'integrationSetup', label: '🔗 Integration Setup Guide' },
    { id: 'autoAcceptance', label: 'Online Order Auto Acceptance' },
    { id: 'systemConfig', label: 'Online Orders System Configuration' },
    { id: 'deliveryTime', label: 'Delivery and Preparation time' },
    { id: 'advanceOrder', label: 'Advance Order Setting' },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Outlet Settings &gt; Online/Advance Order</h1>
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
            {/* Integration Setup Guide */}
            {activeSection === 'integrationSetup' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">🔗 3rd Party Integration Setup</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Swiggy, Zomato aur other 3rd party food delivery apps ko integrate karne ke liye neeche diye gaye steps follow karein.
                  </p>
                </div>

                {/* What you need */}
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <h4 className="font-semibold text-sm mb-3">📋 Integration ke liye kya chahiye?</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <div>
                        <span className="font-medium">Webhook URL</span>
                        <p className="text-xs text-muted-foreground">Ye automatically generate hota hai. Online Orders page pe copy karein.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <div>
                        <span className="font-medium">Webhook Secret Key</span>
                        <p className="text-xs text-muted-foreground">Security ke liye HMAC signature verification use hota hai. Swiggy/Zomato partner portal se milega.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <div>
                        <span className="font-medium">Store ID</span>
                        <p className="text-xs text-muted-foreground">Automatically aapke store ke saath map hota hai webhook URL mein.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform-wise setup */}
                <div className="space-y-4">
                  {/* Swiggy */}
                  <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs">SWIGGY</span>
                      Integration Steps
                    </h4>
                    <ol className="text-xs space-y-2 text-muted-foreground list-decimal ml-4">
                      <li>Swiggy Partner Portal (<strong>partner.swiggy.com</strong>) pe login karein</li>
                      <li><strong>API Integration</strong> section mein jaayein</li>
                      <li>Webhook URL paste karein (Online Orders page se copy karein)</li>
                      <li>Webhook Secret Key generate karein aur save karein</li>
                      <li>Admin se <strong>SWIGGY_WEBHOOK_SECRET</strong> environment variable set karwayein</li>
                      <li>Commission Rate: Default <strong>22%</strong> (customize kar sakte hain)</li>
                    </ol>
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                      <span className="font-medium">Required Secret:</span> <code className="bg-muted px-1 py-0.5 rounded">SWIGGY_WEBHOOK_SECRET</code>
                    </div>
                  </div>

                  {/* Zomato */}
                  <div className="p-4 rounded-lg border bg-red-500/5 border-red-500/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">ZOMATO</span>
                      Integration Steps
                    </h4>
                    <ol className="text-xs space-y-2 text-muted-foreground list-decimal ml-4">
                      <li>Zomato for Business (<strong>business.zomato.com</strong>) pe login karein</li>
                      <li><strong>Webhook Settings</strong> mein jaayein</li>
                      <li>Webhook URL paste karein (Online Orders page se copy karein)</li>
                      <li>HMAC Secret Key set karein</li>
                      <li>Admin se <strong>ZOMATO_WEBHOOK_SECRET</strong> environment variable set karwayein</li>
                      <li>Commission Rate: Default <strong>20%</strong> (customize kar sakte hain)</li>
                    </ol>
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                      <span className="font-medium">Required Secret:</span> <code className="bg-muted px-1 py-0.5 rounded">ZOMATO_WEBHOOK_SECRET</code>
                    </div>
                  </div>

                  {/* Other Platforms */}
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">OTHER</span>
                      Custom / Other Platforms
                    </h4>
                    <ol className="text-xs space-y-2 text-muted-foreground list-decimal ml-4">
                      <li>Apne platform ke webhook settings mein jaayein</li>
                      <li>"Other" webhook URL copy karke paste karein</li>
                      <li>Webhook Secret configure karein</li>
                      <li>Admin se <strong>OTHER_WEBHOOK_SECRET</strong> set karwayein</li>
                      <li>Commission Rate: Default <strong>15%</strong></li>
                    </ol>
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                      <span className="font-medium">Required Secret:</span> <code className="bg-muted px-1 py-0.5 rounded">OTHER_WEBHOOK_SECRET</code>
                    </div>
                  </div>
                </div>

                {/* Auto-accept info */}
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h4 className="font-semibold text-sm mb-2">⚡ Auto-Accept & Auto-Print</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✅ Order aate hi <strong>5 second</strong> ka countdown start hoga</li>
                    <li>✅ 5 sec ke baad order automatically <strong>accept</strong> ho jayega</li>
                    <li>✅ Accept hone ke baad <strong>bill automatically print</strong> hoga (if enabled)</li>
                    <li>✅ KOT bhi auto-print hoga (if enabled in settings below)</li>
                    <li>✅ Sound notification bhi bajegi (Payment Sound Settings se customize karein)</li>
                  </ul>
                </div>

                {/* Plan info */}
                <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <h4 className="font-semibold text-sm mb-2">📦 Plan Information</h4>
                  <div className="text-xs space-y-2 text-muted-foreground">
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="font-medium">Gold Plan</span>
                      <span className="text-green-500 font-medium">✅ Included</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="font-medium">Platinum Plan</span>
                      <span className="text-green-500 font-medium">✅ Included</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="font-medium">Basic Plan</span>
                      <span className="text-yellow-500 font-medium">🔒 Add-on Required</span>
                    </div>
                  </div>
                </div>
              </section>
            )}


            {activeSection === 'autoAcceptance' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Online Order Auto Acceptance</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  If Auto acceptance of an online order is enabled then choose the next step after acceptance of an order. To enable an autoaccept, do visit settings of <strong>swiggy, zomato, online ordering widget, Menu QR</strong> under Marketplace section.
                </p>

                <div className="space-y-6">
                  {/* KOT print after autoaccept */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="kotPrintAfterAutoaccept"
                        checked={settings.kotPrintAfterAutoaccept}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, kotPrintAfterAutoaccept: checked as boolean })
                        }
                      />
                      <label htmlFor="kotPrintAfterAutoaccept" className="text-sm font-medium">
                        KOT print after autoaccept
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Click here if you want KOT to be Printed once online order gets auto accepted.
                    </p>
                  </div>

                  {/* KOT in Advance order */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="kotInAdvanceOrder"
                        checked={settings.kotInAdvanceOrder}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, kotInAdvanceOrder: checked as boolean })
                        }
                      />
                      <label htmlFor="kotInAdvanceOrder" className="text-sm font-medium">
                        KOT in Advance order
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Click here if you want to create KOT in case of advance order.
                    </p>
                  </div>

                  {/* Bill print after autoaccept */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="billPrintAfterAutoaccept"
                        checked={settings.billPrintAfterAutoaccept}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, billPrintAfterAutoaccept: checked as boolean })
                        }
                      />
                      <label htmlFor="billPrintAfterAutoaccept" className="text-sm font-medium">
                        Bill print after autoaccept
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Click here, if you want Bill to be Printed once online order gets auto accepted.
                    </p>
                  </div>

                  {/* Default action while pressing (Ctrl+A) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Default action while pressing (Ctrl+A) Online order accept
                    </label>
                    <RadioGroup
                      value={settings.defaultActionOnAccept}
                      onValueChange={(value) => setSettings({ ...settings, defaultActionOnAccept: value })}
                      className="flex flex-wrap gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="save" id="save" />
                        <Label htmlFor="save">Save</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="printEbill" id="printEbill" />
                        <Label htmlFor="printEbill">Print & eBill</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="kot" id="kot" />
                        <Label htmlFor="kot">KOT</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="kotPrint" id="kotPrint" />
                        <Label htmlFor="kotPrint">KOT & Print</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </section>
            )}

            {/* Online Orders System Configuration */}
            {activeSection === 'systemConfig' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Online Orders System Configuration</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings pertains to configuring the Online Orders System Configuration.
                </p>

                <div className="space-y-6">
                  {/* Ignore Online Order Delivery Charge */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="ignoreOnlineOrderDeliveryCharge"
                        checked={settings.ignoreOnlineOrderDeliveryCharge}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, ignoreOnlineOrderDeliveryCharge: checked as boolean })
                        }
                      />
                      <label htmlFor="ignoreOnlineOrderDeliveryCharge" className="text-sm font-medium">
                        Ignore Online Order Delivery Charge
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Click here to ignore online order delivery chargers sent by zomato, swiggy etc in the invoice total.
                    </p>
                  </div>

                  {/* Delivery Charges */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Delivery Charges (₹) :
                      </label>
                      <Input
                        type="number"
                        value={settings.deliveryCharges}
                        onChange={(e) => setSettings({ ...settings, deliveryCharges: e.target.value })}
                        className="w-40 bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      Enter default delivery charge to enable across all online ordering channels to set.
                    </p>
                  </div>

                  {/* Minimum Order Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Minimum Order Amount (₹) :
                      </label>
                      <Input
                        type="number"
                        value={settings.minimumOrderAmount}
                        onChange={(e) => setSettings({ ...settings, minimumOrderAmount: e.target.value })}
                        className="w-40 bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      Enter minimum order amount. this field is not being used by all provider.
                    </p>
                  </div>

                  {/* Auto Cancel Duration */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Auto Cancel Duration :
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.autoCancelDuration}
                          onChange={(e) => setSettings({ ...settings, autoCancelDuration: e.target.value })}
                          className="w-32 bg-muted/50"
                        />
                        <span className="text-sm">Min</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      if order is not accepted within time set above, order will get rejected.
                    </p>
                  </div>

                  {/* Accept Online Payment */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="acceptOnlinePayment"
                        checked={settings.acceptOnlinePayment}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, acceptOnlinePayment: checked as boolean })
                        }
                      />
                      <label htmlFor="acceptOnlinePayment" className="text-sm font-medium">
                        Accept Online Payment
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Click here if you are accepting online payments. this info is not synced with every third parties.
                    </p>
                  </div>

                  {/* Generate invoices */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="generateInvoicesOnAccept"
                        checked={settings.generateInvoicesOnAccept}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, generateInvoicesOnAccept: checked as boolean })
                        }
                      />
                      <label htmlFor="generateInvoicesOnAccept" className="text-sm font-medium">
                        Generate invoices when orders accepted using the acceptance app or web dashboard?
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Orders accepted using the Acceptance app or web dashboard will have a unique series of invoice IDs (Ex: O1, O2, O3....) and these orders will not be visible on the Petpooja desktop/android
                    </p>
                  </div>

                  {/* Set Sound */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">Set Sound</label>
                    <Select
                      value={settings.setSound}
                      onValueChange={(value) => setSettings({ ...settings, setSound: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sound-1">Sound-1</SelectItem>
                        <SelectItem value="sound-2">Sound-2</SelectItem>
                        <SelectItem value="sound-3">Sound-3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Upload Custom Sound */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">Upload Your Custom Sound</label>
                    <Input type="file" accept="audio/*" className="flex-1" />
                  </div>

                  {/* Set Volume */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">Set Volume</label>
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <Slider
                      value={[settings.volume]}
                      onValueChange={(value) => setSettings({ ...settings, volume: value[0] })}
                      max={100}
                      step={1}
                      className="flex-1 max-w-xs"
                    />
                    <Button variant="outline" size="sm" onClick={() => toast.info('Test sound played')}>
                      Test Sound
                    </Button>
                  </div>

                  {/* Show Online order delivery notification */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showOnlineOrderDeliveryNotification"
                      checked={settings.showOnlineOrderDeliveryNotification}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, showOnlineOrderDeliveryNotification: checked as boolean })
                      }
                    />
                    <label htmlFor="showOnlineOrderDeliveryNotification" className="text-sm font-medium">
                      Do you want to show Online order delivery notification section?
                    </label>
                  </div>

                  {/* Hide orders after mark foodready */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hideOrdersAfterFoodReady"
                      checked={settings.hideOrdersAfterFoodReady}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, hideOrdersAfterFoodReady: checked as boolean })
                      }
                    />
                    <label htmlFor="hideOrdersAfterFoodReady" className="text-sm font-medium">
                      Hide orders after mark foodready/dispatched in live view screen
                    </label>
                  </div>

                  {/* Print rider temperature */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printRiderTempDetails"
                      checked={settings.printRiderTempDetails}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, printRiderTempDetails: checked as boolean })
                      }
                    />
                    <label htmlFor="printRiderTempDetails" className="text-sm font-medium">
                      Print rider temperature/mask details in bill
                    </label>
                  </div>

                  {/* Notify about items going in stock */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notifyItemsGoingInStock"
                      checked={settings.notifyItemsGoingInStock}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, notifyItemsGoingInStock: checked as boolean })
                      }
                    />
                    <label htmlFor="notifyItemsGoingInStock" className="text-sm font-medium">
                      Notify about the item(s) going in stock
                    </label>
                  </div>

                  {/* Notification On */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notification On</label>
                    <RadioGroup
                      value={settings.notificationOn}
                      onValueChange={(value) => setSettings({ ...settings, notificationOn: value })}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed">Fixed Prep Time</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="order" id="order" />
                        <Label htmlFor="order">Order Prep Time</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Notify markfood ready after */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">
                        Notify markfood ready after
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.notifyMarkfoodReadyAfter}
                          onChange={(e) => setSettings({ ...settings, notifyMarkfoodReadyAfter: e.target.value })}
                          className="w-32 bg-muted/50"
                        />
                        <span className="text-sm">Min</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-52">[Minimum 1 - Maximum 150]</p>
                    <p className="text-xs text-blue-600 ml-52">
                      Please set the time to mark the food ready status once online order gets accepted..
                    </p>
                  </div>

                  {/* Remind me after every */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Remind me after every</label>
                      <Select
                        value={settings.remindMeAfterEvery}
                        onValueChange={(value) => setSettings({ ...settings, remindMeAfterEvery: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Min</SelectItem>
                          <SelectItem value="2">2 Min</SelectItem>
                          <SelectItem value="5">5 Min</SelectItem>
                          <SelectItem value="10">10 Min</SelectItem>
                          <SelectItem value="15">15 Min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">Please set the time to remind again.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Delivery and Preparation time */}
            {activeSection === 'deliveryTime' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Delivery and Preparation time</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings related to the time taken to prepare and deliver your orders
                </p>

                <div className="space-y-6">
                  {/* Minimum Preparation Time */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Minimum Preparation Time <span className="text-destructive">*</span> :
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.minimumPreparationTime}
                        onChange={(e) => setSettings({ ...settings, minimumPreparationTime: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                      <span className="text-sm">Min</span>
                    </div>
                  </div>

                  {/* Minimum Delivery Time */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Minimum Delivery Time <span className="text-destructive">*</span> :
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.minimumDeliveryTime}
                        onChange={(e) => setSettings({ ...settings, minimumDeliveryTime: e.target.value })}
                        className="w-32 bg-muted/50"
                      />
                      <span className="text-sm">Min</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Advance Order Setting */}
            {activeSection === 'advanceOrder' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Advance Order Setting</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings related to an advance order
                </p>

                <div className="space-y-6">
                  {/* Prior reminder for advance order */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-48">Prior reminder for advance order</label>
                      <Select
                        value={settings.priorReminderForAdvanceOrder}
                        onValueChange={(value) => setSettings({ ...settings, priorReminderForAdvanceOrder: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Min</SelectItem>
                          <SelectItem value="30">30 Min</SelectItem>
                          <SelectItem value="45">45 Min</SelectItem>
                          <SelectItem value="60">60 Min</SelectItem>
                          <SelectItem value="90">90 Min</SelectItem>
                          <SelectItem value="120">120 Min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-blue-600 ml-52">
                      Please set the time to change the prior reminder of an advance order.
                    </p>
                  </div>

                  {/* Do not create memo for advance orders */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="doNotCreateMemoForAdvanceOrders"
                      checked={settings.doNotCreateMemoForAdvanceOrders}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, doNotCreateMemoForAdvanceOrders: checked as boolean })
                      }
                    />
                    <label htmlFor="doNotCreateMemoForAdvanceOrders" className="text-sm font-medium">
                      Do not create memo for advance orders (Offline Orders Only)
                    </label>
                  </div>

                  {/* Create kot on creating memo */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="createKotOnCreatingMemo"
                      checked={settings.createKotOnCreatingMemo}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, createKotOnCreatingMemo: checked as boolean })
                      }
                    />
                    <label htmlFor="createKotOnCreatingMemo" className="text-sm font-medium">
                      Create kot on creating memo for advance orders (Offline Orders Only)
                    </label>
                  </div>

                  {/* Create invoice from memo manually */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="createInvoiceFromMemoManually"
                        checked={settings.createInvoiceFromMemoManually}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, createInvoiceFromMemoManually: checked as boolean })
                        }
                      />
                      <label htmlFor="createInvoiceFromMemoManually" className="text-sm font-medium">
                        Create invoice from memo manually after settlement
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      When enabled, invoice for settled orders won't be created automatically. The biller must manually create invoice from advanced order grid.
                    </p>
                  </div>

                  {/* Print Kot on accepting online advance order */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printKotOnAcceptingAdvanceOrder"
                      checked={settings.printKotOnAcceptingAdvanceOrder}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, printKotOnAcceptingAdvanceOrder: checked as boolean })
                      }
                    />
                    <label htmlFor="printKotOnAcceptingAdvanceOrder" className="text-sm font-medium">
                      Print Kot on accepting online advance order
                    </label>
                  </div>

                  {/* Do not check offline stock */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="doNotCheckOfflineStock"
                      checked={settings.doNotCheckOfflineStock}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, doNotCheckOfflineStock: checked as boolean })
                      }
                    />
                    <label htmlFor="doNotCheckOfflineStock" className="text-sm font-medium">
                      Do not check offline stock at time of advance order
                    </label>
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

export default OnlineOrderSettings;
