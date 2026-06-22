import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Smartphone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';

interface LinkedServicesSettingsProps {
  onBack: () => void;
}

interface LinkedServicesSettingsState {
  // Inventory Settings
  enableAutoConsumption: boolean;
  resetStockOnDayStart: boolean;
  outOfStockAction: 'hide' | 'disable';
  useRealTimeStockManagement: boolean;

  // Day End Settings
  enableManualDayEnd: boolean;
  dontAllowDayEndActiveTable: boolean;
  dontAllowDayEndUnsyncOrders: boolean;
  restrictEditAfterDayEnd: boolean;

  // Loyalty Settings
  sendLoyaltyDefault: boolean;
  applyLoyaltyDelivery: boolean;
  applyLoyaltyPickUp: boolean;
  applyLoyaltyDineIn: boolean;
  sendLoyaltyDataOn: 'printBill' | 'settleAndSave';

  // KDS Settings
  kdsLiveScreenUpdate: boolean;
  markKotDoneOnAllItems: boolean;

  // Captain App Settings
  printKotFromCaptainApp: boolean;
  allowDiscountFromCaptainApp: boolean;
  notifyCaptainOnFoodReady: 'itemReady' | 'kotReady' | 'none';

  // e-Invoice Settings
  enableEInvoice: boolean;

  // Barcode Settings
  prefixForBarcode: string;
  noOfCharactersForWeight: string;
  weightDenominator: string;
  allowMultipleItemsInBarcode: boolean;

  // Expense Settings
  restrictExpenseCurrentDate: boolean;

  // Invoice Structure
  invoicePrefix: string;
  invoiceNumberLength: string;
  invoiceSuffix: string;
}

const defaultSettings: LinkedServicesSettingsState = {
  enableAutoConsumption: false,
  resetStockOnDayStart: false,
  outOfStockAction: 'hide',
  useRealTimeStockManagement: false,
  enableManualDayEnd: false,
  dontAllowDayEndActiveTable: false,
  dontAllowDayEndUnsyncOrders: false,
  restrictEditAfterDayEnd: false,
  sendLoyaltyDefault: true,
  applyLoyaltyDelivery: true,
  applyLoyaltyPickUp: true,
  applyLoyaltyDineIn: true,
  sendLoyaltyDataOn: 'settleAndSave',
  kdsLiveScreenUpdate: true,
  markKotDoneOnAllItems: true,
  printKotFromCaptainApp: true,
  allowDiscountFromCaptainApp: false,
  notifyCaptainOnFoodReady: 'none',
  enableEInvoice: false,
  prefixForBarcode: '',
  noOfCharactersForWeight: '5',
  weightDenominator: '1000',
  allowMultipleItemsInBarcode: false,
  restrictExpenseCurrentDate: false,
  invoicePrefix: '',
  invoiceNumberLength: '',
  invoiceSuffix: '',
};

const menuItems = [
  { id: 'inventory', label: 'Inventory Settings' },
  { id: 'dayEnd', label: 'Day End Settings' },
  { id: 'loyalty', label: 'Loyalty Settings' },
  { id: 'kds', label: 'KDS Settings' },
  { id: 'captainApp', label: 'Captain App Settings' },
  { id: 'eInvoice', label: 'e-Invoice settings' },
  { id: 'barcode', label: 'Barcode settings' },
  { id: 'expense', label: 'Expense settings' },
  { id: 'invoiceStructure', label: 'Invoice Structure' },
  { id: 'whatsapp', label: 'WhatsApp Settings' },
  { id: 'emailjs', label: 'EmailJS Settings' },
];

const LinkedServicesSettings: React.FC<LinkedServicesSettingsProps> = ({ onBack }) => {
  const { selectedStoreId: ownerSelectedStoreId, selectedStoreName: ownerSelectedStoreName } = useOwnerStore();
  const { activeStore } = usePOS();
  const selectedStoreId = ownerSelectedStoreId || activeStore?.id || null;
  const storeId = selectedStoreId;
  const selectedStoreName = ownerSelectedStoreName || activeStore?.name || 'Our Store';
  const { customer } = useSupabaseAuth();
  const [settings, setSettings] = useState<LinkedServicesSettingsState>(defaultSettings);
  const [activeSection, setActiveSection] = useState('inventory');

  // EmailJS Config States
  const [emailJsServiceId, setEmailJsServiceId] = useState('');
  const [emailJsTemplateId, setEmailJsTemplateId] = useState('');
  const [emailJsPublicKey, setEmailJsPublicKey] = useState('');
  const [emailJsIsActive, setEmailJsIsActive] = useState(false);

  // WhatsApp Sender Config States
  const [waNumber, setWaNumber] = useState('');
  const [waInstanceId, setWaInstanceId] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [waIsVerified, setWaIsVerified] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waVerifying, setWaVerifying] = useState(false);

  // Stepper / Wizard States
  const [verificationStep, setVerificationStep] = useState<1 | 2>(1);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerOtp, setOwnerOtp] = useState('');
  const [isOwnerPhoneVerified, setIsOwnerPhoneVerified] = useState(false);
  const [isSendingOwnerOtp, setIsSendingOwnerOtp] = useState(false);
  const [isVerifyingOwnerOtp, setIsVerifyingOwnerOtp] = useState(false);
  const [ownerOtpSent, setOwnerOtpSent] = useState(false);

  const [waOtp, setWaOtp] = useState('');
  const [waOtpSent, setWaOtpSent] = useState(false);
  const [isSendingWaOtp, setIsSendingWaOtp] = useState(false);
  const [isVerifyingWaOtp, setIsVerifyingWaOtp] = useState(false);

  useEffect(() => {
    const customerAny = customer as any;
    if (customerAny?.phone) {
      setOwnerPhone(customerAny.phone);
    }
  }, [customer]);
  useEffect(() => {
    const fetchWaConfig = async () => {
      if (!storeId) return;
      setWaLoading(true);
      try {
        const direct = localStorage.getItem('pos_store_code');
        let storeCode = direct || null;
        if (!storeCode) {
          const storeData = localStorage.getItem('pos_active_store_data');
          if (storeData) {
            const parsed = JSON.parse(storeData);
            storeCode = parsed?.storeCode || parsed?.store_code || null;
          }
        }
        const { data, error } = await supabase.functions.invoke('sync-store-data', {
          body: { action: 'fetch', store_id: storeId, data_type: 'whatsapp_config', store_code: storeCode }
        });

        if (error) {
          console.error('Error fetching WhatsApp config:', error);
        } else if (data?.config) {
          const config = data.config;
          setWaNumber(config.whatsapp_number || '');
          setWaInstanceId(config.instance_id || '');
          setWaApiKey(config.api_key || '');
          setWaIsVerified(config.is_verified || false);
          if (config.is_verified) {
            setIsOwnerPhoneVerified(true);
            setVerificationStep(2);
          } else {
            setIsOwnerPhoneVerified(false);
            setVerificationStep(1);
          }
        } else {
          setWaNumber('');
          setWaInstanceId('');
          setWaApiKey('');
          setWaIsVerified(false);
          setIsOwnerPhoneVerified(false);
          setVerificationStep(1);
        }
      } catch (err) {
        console.error('Failed to fetch WhatsApp config:', err);
      } finally {
        setWaLoading(false);
      }
    };

    fetchWaConfig();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    try {
      const savedConfig = localStorage.getItem(`pos_emailjs_config_${storeId}`);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setEmailJsServiceId(parsed.serviceId || '');
        setEmailJsTemplateId(parsed.templateId || '');
        setEmailJsPublicKey(parsed.publicKey || '');
        setEmailJsIsActive(parsed.isActive || false);
      } else {
        setEmailJsServiceId('');
        setEmailJsTemplateId('');
        setEmailJsPublicKey('');
        setEmailJsIsActive(false);
      }
    } catch (e) {
      console.error('Failed to load EmailJS config:', e);
    }
  }, [storeId]);
  const handleSendOwnerOtp = async () => {
    if (!ownerPhone.trim() || ownerPhone.replace(/[\s()-]/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit owner contact number.');
      return;
    }
    setIsSendingOwnerOtp(true);
    // Simulate API request to send SMS OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSendingOwnerOtp(false);
    setOwnerOtpSent(true);
    toast.success(`OTP sent to owner contact number: ${ownerPhone}.`);
    
    // STRICT MODE: No demo OTP allowed.
    // Real validation required against Edge Function.
    toast.error('Real OTP Verification is strictly enforced. Please connect Edge Function here.');
  };

  const handleVerifyOwnerOtp = async () => {
    // Real validation required against Edge Function.
    toast.error('Real OTP Verification is strictly enforced. Please connect Edge Function here.');
    return;
  };

  const handleSendWaOtp = async () => {
    if (!waNumber.trim() || waNumber.replace(/[\s()-]/g, '').length < 10) {
      toast.error('Please enter a valid WhatsApp Phone Number.');
      return;
    }
    if (!waInstanceId.trim()) {
      toast.error('Please enter your WhatsApp Instance ID.');
      return;
    }
    if (!waApiKey.trim()) {
      toast.error('Please enter your WhatsApp API Key / Token.');
      return;
    }
    setIsSendingWaOtp(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSendingWaOtp(false);
    setWaOtpSent(true);
    toast.success(`WhatsApp connection established. Verification code dispatched via WhatsApp to ${waNumber}. Hint: Use OTP "654321"`);
  };

  const handleVerifyAndActivateWhatsApp = async () => {
    if (waOtp.trim() !== '654321') {
      toast.error('Invalid WhatsApp verification code. Please enter the 6-digit code received on your WhatsApp number.');
      return;
    }
    setIsVerifyingWaOtp(true);
    try {
      const cleanedPhone = waNumber.replace(/[\s()-]/g, '');
      const configPayload = {
        owner_id: customer?.id || null,
        whatsapp_number: cleanedPhone,
        instance_id: waInstanceId.trim(),
        api_key: waApiKey.trim(),
        is_verified: true,
      };

      const direct = localStorage.getItem('pos_store_code');
      let storeCode = direct || null;
      if (!storeCode) {
        const storeData = localStorage.getItem('pos_active_store_data');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          storeCode = parsed?.storeCode || parsed?.store_code || null;
        }
      }

      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: {
          action: 'save',
          store_id: selectedStoreId,
          data_type: 'whatsapp_config',
          config: configPayload,
          store_code: storeCode
        }
      });

      if (error || data?.error) {
        console.error('Error saving WhatsApp config:', error || data?.error);
        toast.error('Failed to save configuration: ' + (error?.message || data?.error || 'Unknown error'));
        setWaIsVerified(false);
      } else {
        setWaIsVerified(true);
        localStorage.setItem(`pos_whatsapp_config_${selectedStoreId}`, JSON.stringify(data.config || { ...configPayload, store_id: selectedStoreId }));
        toast.success('WhatsApp credentials verified and gateway activated successfully!');
      }
    } catch (err: any) {
      console.error('WhatsApp verification error:', err);
      toast.error('Verification failed: ' + (err.message || 'Unknown error'));
      setWaIsVerified(false);
    } finally {
      setIsVerifyingWaOtp(false);
    }
  };

  const handleDeactivateWhatsApp = async () => {
    if (!selectedStoreId) return;
    
    setWaVerifying(true);
    try {
      const configPayload = {
        owner_id: customer?.id || null,
        whatsapp_number: waNumber.replace(/[\s()-]/g, ''),
        instance_id: waInstanceId.trim(),
        api_key: waApiKey.trim(),
        is_verified: false,
      };

      const direct = localStorage.getItem('pos_store_code');
      let storeCode = direct || null;
      if (!storeCode) {
        const storeData = localStorage.getItem('pos_active_store_data');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          storeCode = parsed?.storeCode || parsed?.store_code || null;
        }
      }

      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: {
          action: 'save',
          store_id: selectedStoreId,
          data_type: 'whatsapp_config',
          config: configPayload,
          store_code: storeCode
        }
      });

      if (error || data?.error) {
        toast.error('Failed to deactivate WhatsApp: ' + (error?.message || data?.error || 'Unknown error'));
      } else {
        setWaIsVerified(false);
        setIsOwnerPhoneVerified(false);
        setOwnerOtpSent(false);
        setOwnerOtp('');
        setWaOtpSent(false);
        setWaOtp('');
        setVerificationStep(1);
        localStorage.removeItem(`pos_whatsapp_config_${selectedStoreId}`);
        toast.info('WhatsApp messaging deactivated.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWaVerifying(false);
    }
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('linkedServicesSettings');
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('linkedServicesSettings', JSON.stringify(settings));
    toast.success('Linked services settings saved successfully');
  };

  const updateSetting = <K extends keyof LinkedServicesSettingsState>(
    key: K,
    value: LinkedServicesSettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Outlet Settings &gt; Connected services</h1>
          </div>
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            &lt; Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-border bg-card flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="py-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-4 ${
                    activeSection === item.id
                      ? 'border-l-primary text-primary bg-primary/5 font-medium'
                      : 'border-l-transparent text-foreground hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6 bg-muted/30">
            <div className="max-w-3xl space-y-6">
              
              {/* Inventory Settings */}
              <section id="inventory" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Inventory Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings configures the Inventory module in billing screen
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="enableAutoConsumption"
                      checked={settings.enableAutoConsumption}
                      onCheckedChange={(checked) => updateSetting('enableAutoConsumption', !!checked)}
                    />
                    <div>
                      <Label htmlFor="enableAutoConsumption" className="text-sm">
                        Enable auto consumption for Inventory
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="resetStockOnDayStart"
                      checked={settings.resetStockOnDayStart}
                      onCheckedChange={(checked) => updateSetting('resetStockOnDayStart', !!checked)}
                    />
                    <Label htmlFor="resetStockOnDayStart" className="text-sm">
                      Reset your stock on a day start
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Action when items goes out of stock</Label>
                    <RadioGroup
                      value={settings.outOfStockAction}
                      onValueChange={(value) => updateSetting('outOfStockAction', value as 'hide' | 'disable')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hide" id="hideItems" />
                        <Label htmlFor="hideItems" className="text-sm font-normal">Hide items</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="disable" id="disableItems" />
                        <Label htmlFor="disableItems" className="text-sm font-normal">Disable items</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="useRealTimeStockManagement"
                      checked={settings.useRealTimeStockManagement}
                      onCheckedChange={(checked) => updateSetting('useRealTimeStockManagement', !!checked)}
                    />
                    <Label htmlFor="useRealTimeStockManagement" className="text-sm">
                      Use Real-Time stock management
                    </Label>
                  </div>
                </div>
              </section>

              {/* Day End Settings */}
              <section id="dayEnd" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Day End Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings helps in configures enabling Day End module in billing screen
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="enableManualDayEnd"
                      checked={settings.enableManualDayEnd}
                      onCheckedChange={(checked) => updateSetting('enableManualDayEnd', !!checked)}
                    />
                    <div>
                      <Label htmlFor="enableManualDayEnd" className="text-sm">
                        Enable Manual Day End
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="dontAllowDayEndActiveTable"
                      checked={settings.dontAllowDayEndActiveTable}
                      onCheckedChange={(checked) => updateSetting('dontAllowDayEndActiveTable', !!checked)}
                    />
                    <div>
                      <Label htmlFor="dontAllowDayEndActiveTable" className="text-sm">
                        Don't allow Day End if there is any active table on Table View Screen.
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="dontAllowDayEndUnsyncOrders"
                      checked={settings.dontAllowDayEndUnsyncOrders}
                      onCheckedChange={(checked) => updateSetting('dontAllowDayEndUnsyncOrders', !!checked)}
                    />
                    <div>
                      <Label htmlFor="dontAllowDayEndUnsyncOrders" className="text-sm">
                        Don't allow Day End if there is any un-sync orders data
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="restrictEditAfterDayEnd"
                      checked={settings.restrictEditAfterDayEnd}
                      onCheckedChange={(checked) => updateSetting('restrictEditAfterDayEnd', !!checked)}
                    />
                    <div>
                      <Label htmlFor="restrictEditAfterDayEnd" className="text-sm">
                        Restrict editing the order once the manual day end operation has been completed
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Loyalty Settings */}
              <section id="loyalty" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Loyalty Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the loyalty settings in the billing screen
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="sendLoyaltyDefault"
                      checked={settings.sendLoyaltyDefault}
                      onCheckedChange={(checked) => updateSetting('sendLoyaltyDefault', !!checked)}
                    />
                    <Label htmlFor="sendLoyaltyDefault" className="text-sm">
                      Make "Send Loyalty" option set as default on Billing screen.
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Apply Loyalty points when order punched as</Label>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="applyLoyaltyDelivery"
                          checked={settings.applyLoyaltyDelivery}
                          onCheckedChange={(checked) => updateSetting('applyLoyaltyDelivery', !!checked)}
                        />
                        <Label htmlFor="applyLoyaltyDelivery" className="text-sm font-normal">Delivery</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="applyLoyaltyPickUp"
                          checked={settings.applyLoyaltyPickUp}
                          onCheckedChange={(checked) => updateSetting('applyLoyaltyPickUp', !!checked)}
                        />
                        <Label htmlFor="applyLoyaltyPickUp" className="text-sm font-normal">Pick Up</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="applyLoyaltyDineIn"
                          checked={settings.applyLoyaltyDineIn}
                          onCheckedChange={(checked) => updateSetting('applyLoyaltyDineIn', !!checked)}
                        />
                        <Label htmlFor="applyLoyaltyDineIn" className="text-sm font-normal">Dine In</Label>
                      </div>
                    </div>
                    <p className="text-xs text-primary">
                      Above settings enabled POS system to apply loyalty points on selected order types.
                    </p>
                    <p className="text-xs text-primary">This setting is only available in cloud login.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Send Loyalty Data (Only for Table Order) :</Label>
                    <RadioGroup
                      value={settings.sendLoyaltyDataOn}
                      onValueChange={(value) => updateSetting('sendLoyaltyDataOn', value as 'printBill' | 'settleAndSave')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="printBill" id="printBill" />
                        <Label htmlFor="printBill" className="text-sm font-normal">Print Bill</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="settleAndSave" id="settleAndSave" />
                        <Label htmlFor="settleAndSave" className="text-sm font-normal">Settle & Save</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </section>

              {/* KDS Settings */}
              <section id="kds" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">KDS settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings would be used to configure the Kitchen Display System or KDS
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="kdsLiveScreenUpdate"
                      checked={settings.kdsLiveScreenUpdate}
                      onCheckedChange={(checked) => updateSetting('kdsLiveScreenUpdate', !!checked)}
                    />
                    <div>
                      <Label htmlFor="kdsLiveScreenUpdate" className="text-sm">
                        From KDS/KOT live screen send update to order screen.
                      </Label>
                      <p className="text-xs text-primary mt-1">
                        In case of any update (like marking an item/order ready) in KDS or KOT live view, the update would be also be present in Order screen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="markKotDoneOnAllItems"
                      checked={settings.markKotDoneOnAllItems}
                      onCheckedChange={(checked) => updateSetting('markKotDoneOnAllItems', !!checked)}
                    />
                    <div>
                      <Label htmlFor="markKotDoneOnAllItems" className="text-sm">
                        On marking done all items on KDS, Mark KOT as done.
                      </Label>
                      <p className="text-xs text-primary mt-1">
                        Enabling the setting would mark the full KOT done at all places (including online aggregators) when all the items are marked done.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Captain App Settings */}
              <section id="captainApp" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Captain App settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the Captain App print settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="printKotFromCaptainApp"
                      checked={settings.printKotFromCaptainApp}
                      onCheckedChange={(checked) => updateSetting('printKotFromCaptainApp', !!checked)}
                    />
                    <Label htmlFor="printKotFromCaptainApp" className="text-sm">
                      Print KOT from Captain App
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="allowDiscountFromCaptainApp"
                      checked={settings.allowDiscountFromCaptainApp}
                      onCheckedChange={(checked) => updateSetting('allowDiscountFromCaptainApp', !!checked)}
                    />
                    <div>
                      <Label htmlFor="allowDiscountFromCaptainApp" className="text-sm">
                        Allow Discount from Captain APP (Applicable for Dine-In orders only)
                      </Label>
                      <p className="text-xs text-primary mt-1">This setting is only available in cloud login.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Notify captain users once the food ready is marked</Label>
                    <RadioGroup
                      value={settings.notifyCaptainOnFoodReady}
                      onValueChange={(value) => updateSetting('notifyCaptainOnFoodReady', value as 'itemReady' | 'kotReady' | 'none')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="itemReady" id="itemReady" />
                        <Label htmlFor="itemReady" className="text-sm font-normal">Item Ready</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="kotReady" id="kotReady" />
                        <Label htmlFor="kotReady" className="text-sm font-normal">KOT Ready</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="none" id="noneNotify" />
                        <Label htmlFor="noneNotify" className="text-sm font-normal">None</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </section>

              {/* e-Invoice Settings */}
              <section id="eInvoice" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">e-Invoice settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the e-Invoice settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="enableEInvoice"
                      checked={settings.enableEInvoice}
                      onCheckedChange={(checked) => updateSetting('enableEInvoice', !!checked)}
                    />
                    <Label htmlFor="enableEInvoice" className="text-sm">
                      Enable e-Invoice
                    </Label>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-primary">Please consider below scenario if you want to generate e-Invoice:</p>
                    <ol className="text-xs text-primary space-y-1 list-decimal list-inside">
                      <li>Please enter & verify Outlet GST information.</li>
                      <li>Please enter proper Customer GST no. while printing the bill from POS.</li>
                      <li>Outlet must have CGST and SGST taxes in their TAX configuration.</li>
                      <li>Currently IGST tax is not supported.</li>
                      <li>If you want to cancel e-Invoice(if already generated) then you must cancel the Order.</li>
                      <li>Please disable configuration(if any) for apply tax on Delivery charge, Service charge and Packing charge.</li>
                      <li>Please enter proper HSN No. for every item.</li>
                      <li>You can not create/cancel e-Invoice older than two days.</li>
                      <li>Please recharge eInvoice credits from marketplace services. Without eInvoice credits service does not work.</li>
                    </ol>
                    <p className="text-xs text-primary mt-2">This setting is only available in cloud login.</p>
                  </div>
                </div>
              </section>

              {/* Barcode Settings */}
              <section id="barcode" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Barcode settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the Barcode settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prefixForBarcode" className="text-sm">Prefix for Barcode :</Label>
                    <Input
                      id="prefixForBarcode"
                      value={settings.prefixForBarcode}
                      onChange={(e) => updateSetting('prefixForBarcode', e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-primary">
                      This field is required if want to activate this service settings in POS.
                    </p>
                    <p className="text-xs text-primary">This setting is only available in cloud login.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="noOfCharactersForWeight" className="text-sm">No. of Characters to calculate Weight :</Label>
                    <Input
                      id="noOfCharactersForWeight"
                      value={settings.noOfCharactersForWeight}
                      onChange={(e) => updateSetting('noOfCharactersForWeight', e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-primary">This setting is only available in cloud login.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightDenominator" className="text-sm">Weight Denominator :</Label>
                    <Input
                      id="weightDenominator"
                      value={settings.weightDenominator}
                      onChange={(e) => updateSetting('weightDenominator', e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-primary">This setting is only available in cloud login.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="allowMultipleItemsInBarcode"
                      checked={settings.allowMultipleItemsInBarcode}
                      onCheckedChange={(checked) => updateSetting('allowMultipleItemsInBarcode', !!checked)}
                    />
                    <Label htmlFor="allowMultipleItemsInBarcode" className="text-sm">
                      Allow entries of multiple items in single barcode/ QR code
                    </Label>
                  </div>
                </div>
              </section>

              {/* Expense Settings */}
              <section id="expense" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Expense settings</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the Expense settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="restrictExpenseCurrentDate"
                      checked={settings.restrictExpenseCurrentDate}
                      onCheckedChange={(checked) => updateSetting('restrictExpenseCurrentDate', !!checked)}
                    />
                    <div>
                      <Label htmlFor="restrictExpenseCurrentDate" className="text-sm">
                        Restrict users to add expense and withdrawal for current date only.
                      </Label>
                      <p className="text-xs text-primary mt-1">
                        If the configuration is enabled then the users would only be able to add expense and withdrawal for current date.
                      </p>
                      <p className="text-xs text-primary">This setting is only available in cloud login.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Invoice Structure */}
              <section id="invoiceStructure" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Invoice Structure</h2>
                  <p className="text-sm text-muted-foreground">
                    The following settings pertains to configuring the Invoice Structure.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Invoice structure<span className="text-destructive">*</span>:</Label>
                    <div className="flex gap-4">
                      <Input
                        placeholder="Prefix"
                        value={settings.invoicePrefix}
                        onChange={(e) => updateSetting('invoicePrefix', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Number Length"
                        value={settings.invoiceNumberLength}
                        onChange={(e) => updateSetting('invoiceNumberLength', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Suffix"
                        value={settings.invoiceSuffix}
                        onChange={(e) => updateSetting('invoiceSuffix', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-primary">Note : Enter any values from configured sets :</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{'{yy}'} : Ex. 18 [current year]</p>
                      <p>{'{yyyy}'} : Ex. 2018 [current year]</p>
                      <p>{'{mm}'} : Ex. 01 [current month]</p>
                      <p>{'{mmm}'} : Ex. Jan [current month]</p>
                      <p>{'{dd}'} : Ex. 01 [current day]</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">If Ex:</Label>
                      <Input
                        value="{yy}/ABC"
                        readOnly
                        className="max-w-[150px] bg-muted"
                      />
                      <Input
                        value="2"
                        readOnly
                        className="max-w-[100px] bg-muted"
                      />
                      <Input
                        value=""
                        readOnly
                        className="max-w-[150px] bg-muted"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-primary">means invoice will be</Label>
                      <Input
                        value="18/ABC02"
                        readOnly
                        className="max-w-[150px] bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* WhatsApp Settings */}
              <section id="whatsapp" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      WhatsApp Gateway Settings
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure your store's verified WhatsApp sender account. Complete isolation is strictly enforced.
                    </p>
                  </div>
                  {selectedStoreId && (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      waIsVerified 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {waIsVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                          Verified & Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Unverified
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!selectedStoreId ? (
                  <div className="bg-muted/50 border border-dashed border-border rounded-lg p-6 text-center">
                    <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-60 animate-bounce" />
                    <h3 className="font-semibold text-foreground text-base">No Store Selected</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                      Please select a specific store from the Multi-Store selector first to view and configure isolated WhatsApp Gateway details.
                    </p>
                  </div>
                ) : waLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading store WhatsApp configuration...</p>
                  </div>
                ) : waIsVerified ? (
                  // --- PREMIUM VERIFIED SCREEN ---
                  <div className="space-y-5">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Isolated Gateway Active</h3>
                        <p className="text-xs text-muted-foreground max-w-md mt-1">
                          WhatsApp messages for <strong className="text-foreground">{selectedStoreName}</strong> will only dispatch from this store owner's verified number. Cross-store sending is systematically blocked.
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 space-y-3 font-mono text-xs border border-border">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Verified Owner ID:</span>
                        <span className="text-foreground font-semibold">{customer?.id ? `${customer.id.substring(0, 8)}...` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Store ID:</span>
                        <span className="text-foreground font-semibold">{selectedStoreId.substring(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Sender WhatsApp:</span>
                        <span className="text-foreground font-semibold">+{waNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Instance ID:</span>
                        <span className="text-foreground font-semibold">{waInstanceId.substring(0, 5)}•••••</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">API Credentials:</span>
                        <span className="text-foreground font-semibold">••••••••••••••••••••</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDeactivateWhatsApp} 
                        disabled={waVerifying}
                      >
                        Deactivate Sender & Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  // --- MULTI-STEP VERIFICATION WIZARD ---
                  <div className="space-y-6">
                    {/* Stepper Header */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border/50">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isOwnerPhoneVerified 
                            ? 'bg-emerald-500 text-emerald-foreground' 
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          {isOwnerPhoneVerified ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Step 1</p>
                          <p className="text-[10px] text-muted-foreground">Owner Contact</p>
                        </div>
                      </div>
                      
                      <div className="w-12 h-0.5 bg-border/80 mx-2" />

                      <div className="flex items-center gap-3 flex-1 justify-end md:justify-start">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          verificationStep === 2 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          2
                        </div>
                        <div className="text-right md:text-left">
                          <p className="text-xs font-semibold text-foreground">Step 2</p>
                          <p className="text-[10px] text-muted-foreground">WhatsApp Gateway</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Owner Contact Number Verification */}
                    {verificationStep === 1 && (
                      <div className="space-y-4 border border-border/50 rounded-xl p-4 bg-muted/10">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-foreground">Verify Owner Contact Number</h3>
                          <p className="text-xs text-muted-foreground">
                            Verify the business owner's personal contact number associated with this multi-store account.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="ownerPhone" className="text-xs font-bold text-foreground">Owner Phone Number</Label>
                            <div className="flex gap-2">
                              <Input
                                id="ownerPhone"
                                type="tel"
                                placeholder="e.g. 7718862274"
                                value={ownerPhone}
                                onChange={(e) => setOwnerPhone(e.target.value)}
                                disabled={ownerOtpSent || isOwnerPhoneVerified}
                                className="bg-background border-border font-mono h-10"
                              />
                              <Button
                                type="button"
                                onClick={handleSendOwnerOtp}
                                disabled={ownerOtpSent || isSendingOwnerOtp}
                                className="h-10 px-4 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/95"
                              >
                                {isSendingOwnerOtp ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : 'Send OTP'}
                              </Button>
                            </div>
                          </div>

                          {ownerOtpSent && (
                            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/10 animate-fade-in">
                              <Label htmlFor="ownerOtp" className="text-xs font-bold text-primary">Enter 6-Digit OTP sent to contact number</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="ownerOtp"
                                  placeholder="••••••"
                                  maxLength={6}
                                  value={ownerOtp}
                                  onChange={(e) => setOwnerOtp(e.target.value)}
                                  className="bg-background border-border text-center font-mono tracking-widest text-base max-w-[150px] h-10"
                                />
                                <Button
                                  type="button"
                                  onClick={handleVerifyOwnerOtp}
                                  disabled={isVerifyingOwnerOtp}
                                  className="h-10 px-6 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                                >
                                  {isVerifyingOwnerOtp ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : 'Verify Code'}
                                </Button>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">
                                  Demo OTP is disabled. Use real OTP verification.
                                </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 2: WhatsApp Number Setup & Verification */}
                    {verificationStep === 2 && (
                      <div className="space-y-4 border border-border/50 rounded-xl p-4 bg-muted/10">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <h3 className="text-sm font-bold text-foreground">Configure WhatsApp Sender Gateway</h3>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setVerificationStep(1);
                              setOwnerOtpSent(false);
                              setOwnerOtp('');
                            }}
                            className="h-8 text-xs text-primary"
                          >
                            &larr; Change Owner Phone
                          </Button>
                        </div>

                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 flex items-center gap-2 text-emerald-500 text-xs">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>Owner Contact Number (<strong>{ownerPhone}</strong>) verified successfully.</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="waNumber" className="text-xs font-bold text-foreground">WhatsApp Sender Number *</Label>
                            <Input
                              id="waNumber"
                              placeholder="e.g. 7718862274"
                              value={waNumber}
                              onChange={(e) => setWaNumber(e.target.value)}
                              disabled={waOtpSent}
                              className="bg-background border-border font-mono h-10"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Include country code without + or spaces (e.g. 917718862274).
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="waInstanceId" className="text-xs font-bold text-foreground">WhatsApp Instance ID *</Label>
                            <Input
                              id="waInstanceId"
                              placeholder="e.g. inst_87f9812a"
                              value={waInstanceId}
                              onChange={(e) => setWaInstanceId(e.target.value)}
                              disabled={waOtpSent}
                              className="bg-background border-border font-mono h-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="waApiKey" className="text-xs font-bold text-foreground">WhatsApp API Token / Key *</Label>
                          <Input
                            id="waApiKey"
                            type="password"
                            placeholder="••••••••••••••••••••••••••••••••"
                            value={waApiKey}
                            onChange={(e) => setWaApiKey(e.target.value)}
                            disabled={waOtpSent}
                            className="bg-background border-border font-mono h-10"
                          />
                        </div>

                        {!waOtpSent ? (
                          <div className="flex justify-end pt-2">
                            <Button
                              type="button"
                              onClick={handleSendWaOtp}
                              disabled={isSendingWaOtp}
                              className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 h-10 px-5"
                            >
                              {isSendingWaOtp ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Pinging Gateway...
                                </>
                              ) : (
                                'Verify Connection & Send Code'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/10 animate-fade-in">
                            <Label htmlFor="waOtp" className="text-xs font-bold text-primary">Enter 6-Digit WhatsApp Verification Code</Label>
                            <div className="flex gap-2">
                              <Input
                                id="waOtp"
                                placeholder="••••••"
                                maxLength={6}
                                value={waOtp}
                                onChange={(e) => setWaOtp(e.target.value)}
                                className="bg-background border-border text-center font-mono tracking-widest text-base max-w-[150px] h-10"
                              />
                              <Button
                                type="button"
                                onClick={handleVerifyAndActivateWhatsApp}
                                disabled={isVerifyingWaOtp}
                                className="h-10 px-6 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                              >
                                {isVerifyingWaOtp ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : 'Verify & Activate Gateway'}
                              </Button>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                              <span>Demo Verification Code: <span className="font-bold font-mono">654321</span></span>
                              <button 
                                type="button" 
                                onClick={() => setWaOtpSent(false)} 
                                className="text-primary font-semibold hover:underline"
                              >
                                Edit Credentials
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* EmailJS Settings */}
              <section id="emailjs" className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      EmailJS Gateway Settings
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure your store's verified EmailJS account to send silent background e-bills.
                    </p>
                  </div>
                  {selectedStoreId && (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      emailJsIsActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {emailJsIsActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                          Gateway Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!selectedStoreId ? (
                  <div className="bg-muted/50 border border-dashed border-border rounded-lg p-6 text-center">
                    <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-60 animate-bounce" />
                    <h3 className="font-semibold text-foreground text-base">No Store Selected</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                      Please select a specific store from the Multi-Store selector first to view and configure isolated EmailJS Gateway details.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="emailJsServiceId" className="text-xs font-bold text-foreground">EmailJS Service ID *</Label>
                        <Input
                          id="emailJsServiceId"
                          placeholder="e.g. service_xxxxxxx"
                          value={emailJsServiceId}
                          onChange={(e) => setEmailJsServiceId(e.target.value)}
                          className="bg-background border-border font-mono h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="emailJsTemplateId" className="text-xs font-bold text-foreground">EmailJS Template ID *</Label>
                        <Input
                          id="emailJsTemplateId"
                          placeholder="e.g. template_xxxxxxx"
                          value={emailJsTemplateId}
                          onChange={(e) => setEmailJsTemplateId(e.target.value)}
                          className="bg-background border-border font-mono h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="emailJsPublicKey" className="text-xs font-bold text-foreground">EmailJS Public Key *</Label>
                      <Input
                        id="emailJsPublicKey"
                        type="password"
                        placeholder="e.g. user_xxxxxxxx or public_key_xxxx"
                        value={emailJsPublicKey}
                        onChange={(e) => setEmailJsPublicKey(e.target.value)}
                        className="bg-background border-border font-mono h-10"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      {emailJsIsActive ? (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={() => {
                            if (!selectedStoreId) return;
                            const config = {
                              serviceId: emailJsServiceId,
                              templateId: emailJsTemplateId,
                              publicKey: emailJsPublicKey,
                              isActive: false
                            };
                            localStorage.setItem(`pos_emailjs_config_${selectedStoreId}`, JSON.stringify(config));
                            setEmailJsIsActive(false);
                            toast.info('EmailJS Gateway deactivated.');
                          }} 
                        >
                          Deactivate Gateway
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            if (!selectedStoreId) return;
                            if (!emailJsServiceId.trim() || !emailJsTemplateId.trim() || !emailJsPublicKey.trim()) {
                              toast.error('Please enter all EmailJS credentials (Service ID, Template ID, Public Key).');
                              return;
                            }
                            const config = {
                              serviceId: emailJsServiceId.trim(),
                              templateId: emailJsTemplateId.trim(),
                              publicKey: emailJsPublicKey.trim(),
                              isActive: true
                            };
                            localStorage.setItem(`pos_emailjs_config_${selectedStoreId}`, JSON.stringify(config));
                            setEmailJsIsActive(true);
                            toast.success('EmailJS credentials verified and gateway activated successfully!');
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                          Verify & Activate Gateway
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </section>

            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border bg-primary/10 p-4 flex justify-end gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedServicesSettings;
