import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface DisplaySettingsProps {
  onBack: () => void;
}

interface DisplaySettingsState {
  // Display settings
  layoutForBillingScreen: 'keyboard' | 'touchScreen';
  displayPreferenceForMenu: 'left' | 'right';
  defaultScreenToDisplay: 'billing' | 'tableManagement';
  orderLiveView: 'asc' | 'desc';
  kotLiveView: 'asc' | 'desc';
  kptBreachedOnTop: boolean;
  displayAlertsForPrepTime: boolean;
  addNewItemInCart: 'bottom' | 'top';
  enableVirtualKeyboard: boolean;
  openVirtualKeyboardOnlineOrder: boolean;
  displayItemImages: boolean;
  autoAddItemsOnSelect: boolean;
  autoAddItemsFromVariation: boolean;
  displaySearchItemOption: boolean;
  addonMinMaxValidation: boolean;
  displayItemPrice: boolean;
  displaySettleAmountTextbox: boolean;
  makeSettlementMandatory: boolean;
  allowSettleLowerAmount: boolean;
  displaySettleAndSaveButton: boolean;
  showTip: boolean;
  tipSelectionType: 'none' | 'percentage' | 'fixed';
  tipValue: string;
  showCWT: boolean;
  defaultMakeTaxAreaOpen: boolean;
  showKOTDetails: boolean;
  mergeEbillAndPrint: boolean;
  noOfPersonsMandatory: boolean;
  showAddonQuantity: boolean;
  displayPrinterErrors: boolean;
  customPaymentInfoMandatory: boolean;
  noDecimalQuantity: boolean;
  quickLinksOption: 'savePrint' | 'viewKot' | 'both';
  displayMenu: 'none' | 'groupWise';
  categorySchedulingOffline: boolean;
  showSuggestedItems: boolean;
  assignToValidation: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  markOrderKOTCompleted: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  itemSorting: string;
  showTableStartBy: boolean;
  tablesEnabled: boolean; // Enable/disable tables feature
  
  // Default Values
  defaultOrderType: string;
  defaultPaymentType: string;
  defaultTableNo: string;
  defaultPettyCash: string;
  itemQuantity: string;
  itemPrice: string;
  defaultQuantity: string;
  finalizeOrder: boolean;
  fontConfiguration: string;
  defaultLoginScreen: 'usernamePassword' | 'passcode' | 'swipeCard';
  
  // Section Configuration
  deliveryLabel: string;
  deliveryEnabled: boolean;
  pickUpLabel: string;
  pickUpEnabled: boolean;
  dineInLabel: string;
  dineInEnabled: boolean;
  
  // Table Settlement
  lockActiveTable: 'savePrint' | 'settleAndSave' | 'none';
  releaseTableOn: 'printBill' | 'settleAndSave';
  releaseRecentSectionOn: 'printBill' | 'settleAndSave';
  releaseRecentOnOrderDelivered: boolean;
  
  // Discount
  discountLabel: string;
  discountButtonText: string;
  displayLeaveAsIs: boolean;
  defaultDiscountAreaOpen: boolean;
  
  // Order Wise Information
  enableOrderWiseInfo: boolean;
  
  // Negative Quantity Settings
  negativeQuantityReason: string;
  allowNegativeQuantity: boolean;
  
  // Order Cancel Reason Settings
  orderCancelReason1: string;
  orderCancelReason2: string;
  orderCancelReason3: string;
  orderCancelReason4: string;
  showBillerReleaseKOTs: boolean;
  orderCancelOTP: string;
  
  // Order Edit Reason Settings
  orderEditReason1: string;
  orderEditReason2: string;
  orderEditReason3: string;
  orderEditReason4: string;
  orderEditOTP: string;
  
  // Order Complimentary Reason Settings
  orderComplimentaryReason1: string;
  orderComplimentaryReason2: string;
  orderComplimentaryReason3: string;
  orderComplimentaryReason4: string;
  orderComplimentaryOTP: string;
  
  // Order Sales Return Reason Settings
  orderSalesReturnReason1: string;
  orderSalesReturnReason2: string;
  orderSalesReturnReason3: string;
  orderSalesReturnReason4: string;
  orderSalesReturnOTP: string;
  
  // Lower/Higher Order Settlement
  reasonForSettlingOrderAmount: boolean;
  
  // Special Order Discount Settings
  specialDiscountOTP: string;
  
  // Item Price Change (NC) Reason Settings
  itemPriceChangeReason1: string;
  itemPriceChangeReason2: string;
  itemPriceChangeReason3: string;
  itemPriceChangeReason4: string;
}

const menuItems = [
  { id: 'displaySettings', label: 'Display settings' },
  { id: 'businessType', label: 'Business Type' },
  { id: 'defaultValues', label: 'Default Values' },
  { id: 'paymentOptions', label: 'Payment Options' },
  { id: 'sectionConfiguration', label: 'Section configuration' },
  { id: 'tableSettlement', label: 'Table Settlement' },
  { id: 'discount', label: 'Discount' },
  { id: 'orderWiseInfo', label: 'Order Wise Information' },
  { id: 'negativeQuantity', label: 'Negative Quantity Settings' },
  { id: 'orderCancelReason', label: 'Order Cancel Reason Settings' },
  { id: 'orderEditReason', label: 'Order Edit Reason Settings' },
  { id: 'orderComplimentaryReason', label: 'Order Complimentary Reason Settings' },
  { id: 'orderSalesReturnReason', label: 'Order Sales Return Reason Settings' },
  { id: 'lowerHigherSettlement', label: 'Lower/Higher Settlement Settings' },
  { id: 'specialOrderDiscount', label: 'Special Order Discount Settings' },
  { id: 'itemPriceChange', label: 'Item Price Change (NC) Reason Settings' },
];

const DisplaySettings: React.FC<DisplaySettingsProps> = ({ onBack }) => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const [activeSection, setActiveSection] = useState('displaySettings');
  const [settings, setSettings] = useState<DisplaySettingsState>({
    layoutForBillingScreen: 'touchScreen',
    displayPreferenceForMenu: 'left',
    defaultScreenToDisplay: 'billing',
    orderLiveView: 'desc',
    kotLiveView: 'asc',
    kptBreachedOnTop: true,
    displayAlertsForPrepTime: true,
    addNewItemInCart: 'bottom',
    enableVirtualKeyboard: false,
    openVirtualKeyboardOnlineOrder: false,
    displayItemImages: false,
    autoAddItemsOnSelect: false,
    autoAddItemsFromVariation: false,
    displaySearchItemOption: true,
    addonMinMaxValidation: false,
    displayItemPrice: false,
    displaySettleAmountTextbox: true,
    makeSettlementMandatory: false,
    allowSettleLowerAmount: true,
    displaySettleAndSaveButton: false,
    showTip: true,
    tipSelectionType: 'none',
    tipValue: '',
    showCWT: true,
    defaultMakeTaxAreaOpen: false,
    showKOTDetails: false,
    mergeEbillAndPrint: true,
    noOfPersonsMandatory: false,
    showAddonQuantity: true,
    displayPrinterErrors: true,
    customPaymentInfoMandatory: false,
    noDecimalQuantity: false,
    quickLinksOption: 'both',
    displayMenu: 'none',
    categorySchedulingOffline: false,
    showSuggestedItems: true,
    assignToValidation: { delivery: false, pickUp: false, dineIn: false },
    markOrderKOTCompleted: { delivery: false, pickUp: false, dineIn: true },
    itemSorting: 'a-z',
    showTableStartBy: false,
    tablesEnabled: true,
    defaultOrderType: 'dineIn',
    defaultPaymentType: 'cash',
    defaultTableNo: '1',
    defaultPettyCash: '2000',
    itemQuantity: '1,2,3,5,10',
    itemPrice: '5,10,25,50,100',
    defaultQuantity: '1',
    finalizeOrder: false,
    fontConfiguration: 'default',
    defaultLoginScreen: 'usernamePassword',
    deliveryLabel: 'Delivery',
    deliveryEnabled: true,
    pickUpLabel: 'Pick Up',
    pickUpEnabled: true,
    dineInLabel: 'Dine In',
    dineInEnabled: true,
    lockActiveTable: 'savePrint',
    releaseTableOn: 'printBill',
    releaseRecentSectionOn: 'printBill',
    releaseRecentOnOrderDelivered: false,
    discountLabel: 'Coupon Code',
    discountButtonText: 'Apply',
    displayLeaveAsIs: true,
    defaultDiscountAreaOpen: false,
    enableOrderWiseInfo: false,
    negativeQuantityReason: '',
    allowNegativeQuantity: false,
    orderCancelReason1: '',
    orderCancelReason2: '',
    orderCancelReason3: '',
    orderCancelReason4: '',
    showBillerReleaseKOTs: false,
    orderCancelOTP: '',
    orderEditReason1: '',
    orderEditReason2: '',
    orderEditReason3: '',
    orderEditReason4: '',
    orderEditOTP: '',
    orderComplimentaryReason1: '',
    orderComplimentaryReason2: '',
    orderComplimentaryReason3: '',
    orderComplimentaryReason4: '',
    orderComplimentaryOTP: '',
    orderSalesReturnReason1: '',
    orderSalesReturnReason2: '',
    orderSalesReturnReason3: '',
    orderSalesReturnReason4: '',
    orderSalesReturnOTP: '',
    reasonForSettlingOrderAmount: false,
    specialDiscountOTP: '',
    itemPriceChangeReason1: '',
    itemPriceChangeReason2: '',
    itemPriceChangeReason3: '',
    itemPriceChangeReason4: '',
  });

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<DisplaySettingsState>('displaySettings');
    if (saved) {
      setSettings(prev => ({ ...prev, ...saved }));
    }
  }, [isLoaded, getSetting]);

  const handleSave = () => {
    saveSetting('displaySettings', settings);
    toast.success('Settings saved successfully');
  };

  const updateSetting = <K extends keyof DisplaySettingsState>(key: K, value: DisplaySettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderDisplaySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Display settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following setting defines the default value for the components of billing screen.</p>
      </div>

      {/* Layout for Billing Screen */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Layout for Billing Screen :</Label>
        <RadioGroup
          value={settings.layoutForBillingScreen}
          onValueChange={(v) => updateSetting('layoutForBillingScreen', v as 'keyboard' | 'touchScreen')}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="keyboard" id="keyboard" />
            <Label htmlFor="keyboard">Keyboard</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="touchScreen" id="touchScreen" />
            <Label htmlFor="touchScreen">Touch Screen</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-primary">Configure the type of display between a touch based or keyboard based.</p>
      </div>

      {/* Display preference for Menu */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Display preference for the Menu :</Label>
        <RadioGroup
          value={settings.displayPreferenceForMenu}
          onValueChange={(v) => updateSetting('displayPreferenceForMenu', v as 'left' | 'right')}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="left" id="menuLeft" />
            <Label htmlFor="menuLeft">On the Left</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="right" id="menuRight" />
            <Label htmlFor="menuRight">On the Right</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-primary">Note: Only for Touch Screen</p>
      </div>

      {/* Default Screen to Display */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Default Screen to Display :</Label>
        <RadioGroup
          value={settings.defaultScreenToDisplay}
          onValueChange={(v) => updateSetting('defaultScreenToDisplay', v as 'billing' | 'tableManagement')}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="billing" id="billing" />
            <Label htmlFor="billing">Billing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tableManagement" id="tableManagement" />
            <Label htmlFor="tableManagement">Table Management</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-primary">Configure the type of display between a touch based or keyboard based.</p>
      </div>

      {/* Order Live View */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Order Live View :</Label>
        <RadioGroup
          value={settings.orderLiveView}
          onValueChange={(v) => updateSetting('orderLiveView', v as 'asc' | 'desc')}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="asc" id="orderAsc" />
            <Label htmlFor="orderAsc">ASC</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="desc" id="orderDesc" />
            <Label htmlFor="orderDesc">DESC</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-primary">This settings describe how would the orders be displayed in Order live view.</p>
      </div>

      {/* KOT Live View */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">KOT Live View :</Label>
        <RadioGroup
          value={settings.kotLiveView}
          onValueChange={(v) => updateSetting('kotLiveView', v as 'asc' | 'desc')}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="asc" id="kotAsc" />
            <Label htmlFor="kotAsc">ASC</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="desc" id="kotDesc" />
            <Label htmlFor="kotDesc">DESC</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-primary">This settings describe how would the orders be displayed in KOT live view.</p>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="kptBreachedOnTop"
            checked={settings.kptBreachedOnTop}
            onCheckedChange={(v) => updateSetting('kptBreachedOnTop', !!v)}
          />
          <Label htmlFor="kptBreachedOnTop" className="text-sm">KPT breached order should remain on top of the screen in live view</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayAlertsForPrepTime"
            checked={settings.displayAlertsForPrepTime}
            onCheckedChange={(v) => updateSetting('displayAlertsForPrepTime', !!v)}
          />
          <Label htmlFor="displayAlertsForPrepTime" className="text-sm">Display alerts for prep time exceeding or order handover on the live view card</Label>
        </div>

        {/* Add New Item In Cart */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Add New Item In Cart :</Label>
          <RadioGroup
            value={settings.addNewItemInCart}
            onValueChange={(v) => updateSetting('addNewItemInCart', v as 'bottom' | 'top')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom" id="inBottom" />
              <Label htmlFor="inBottom">In Bottom</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="top" id="onTop" />
              <Label htmlFor="onTop">On Top</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableVirtualKeyboard"
            checked={settings.enableVirtualKeyboard}
            onCheckedChange={(v) => updateSetting('enableVirtualKeyboard', !!v)}
          />
          <Label htmlFor="enableVirtualKeyboard" className="text-sm">Enable virtual keyboard in touch</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="openVirtualKeyboardOnlineOrder"
            checked={settings.openVirtualKeyboardOnlineOrder}
            onCheckedChange={(v) => updateSetting('openVirtualKeyboardOnlineOrder', !!v)}
          />
          <Label htmlFor="openVirtualKeyboardOnlineOrder" className="text-sm">Open virtual keyboard while entering order number in online order food ready text box</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayItemImages"
            checked={settings.displayItemImages}
            onCheckedChange={(v) => updateSetting('displayItemImages', !!v)}
          />
          <Label htmlFor="displayItemImages" className="text-sm">Display item images on the billing screen</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoAddItemsOnSelect"
            checked={settings.autoAddItemsOnSelect}
            onCheckedChange={(v) => updateSetting('autoAddItemsOnSelect', !!v)}
          />
          <Label htmlFor="autoAddItemsOnSelect" className="text-sm">Auto add items to billing screen on select.</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoAddItemsFromVariation"
            checked={settings.autoAddItemsFromVariation}
            onCheckedChange={(v) => updateSetting('autoAddItemsFromVariation', !!v)}
          />
          <Label htmlFor="autoAddItemsFromVariation" className="text-sm">Auto add items to billing screen from variation/addon popup.</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displaySearchItemOption"
            checked={settings.displaySearchItemOption}
            onCheckedChange={(v) => updateSetting('displaySearchItemOption', !!v)}
          />
          <Label htmlFor="displaySearchItemOption" className="text-sm">Display Search Item option on billing screen (Only for Touch view)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="addonMinMaxValidation"
            checked={settings.addonMinMaxValidation}
            onCheckedChange={(v) => updateSetting('addonMinMaxValidation', !!v)}
          />
          <Label htmlFor="addonMinMaxValidation" className="text-sm">Addon Min-Max Validation</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayItemPrice"
            checked={settings.displayItemPrice}
            onCheckedChange={(v) => updateSetting('displayItemPrice', !!v)}
          />
          <Label htmlFor="displayItemPrice" className="text-sm">Display item price</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displaySettleAmountTextbox"
            checked={settings.displaySettleAmountTextbox}
            onCheckedChange={(v) => updateSetting('displaySettleAmountTextbox', !!v)}
          />
          <Label htmlFor="displaySettleAmountTextbox" className="text-sm">Display settle amount Textbox</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="makeSettlementMandatory"
            checked={settings.makeSettlementMandatory}
            onCheckedChange={(v) => updateSetting('makeSettlementMandatory', !!v)}
          />
          <Label htmlFor="makeSettlementMandatory" className="text-sm">Make settlement amount mandatory</Label>
        </div>
        <p className="text-xs text-primary ml-6">If this configuration is enabled, the biller must enter the settlement amount. This applies to billers who have settlement rights.</p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowSettleLowerAmount"
            checked={settings.allowSettleLowerAmount}
            onCheckedChange={(v) => updateSetting('allowSettleLowerAmount', !!v)}
          />
          <Label htmlFor="allowSettleLowerAmount" className="text-sm">Allow user to settle an order with a lower amount</Label>
        </div>
        <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displaySettleAndSaveButton"
            checked={settings.displaySettleAndSaveButton}
            onCheckedChange={(v) => updateSetting('displaySettleAndSaveButton', !!v)}
          />
          <Label htmlFor="displaySettleAndSaveButton" className="text-sm">Display Settle and Save button for delivery and pickup orders on live view card</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showTip"
            checked={settings.showTip}
            onCheckedChange={(v) => updateSetting('showTip', !!v)}
          />
          <Label htmlFor="showTip" className="text-sm">Show Tip</Label>
        </div>

        {/* Set Tip selection as */}
        <div className="space-y-2 ml-6">
          <Label className="text-sm font-medium">Set Tip selection as :</Label>
          <RadioGroup
            value={settings.tipSelectionType}
            onValueChange={(v) => updateSetting('tipSelectionType', v as 'none' | 'percentage' | 'fixed')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="tipNone" />
              <Label htmlFor="tipNone">None</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="tipPercentage" />
              <Label htmlFor="tipPercentage">Percentage</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="tipFixed" />
              <Label htmlFor="tipFixed">Fixed</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-primary">This configuration would be for customer selection of tip in Kiosk.</p>
        </div>

        <div className="space-y-2 ml-6">
          <Label className="text-sm font-medium">Set Tip value :</Label>
          <Input
            value={settings.tipValue}
            onChange={(e) => updateSetting('tipValue', e.target.value)}
            placeholder=""
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">(Comma separated numeric values only.)</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showCWT"
            checked={settings.showCWT}
            onCheckedChange={(v) => updateSetting('showCWT', !!v)}
          />
          <Label htmlFor="showCWT" className="text-sm">Show CWT(Category Wise Taxes) Bifurcation On Billing Screen</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="defaultMakeTaxAreaOpen"
            checked={settings.defaultMakeTaxAreaOpen}
            onCheckedChange={(v) => updateSetting('defaultMakeTaxAreaOpen', !!v)}
          />
          <Label htmlFor="defaultMakeTaxAreaOpen" className="text-sm">By default make tax area open</Label>
        </div>
        <p className="text-xs text-primary ml-6">This settings enables default display of tax area in billing screen</p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showKOTDetails"
            checked={settings.showKOTDetails}
            onCheckedChange={(v) => updateSetting('showKOTDetails', !!v)}
          />
          <Label htmlFor="showKOTDetails" className="text-sm">Show KOT details (KOT ID and Time) while View/Merge KOT</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="mergeEbillAndPrint"
            checked={settings.mergeEbillAndPrint}
            onCheckedChange={(v) => updateSetting('mergeEbillAndPrint', !!v)}
          />
          <Label htmlFor="mergeEbillAndPrint" className="text-sm">Merge ebill and print bill.</Label>
        </div>
        <p className="text-xs text-primary ml-6">This settings send e-bill when the bill is printed.</p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="noOfPersonsMandatory"
            checked={settings.noOfPersonsMandatory}
            onCheckedChange={(v) => updateSetting('noOfPersonsMandatory', !!v)}
          />
          <Label htmlFor="noOfPersonsMandatory" className="text-sm">No. of Persons Mandatory</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showAddonQuantity"
            checked={settings.showAddonQuantity}
            onCheckedChange={(v) => updateSetting('showAddonQuantity', !!v)}
          />
          <Label htmlFor="showAddonQuantity" className="text-sm">Show Addon Quantity with the total item quantity (multiplication) to prepare in Bill.</Label>
        </div>
        <p className="text-xs text-primary ml-6">Order / KOT Live view and KDS.</p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayPrinterErrors"
            checked={settings.displayPrinterErrors}
            onCheckedChange={(v) => updateSetting('displayPrinterErrors', !!v)}
          />
          <Label htmlFor="displayPrinterErrors" className="text-sm">Display errors while checking printer status.</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="customPaymentInfoMandatory"
            checked={settings.customPaymentInfoMandatory}
            onCheckedChange={(v) => updateSetting('customPaymentInfoMandatory', !!v)}
          />
          <Label htmlFor="customPaymentInfoMandatory" className="text-sm">Custom Payment Information Mandatory</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="noDecimalQuantity"
            checked={settings.noDecimalQuantity}
            onCheckedChange={(v) => updateSetting('noDecimalQuantity', !!v)}
          />
          <Label htmlFor="noDecimalQuantity" className="text-sm">Do not allow the biller to punch item quantity in decimal</Label>
        </div>

        {/* Quick links option */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Set option for quick links for items in table view screen.</Label>
          <RadioGroup
            value={settings.quickLinksOption}
            onValueChange={(v) => updateSetting('quickLinksOption', v as 'savePrint' | 'viewKot' | 'both')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="savePrint" id="savePrint" />
              <Label htmlFor="savePrint">Save & Print</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="viewKot" id="viewKot" />
              <Label htmlFor="viewKot">View Kot</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="quickBoth" />
              <Label htmlFor="quickBoth">Both</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Display Menu */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Display Menu</Label>
          <RadioGroup
            value={settings.displayMenu}
            onValueChange={(v) => updateSetting('displayMenu', v as 'none' | 'groupWise')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="menuNone" />
              <Label htmlFor="menuNone">None</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groupWise" id="groupWise" />
              <Label htmlFor="groupWise">Group Wise</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="categorySchedulingOffline"
            checked={settings.categorySchedulingOffline}
            onCheckedChange={(v) => updateSetting('categorySchedulingOffline', !!v)}
          />
          <Label htmlFor="categorySchedulingOffline" className="text-sm">Consider category scheduling for offline billing</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showSuggestedItems"
            checked={settings.showSuggestedItems}
            onCheckedChange={(v) => updateSetting('showSuggestedItems', !!v)}
          />
          <Label htmlFor="showSuggestedItems" className="text-sm">Show suggested items against the item selected on billing</Label>
        </div>

        {/* Assign to validation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Assign to validation on billing screen</Label>
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignDelivery"
                checked={settings.assignToValidation.delivery}
                onCheckedChange={(v) => updateSetting('assignToValidation', { ...settings.assignToValidation, delivery: !!v })}
              />
              <Label htmlFor="assignDelivery">Delivery</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignPickUp"
                checked={settings.assignToValidation.pickUp}
                onCheckedChange={(v) => updateSetting('assignToValidation', { ...settings.assignToValidation, pickUp: !!v })}
              />
              <Label htmlFor="assignPickUp">Pick Up</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignDineIn"
                checked={settings.assignToValidation.dineIn}
                onCheckedChange={(v) => updateSetting('assignToValidation', { ...settings.assignToValidation, dineIn: !!v })}
              />
              <Label htmlFor="assignDineIn">Dine In</Label>
            </div>
          </div>
          <p className="text-xs text-primary">Note: Once configured, the bill/KOT must be assigned to an assignee compulsorily for the order type selected.</p>
        </div>

        {/* Mark Order and KOT as completed */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mark Order and KOT as completed once the bill is settled</Label>
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="markDelivery"
                checked={settings.markOrderKOTCompleted.delivery}
                onCheckedChange={(v) => updateSetting('markOrderKOTCompleted', { ...settings.markOrderKOTCompleted, delivery: !!v })}
              />
              <Label htmlFor="markDelivery">Delivery</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="markPickUp"
                checked={settings.markOrderKOTCompleted.pickUp}
                onCheckedChange={(v) => updateSetting('markOrderKOTCompleted', { ...settings.markOrderKOTCompleted, pickUp: !!v })}
              />
              <Label htmlFor="markPickUp">Pick Up</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="markDineIn"
                checked={settings.markOrderKOTCompleted.dineIn}
                onCheckedChange={(v) => updateSetting('markOrderKOTCompleted', { ...settings.markOrderKOTCompleted, dineIn: !!v })}
              />
              <Label htmlFor="markDineIn">Dine In</Label>
            </div>
          </div>
          <p className="text-xs text-primary">Note: Once the bill is settled, the order or KOT would be removed from KDS, Token application. This configuration would not work for online orders</p>
        </div>

        {/* Item Sorting */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Sorting :</Label>
          <Select value={settings.itemSorting} onValueChange={(v) => updateSetting('itemSorting', v)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a-z">A-Z</SelectItem>
              <SelectItem value="z-a">Z-A</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showTableStartBy"
            checked={settings.showTableStartBy}
            onCheckedChange={(v) => updateSetting('showTableStartBy', !!v)}
          />
          <Label htmlFor="showTableStartBy" className="text-sm">Show table start by / bill created by information on billing screen (Touch Screen)</Label>
        </div>
      </div>
    </div>
  );

  const renderDefaultValues = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Default Values</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings are used to configure the default values of the different settings.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Order Type :</Label>
            <Select value={settings.defaultOrderType} onValueChange={(v) => updateSetting('defaultOrderType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dineIn">Dine In</SelectItem>
                <SelectItem value="pickUp">Pick Up</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Payment Type :</Label>
            <Select value={settings.defaultPaymentType} onValueChange={(v) => updateSetting('defaultPaymentType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="due">Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Table No. :</Label>
          <Input
            value={settings.defaultTableNo}
            onChange={(e) => updateSetting('defaultTableNo', e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Petty Cash Amount(₹) *:</Label>
          <Input
            value={settings.defaultPettyCash}
            onChange={(e) => updateSetting('defaultPettyCash', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">This would be the amount of petty cash that would be populated unless another amount is entered.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Quantity :</Label>
          <Input
            value={settings.itemQuantity}
            onChange={(e) => updateSetting('itemQuantity', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">(Comma separated numeric values only.)</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Price :</Label>
          <Input
            value={settings.itemPrice}
            onChange={(e) => updateSetting('itemPrice', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">(Comma separated numeric values only.)</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Quantity * :</Label>
          <Input
            value={settings.defaultQuantity}
            onChange={(e) => updateSetting('defaultQuantity', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">Default Quantity while adding item to cart.</p>
          <p className="text-xs text-primary">Leave it blank if the quantity would be entered manually by the user (In Keyboard Layout).</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="finalizeOrder"
            checked={settings.finalizeOrder}
            onCheckedChange={(v) => updateSetting('finalizeOrder', !!v)}
          />
          <Label htmlFor="finalizeOrder" className="text-sm">Finalize Order</Label>
        </div>
        <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Font Configuration :</Label>
          <Select value={settings.fontConfiguration} onValueChange={(v) => updateSetting('fontConfiguration', v)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Login Screen</Label>
          <RadioGroup
            value={settings.defaultLoginScreen}
            onValueChange={(v) => updateSetting('defaultLoginScreen', v as 'usernamePassword' | 'passcode' | 'swipeCard')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="usernamePassword" id="usernamePassword" />
              <Label htmlFor="usernamePassword">Username / Password</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passcode" id="passcode" />
              <Label htmlFor="passcode">Passcode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipeCard" id="swipeCard" />
              <Label htmlFor="swipeCard">Swipe Card</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );

  const renderPaymentOptions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Payment Options In Billing Screen</h3>
        <p className="text-sm text-muted-foreground mb-4">The selected payment options would be displayed by default in the billing screen, the remaining payment options would be displayed by clicking More.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Option 1 :</Label>
          <p className="text-sm">Cash</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Option 2 :</Label>
          <p className="text-sm">Card</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Option 3 :</Label>
          <p className="text-sm">Due</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Option 4 :</Label>
          <p className="text-sm">Other</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderSectionConfiguration = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Section configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings are used to configure the settings related to different sections of the billing screen.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm">Assign a name which you want to see on "Home Delivery" Section on billing screen.</p>
          <Label className="text-sm font-medium">Delivery *:</Label>
          <Input
            value={settings.deliveryLabel}
            onChange={(e) => updateSetting('deliveryLabel', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">Above name will be reflected on the billing screen. Rest of the functionality for Delivery section will be working as it is with this option. (Best seen with 8 characters.)</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
          
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="deliveryEnabled"
              checked={settings.deliveryEnabled}
              onCheckedChange={(v) => updateSetting('deliveryEnabled', !!v)}
            />
            <Label htmlFor="deliveryEnabled" className="text-sm">Enable this option in the billing screen</Label>
          </div>
          <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm">Assign a name which you want to see on "Pickup" Section on billing screen.</p>
          <Label className="text-sm font-medium">Pick Up*:</Label>
          <Input
            value={settings.pickUpLabel}
            onChange={(e) => updateSetting('pickUpLabel', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">Above name will be reflected on the billing screen. Rest of the functionality for Pickup section will be working as it is with this option. (Best seen with 8 characters.)</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
          
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="pickUpEnabled"
              checked={settings.pickUpEnabled}
              onCheckedChange={(v) => updateSetting('pickUpEnabled', !!v)}
            />
            <Label htmlFor="pickUpEnabled" className="text-sm">Enable this option in the billing screen</Label>
          </div>
          <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm">Assign a name which you want to see on the "Dine In" Section on billing screen.</p>
          <Label className="text-sm font-medium">Dine In*:</Label>
          <Input
            value={settings.dineInLabel}
            onChange={(e) => updateSetting('dineInLabel', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">Above name will be reflected on the billing screen. Rest of the functionality for Dine In section will be working as it is with this option. (Best seen with 8 characters.)</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
          
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="dineInEnabled"
              checked={settings.dineInEnabled}
              onCheckedChange={(v) => updateSetting('dineInEnabled', !!v)}
            />
            <Label htmlFor="dineInEnabled" className="text-sm">Enable this option in the billing screen</Label>
          </div>
          <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderTableSettlement = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Table Settlement</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings helps in configuring locking and releasing table in billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Lock Active Table :</Label>
          <RadioGroup
            value={settings.lockActiveTable}
            onValueChange={(v) => updateSetting('lockActiveTable', v as 'savePrint' | 'settleAndSave' | 'none')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="savePrint" id="lockSavePrint" />
              <Label htmlFor="lockSavePrint">Save & Print</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="settleAndSave" id="lockSettleSave" />
              <Label htmlFor="lockSettleSave">Settle & Save</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="lockNone" />
              <Label htmlFor="lockNone">None</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-primary">Note: This configuration will only work with 105.1.0.0 and above.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Release Table On :</Label>
          <RadioGroup
            value={settings.releaseTableOn}
            onValueChange={(v) => updateSetting('releaseTableOn', v as 'printBill' | 'settleAndSave')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="printBill" id="releasePrintBill" />
              <Label htmlFor="releasePrintBill">Print Bill</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="settleAndSave" id="releaseSettleSave" />
              <Label htmlFor="releaseSettleSave">Settle & Save</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Release Recent Section On :</Label>
          <RadioGroup
            value={settings.releaseRecentSectionOn}
            onValueChange={(v) => updateSetting('releaseRecentSectionOn', v as 'printBill' | 'settleAndSave')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="printBill" id="recentPrintBill" />
              <Label htmlFor="recentPrintBill">Print Bill</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="settleAndSave" id="recentSettleSave" />
              <Label htmlFor="recentSettleSave">Settle & Save</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="releaseRecentOnOrderDelivered"
            checked={settings.releaseRecentOnOrderDelivered}
            onCheckedChange={(v) => updateSetting('releaseRecentOnOrderDelivered', !!v)}
          />
          <Label htmlFor="releaseRecentOnOrderDelivered" className="text-sm">Release Recent Section On Order Delivered (For Online Orders)</Label>
        </div>
      </div>
    </div>
  );

  const renderDiscount = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Discount</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings help in describing the discount in billing screen.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Discount Label :</Label>
          <Input
            value={settings.discountLabel}
            onChange={(e) => updateSetting('discountLabel', e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-primary">This setting would describe what would the discount would be displayed as.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Discount Calculate Button Text *:</Label>
          <Input
            value={settings.discountButtonText}
            onChange={(e) => updateSetting('discountButtonText', e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayLeaveAsIs"
            checked={settings.displayLeaveAsIs}
            onCheckedChange={(v) => updateSetting('displayLeaveAsIs', !!v)}
          />
          <Label htmlFor="displayLeaveAsIs" className="text-sm">Display "Leave as it is. (No Discount)" on Discount Screen?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="defaultDiscountAreaOpen"
            checked={settings.defaultDiscountAreaOpen}
            onCheckedChange={(v) => updateSetting('defaultDiscountAreaOpen', !!v)}
          />
          <Label htmlFor="defaultDiscountAreaOpen" className="text-sm">By default make discount area open</Label>
        </div>
        <p className="text-xs text-primary ml-6">This settings enables default display of discount area in billing screen</p>
      </div>
    </div>
  );

  const renderOrderWiseInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Order Wise Information</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings helps in configures enabling as well as configuring Order wise information</p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="enableOrderWiseInfo"
          checked={settings.enableOrderWiseInfo}
          onCheckedChange={(v) => updateSetting('enableOrderWiseInfo', !!v)}
        />
        <Label htmlFor="enableOrderWiseInfo" className="text-sm">Enable Order wise information</Label>
      </div>
    </div>
  );

  const renderNegativeQuantity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Negative Quantity Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the negative quantity settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Negative Quantity Reason :</Label>
          <Input
            value={settings.negativeQuantityReason}
            onChange={(e) => updateSetting('negativeQuantityReason', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowNegativeQuantity"
            checked={settings.allowNegativeQuantity}
            onCheckedChange={(v) => updateSetting('allowNegativeQuantity', !!v)}
          />
          <Label htmlFor="allowNegativeQuantity" className="text-sm">Allow negative quantity</Label>
        </div>
      </div>
    </div>
  );

  const renderOrderCancelReason = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Order Cancel Reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the order cancel settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Cancel Reason 1 :</Label>
          <Input
            value={settings.orderCancelReason1}
            onChange={(e) => updateSetting('orderCancelReason1', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Cancel Reason 2 :</Label>
          <Input
            value={settings.orderCancelReason2}
            onChange={(e) => updateSetting('orderCancelReason2', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Cancel Reason 3 :</Label>
          <Input
            value={settings.orderCancelReason3}
            onChange={(e) => updateSetting('orderCancelReason3', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Cancel Reason 4 :</Label>
          <Input
            value={settings.orderCancelReason4}
            onChange={(e) => updateSetting('orderCancelReason4', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showBillerReleaseKOTs"
            checked={settings.showBillerReleaseKOTs}
            onCheckedChange={(v) => updateSetting('showBillerReleaseKOTs', !!v)}
          />
          <Label htmlFor="showBillerReleaseKOTs" className="text-sm">
            Show Biller an option to release used KOTs while cancelling a bill. ( within same day KOTs only. ) (So, biller can create new Bill using the older KOTs.)
          </Label>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Cancel OTP:</Label>
          <Input
            value={settings.orderCancelOTP}
            onChange={(e) => updateSetting('orderCancelOTP', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">Enter Email ID through which you will receive OTP while cancel order. You can add more than one with , separated.</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderOrderEditReason = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Order Edit Reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the order edit settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order edit Reason 1 :</Label>
          <Input
            value={settings.orderEditReason1}
            onChange={(e) => updateSetting('orderEditReason1', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order edit Reason 2 :</Label>
          <Input
            value={settings.orderEditReason2}
            onChange={(e) => updateSetting('orderEditReason2', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order edit Reason 3 :</Label>
          <Input
            value={settings.orderEditReason3}
            onChange={(e) => updateSetting('orderEditReason3', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order edit Reason 4 :</Label>
          <Input
            value={settings.orderEditReason4}
            onChange={(e) => updateSetting('orderEditReason4', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Edit OTP :</Label>
          <Input
            value={settings.orderEditOTP}
            onChange={(e) => updateSetting('orderEditOTP', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">Enter Email ID through which you will receive OTP while edit order after print. You can add more than one with , separated.</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderOrderComplimentaryReason = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Order Complimentary Reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the order complimentary settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order complimentary Reason 1 :</Label>
          <Input
            value={settings.orderComplimentaryReason1}
            onChange={(e) => updateSetting('orderComplimentaryReason1', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order complimentary Reason 2 :</Label>
          <Input
            value={settings.orderComplimentaryReason2}
            onChange={(e) => updateSetting('orderComplimentaryReason2', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order complimentary Reason 3 :</Label>
          <Input
            value={settings.orderComplimentaryReason3}
            onChange={(e) => updateSetting('orderComplimentaryReason3', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order complimentary Reason 4 :</Label>
          <Input
            value={settings.orderComplimentaryReason4}
            onChange={(e) => updateSetting('orderComplimentaryReason4', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Complimentary OTP :</Label>
          <Input
            value={settings.orderComplimentaryOTP}
            onChange={(e) => updateSetting('orderComplimentaryOTP', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">Enter Email ID through which you will receive OTP while complimentary order. You can add more than one with , separated.</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderOrderSalesReturnReason = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Order Sales Return Reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the order sales return settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order sales return Reason 1 :</Label>
          <Input
            value={settings.orderSalesReturnReason1}
            onChange={(e) => updateSetting('orderSalesReturnReason1', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order sales return Reason 2 :</Label>
          <Input
            value={settings.orderSalesReturnReason2}
            onChange={(e) => updateSetting('orderSalesReturnReason2', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order sales return Reason 3 :</Label>
          <Input
            value={settings.orderSalesReturnReason3}
            onChange={(e) => updateSetting('orderSalesReturnReason3', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order sales return Reason 4 :</Label>
          <Input
            value={settings.orderSalesReturnReason4}
            onChange={(e) => updateSetting('orderSalesReturnReason4', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Sales Return OTP :</Label>
          <Input
            value={settings.orderSalesReturnOTP}
            onChange={(e) => updateSetting('orderSalesReturnOTP', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">Enter Email ID through which you will receive OTP while sales return order. You can add more than one with , separated.</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderLowerHigherSettlement = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Lower / Higher order settlement amount reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the order settlement settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="reasonForSettlingOrderAmount"
            checked={settings.reasonForSettlingOrderAmount}
            onCheckedChange={(v) => updateSetting('reasonForSettlingOrderAmount', !!v)}
          />
          <Label htmlFor="reasonForSettlingOrderAmount" className="text-sm">Reason for settling order amount other than the invoice total</Label>
        </div>
        <p className="text-xs text-primary ml-6">This setting is only available in cloud login.</p>
      </div>
    </div>
  );

  const renderSpecialOrderDiscount = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Special Order Discount Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the special order discount settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Special Discount OTP :</Label>
          <Input
            value={settings.specialDiscountOTP}
            onChange={(e) => updateSetting('specialDiscountOTP', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">Enter Email ID through which you will receive OTP while Special order discount. You can add more than one with , separated.</p>
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderItemPriceChange = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Item price change (NC) Reason Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">The following settings pertains to configuring the Item price change (NC) settings in the billing screen</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item price change (NC) Reason 1 :</Label>
          <Input
            value={settings.itemPriceChangeReason1}
            onChange={(e) => updateSetting('itemPriceChangeReason1', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Item price change (NC) Reason 2 :</Label>
          <Input
            value={settings.itemPriceChangeReason2}
            onChange={(e) => updateSetting('itemPriceChangeReason2', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Item price change (NC) Reason 3 :</Label>
          <Input
            value={settings.itemPriceChangeReason3}
            onChange={(e) => updateSetting('itemPriceChangeReason3', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Item price change (NC) Reason 4 :</Label>
          <Input
            value={settings.itemPriceChangeReason4}
            onChange={(e) => updateSetting('itemPriceChangeReason4', e.target.value)}
            className="max-w-md"
            disabled
          />
          <p className="text-xs text-primary">This setting is only available in cloud login.</p>
        </div>
      </div>
    </div>
  );

  const renderBusinessType = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Business Type Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure features based on your business type. Turn off features that don't apply to your business.</p>
      </div>

      {/* Tables Enable/Disable */}
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Enable Tables</Label>
            <p className="text-xs text-muted-foreground">Turn this off for shops that don't have table management (e.g., stationery shops, retail stores)</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${!settings.tablesEnabled ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Off</span>
            <button
              onClick={() => updateSetting('tablesEnabled', !settings.tablesEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.tablesEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.tablesEnabled ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm ${settings.tablesEnabled ? 'text-primary font-medium' : 'text-muted-foreground'}`}>On</span>
          </div>
        </div>
        {!settings.tablesEnabled && (
          <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning">Tables feature is disabled. Table management and dine-in orders will be hidden from the app.</p>
          </div>
        )}
      </div>

      {/* Future business type settings can be added here */}
      <div className="p-4 border border-dashed border-border rounded-lg">
        <p className="text-sm text-muted-foreground text-center">More business type settings coming soon...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'displaySettings':
        return renderDisplaySettings();
      case 'businessType':
        return renderBusinessType();
      case 'defaultValues':
        return renderDefaultValues();
      case 'paymentOptions':
        return renderPaymentOptions();
      case 'sectionConfiguration':
        return renderSectionConfiguration();
      case 'tableSettlement':
        return renderTableSettlement();
      case 'discount':
        return renderDiscount();
      case 'orderWiseInfo':
        return renderOrderWiseInfo();
      case 'negativeQuantity':
        return renderNegativeQuantity();
      case 'orderCancelReason':
        return renderOrderCancelReason();
      case 'orderEditReason':
        return renderOrderEditReason();
      case 'orderComplimentaryReason':
        return renderOrderComplimentaryReason();
      case 'orderSalesReturnReason':
        return renderOrderSalesReturnReason();
      case 'lowerHigherSettlement':
        return renderLowerHigherSettlement();
      case 'specialOrderDiscount':
        return renderSpecialOrderDiscount();
      case 'itemPriceChange':
        return renderItemPriceChange();
      default:
        return renderDisplaySettings();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Outlet Settings</span>
            <span className="text-muted-foreground">{'>'}</span>
            <span className="font-semibold text-foreground">Display</span>
          </div>
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-130px)]">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-border bg-card">
          <ScrollArea className="h-full">
            <nav className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? 'text-primary border-l-4 border-primary bg-primary/5 font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            {renderContent()}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border bg-primary/10 p-4 flex justify-end gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettings;
