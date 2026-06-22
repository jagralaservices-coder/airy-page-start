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

interface CalculationsSettingsProps {
  onBack: () => void;
}

interface CalculationsSettingsState {
  // Round-Off Options
  roundOffOption: 'normal' | 'roundUp' | 'roundDown' | 'none';
  roundToIncrements: string;
  decimalPoints: string;

  // Service Charge
  displayServiceCharge: boolean;

  // Container Charge
  showContainerCharge: boolean;
  containerChargeLabel: string;
  containerChargeType: 'itemWise' | 'orderWise' | 'fixPerItem';
  containerChargeAutoCalc: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  calculateTaxOnContainer: boolean;
  containerAmountCondition: 'greaterThan' | 'lessThan' | 'none';
  containerAmount: string;

  // Delivery Charge
  showDeliveryCharge: boolean;
  defaultDeliveryCharge: string;
  calculateTaxOnDelivery: boolean;
  deliveryAmountCondition: 'greaterThan' | 'lessThan' | 'none';
  deliveryAmount: string;

  // Discount
  calculateTaxBeforeDiscount: boolean;
  calculateBackwardTaxAfterDiscount: boolean;
  itemCategoryDiscountAutoApplied: boolean;
  showItemCategoryDiscountBox: boolean;
  applyBogoAutomatically: boolean;
  commonCouponDiscount: boolean;
  ignoreAddonPriceDiscount: boolean;
  specialDiscountReasonMandatory: boolean;
  displayDiscountCouponTextbox: boolean;

  // KOT/Bill
  assignBillSalesToKOTUser: boolean;
  saveKOTOnSaveBill: boolean;
  considerNonPreparedKOT: boolean;
  mergeDuplicateItems: boolean;
  splitBillMultipleGroups: boolean;
  autoFinalizeOrder: boolean;
  everydayResetKOTNumber: string;
  splitBillOption: 'printGroupWise' | 'generateSeparateBills';

  // Complimentary Bill
  disableTaxesOnComplimentary: boolean;

  // Special Notes
  saveSpecialNoteToMaster: boolean;

  // Surcharge
  displaySurcharge: boolean;
}

const initialState: CalculationsSettingsState = {
  // Round-Off Options
  roundOffOption: 'normal',
  roundToIncrements: '1',
  decimalPoints: '2',

  // Service Charge
  displayServiceCharge: false,

  // Container Charge
  showContainerCharge: true,
  containerChargeLabel: 'Container Charge',
  containerChargeType: 'itemWise',
  containerChargeAutoCalc: { delivery: true, pickUp: true, dineIn: false },
  calculateTaxOnContainer: false,
  containerAmountCondition: 'none',
  containerAmount: '0',

  // Delivery Charge
  showDeliveryCharge: true,
  defaultDeliveryCharge: '0',
  calculateTaxOnDelivery: false,
  deliveryAmountCondition: 'none',
  deliveryAmount: '0',

  // Discount
  calculateTaxBeforeDiscount: false,
  calculateBackwardTaxAfterDiscount: false,
  itemCategoryDiscountAutoApplied: false,
  showItemCategoryDiscountBox: false,
  applyBogoAutomatically: false,
  commonCouponDiscount: false,
  ignoreAddonPriceDiscount: false,
  specialDiscountReasonMandatory: false,
  displayDiscountCouponTextbox: true,

  // KOT/Bill
  assignBillSalesToKOTUser: false,
  saveKOTOnSaveBill: true,
  considerNonPreparedKOT: true,
  mergeDuplicateItems: true,
  splitBillMultipleGroups: false,
  autoFinalizeOrder: false,
  everydayResetKOTNumber: '1',
  splitBillOption: 'generateSeparateBills',

  // Complimentary Bill
  disableTaxesOnComplimentary: false,

  // Special Notes
  saveSpecialNoteToMaster: false,

  // Surcharge
  displaySurcharge: false,
};

type MenuItemType = 'roundOff' | 'serviceCharge' | 'containerCharge' | 'deliveryCharge' | 'discount' | 'kotBill' | 'specialNotes' | 'surcharge';

const menuItems: { id: MenuItemType; label: string }[] = [
  { id: 'roundOff', label: 'Round-Off Options' },
  { id: 'serviceCharge', label: 'Service Charge' },
  { id: 'containerCharge', label: 'Container Charge' },
  { id: 'deliveryCharge', label: 'Delivery Charge' },
  { id: 'discount', label: 'Discount' },
  { id: 'kotBill', label: 'KOT/Bill' },
  { id: 'specialNotes', label: 'Special Notes' },
  { id: 'surcharge', label: 'Surcharge' },
];

export const CalculationsSettings: React.FC<CalculationsSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<CalculationsSettingsState>(initialState);
  const [activeSection, setActiveSection] = useState<MenuItemType>('roundOff');

  useEffect(() => {
    const savedSettings = localStorage.getItem('calculationsSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse calculations settings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('calculationsSettings', JSON.stringify(settings));
    toast.success('Calculations settings saved successfully!');
  };

  const handleCancel = () => {
    const savedSettings = localStorage.getItem('calculationsSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        setSettings(initialState);
      }
    } else {
      setSettings(initialState);
    }
    toast.info('Changes discarded');
  };

  const updateSetting = <K extends keyof CalculationsSettingsState>(
    key: K,
    value: CalculationsSettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderRoundOffOptions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Round-Off Options</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings pertains to configuring the Round-Off Options.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Round off options for billing. :</Label>
          <RadioGroup
            value={settings.roundOffOption}
            onValueChange={(value) => updateSetting('roundOffOption', value as 'normal' | 'roundUp' | 'roundDown' | 'none')}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="roundNormal" />
              <Label htmlFor="roundNormal" className="text-sm cursor-pointer">Normal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="roundUp" id="roundUp" />
              <Label htmlFor="roundUp" className="text-sm cursor-pointer">Round off up</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="roundDown" id="roundDown" />
              <Label htmlFor="roundDown" className="text-sm cursor-pointer">Round off down</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="roundNone" />
              <Label htmlFor="roundNone" className="text-sm cursor-pointer">None</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Round the number to the increments of *:</Label>
          <Select
            value={settings.roundToIncrements}
            onValueChange={(value) => updateSetting('roundToIncrements', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.05">0.05</SelectItem>
              <SelectItem value="0.10">0.10</SelectItem>
              <SelectItem value="0.25">0.25</SelectItem>
              <SelectItem value="0.50">0.50</SelectItem>
              <SelectItem value="1">1 (Default)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-destructive ml-[196px]">
          In this, the number would be rounded to the increment that is selected. For example, if round-up option is selected and the increment is selected of 0.25, then the number 2.20 would be rounded to 2.25
        </p>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Select decimal points for invoice calculation and Menu price input*:</Label>
          <Select
            value={settings.decimalPoints}
            onValueChange={(value) => updateSetting('decimalPoints', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-destructive ml-[196px]">
          The rounding calculation related to invoice would be based on the number selected in the dropdown, For example, if 1 is selected, 0.9277 would be rounded to 1.0
        </p>
      </div>
    </div>
  );

  const renderServiceCharge = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Service Charge</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the service charge in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayServiceCharge"
            checked={settings.displayServiceCharge}
            onCheckedChange={(checked) => updateSetting('displayServiceCharge', checked === true)}
          />
          <Label htmlFor="displayServiceCharge" className="text-sm cursor-pointer">
            Display & Calculate Service Charge
          </Label>
        </div>
        <p className="text-xs text-destructive ml-6">
          Note: As per guidelines issued by the Central Consumer Protection Authority, service charges cannot be automatically (or by default) added to a bill. In addition, outlets cannot charge taxes on service charges
        </p>
      </div>
    </div>
  );

  const renderContainerCharge = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Container Charge</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the container charge in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showContainerCharge"
            checked={settings.showContainerCharge}
            onCheckedChange={(checked) => updateSetting('showContainerCharge', checked === true)}
          />
          <Label htmlFor="showContainerCharge" className="text-sm cursor-pointer">
            Show Container Charge On Billing Screen
          </Label>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[150px] text-sm">Container Charge Label*:</Label>
          <Input
            value={settings.containerChargeLabel}
            onChange={(e) => updateSetting('containerChargeLabel', e.target.value)}
            className="w-48"
          />
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[150px] text-sm">Container Charge :</Label>
          <RadioGroup
            value={settings.containerChargeType}
            onValueChange={(value) => updateSetting('containerChargeType', value as 'itemWise' | 'orderWise' | 'fixPerItem')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="itemWise" id="containerItemWise" />
              <Label htmlFor="containerItemWise" className="text-sm cursor-pointer">Item wise</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="orderWise" id="containerOrderWise" />
              <Label htmlFor="containerOrderWise" className="text-sm cursor-pointer">Order wise</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixPerItem" id="containerFixPerItem" />
              <Label htmlFor="fixPerItem" className="text-sm cursor-pointer">Fix per item</Label>
            </div>
          </RadioGroup>
        </div>
        <p className="text-xs text-destructive ml-[166px]">
          This setting defines whether the container charge is item wise and order wise.
        </p>

        <div className="flex items-start gap-4">
          <Label className="min-w-[150px] text-sm pt-1">Calculate Container Charge Automatically</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="containerDelivery"
                checked={settings.containerChargeAutoCalc.delivery}
                onCheckedChange={(checked) => updateSetting('containerChargeAutoCalc', {
                  ...settings.containerChargeAutoCalc,
                  delivery: checked === true
                })}
              />
              <Label htmlFor="containerDelivery" className="text-sm cursor-pointer">Delivery</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="containerPickUp"
                checked={settings.containerChargeAutoCalc.pickUp}
                onCheckedChange={(checked) => updateSetting('containerChargeAutoCalc', {
                  ...settings.containerChargeAutoCalc,
                  pickUp: checked === true
                })}
              />
              <Label htmlFor="containerPickUp" className="text-sm cursor-pointer">Pick Up</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="containerDineIn"
                checked={settings.containerChargeAutoCalc.dineIn}
                onCheckedChange={(checked) => updateSetting('containerChargeAutoCalc', {
                  ...settings.containerChargeAutoCalc,
                  dineIn: checked === true
                })}
              />
              <Label htmlFor="containerDineIn" className="text-sm cursor-pointer">Dine In</Label>
            </div>
          </div>
        </div>
        <p className="text-xs text-destructive ml-[166px]">
          This setting enables container charge without pressing a button beside the label in billing screen.
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="calculateTaxOnContainer"
            checked={settings.calculateTaxOnContainer}
            onCheckedChange={(checked) => updateSetting('calculateTaxOnContainer', checked === true)}
          />
          <Label htmlFor="calculateTaxOnContainer" className="text-sm cursor-pointer">
            Calculate tax on Container Charge.
          </Label>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[150px] text-sm">Set a specific amount to calculate :</Label>
          <RadioGroup
            value={settings.containerAmountCondition}
            onValueChange={(value) => updateSetting('containerAmountCondition', value as 'greaterThan' | 'lessThan' | 'none')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="greaterThan" id="containerGreater" />
              <Label htmlFor="containerGreater" className="text-sm cursor-pointer">Greater Than</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lessThan" id="containerLess" />
              <Label htmlFor="containerLess" className="text-sm cursor-pointer">Less Than</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="containerConditionNone" />
              <Label htmlFor="containerConditionNone" className="text-sm cursor-pointer">None</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[150px] text-sm">Amount :</Label>
          <Input
            type="number"
            value={settings.containerAmount}
            onChange={(e) => updateSetting('containerAmount', e.target.value)}
            className="w-48"
          />
        </div>
      </div>
    </div>
  );

  const renderDeliveryCharge = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Delivery Charge</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the delivery charge in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showDeliveryCharge"
            checked={settings.showDeliveryCharge}
            onCheckedChange={(checked) => updateSetting('showDeliveryCharge', checked === true)}
          />
          <Label htmlFor="showDeliveryCharge" className="text-sm cursor-pointer">
            Show Delivery Charge On Billing Screen
          </Label>
        </div>
        <p className="text-xs text-destructive ml-6">
          This setting would describe what would the delivery charge would be displayed as.
        </p>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Default Delivery Charge (Only for Delivery) *:</Label>
          <Input
            type="number"
            value={settings.defaultDeliveryCharge}
            onChange={(e) => updateSetting('defaultDeliveryCharge', e.target.value)}
            className="w-48"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="calculateTaxOnDelivery"
            checked={settings.calculateTaxOnDelivery}
            onCheckedChange={(checked) => updateSetting('calculateTaxOnDelivery', checked === true)}
          />
          <Label htmlFor="calculateTaxOnDelivery" className="text-sm cursor-pointer">
            Calculate tax on Delivery Charge.
          </Label>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Set a specific amount to calculate :</Label>
          <RadioGroup
            value={settings.deliveryAmountCondition}
            onValueChange={(value) => updateSetting('deliveryAmountCondition', value as 'greaterThan' | 'lessThan' | 'none')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="greaterThan" id="deliveryGreater" />
              <Label htmlFor="deliveryGreater" className="text-sm cursor-pointer">Greater Than</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lessThan" id="deliveryLess" />
              <Label htmlFor="deliveryLess" className="text-sm cursor-pointer">Less Than</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="deliveryConditionNone" />
              <Label htmlFor="deliveryConditionNone" className="text-sm cursor-pointer">None</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Amount :</Label>
          <Input
            type="number"
            value={settings.deliveryAmount}
            onChange={(e) => updateSetting('deliveryAmount', e.target.value)}
            className="w-48"
          />
        </div>
      </div>
    </div>
  );

  const renderDiscount = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Discount</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings help in describing the in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="calculateTaxBeforeDiscount"
            checked={settings.calculateTaxBeforeDiscount}
            onCheckedChange={(checked) => updateSetting('calculateTaxBeforeDiscount', checked === true)}
          />
          <Label htmlFor="calculateTaxBeforeDiscount" className="text-sm cursor-pointer">
            Calculate Tax Before Discount Calculation
          </Label>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="calculateBackwardTaxAfterDiscount"
              checked={settings.calculateBackwardTaxAfterDiscount}
              onCheckedChange={(checked) => updateSetting('calculateBackwardTaxAfterDiscount', checked === true)}
            />
            <Label htmlFor="calculateBackwardTaxAfterDiscount" className="text-sm cursor-pointer">
              Calculate Backward Tax After Discount
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            Note: Ignore this settings if you are using forward tax configuration for your outlet
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="itemCategoryDiscountAutoApplied"
              checked={settings.itemCategoryDiscountAutoApplied}
              onCheckedChange={(checked) => updateSetting('itemCategoryDiscountAutoApplied', checked === true)}
            />
            <Label htmlFor="itemCategoryDiscountAutoApplied" className="text-sm cursor-pointer">
              Item/ Category discount auto-applied
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            This setting enables discount without pressing a button beside the label in billing screen.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showItemCategoryDiscountBox"
            checked={settings.showItemCategoryDiscountBox}
            onCheckedChange={(checked) => updateSetting('showItemCategoryDiscountBox', checked === true)}
          />
          <Label htmlFor="showItemCategoryDiscountBox" className="text-sm cursor-pointer">
            Show Item/Category wise discount box while adding an item
          </Label>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="applyBogoAutomatically"
              checked={settings.applyBogoAutomatically}
              onCheckedChange={(checked) => updateSetting('applyBogoAutomatically', checked === true)}
            />
            <Label htmlFor="applyBogoAutomatically" className="text-sm cursor-pointer">
              Apply Bogo Automatically
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            This setting enables Bogo discount without pressing a button in billing screen.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="commonCouponDiscount"
              checked={settings.commonCouponDiscount}
              onCheckedChange={(checked) => updateSetting('commonCouponDiscount', checked === true)}
            />
            <Label htmlFor="commonCouponDiscount" className="text-sm cursor-pointer">
              Common Coupon Discount
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            This setting enables the coupon(s) configured by HO/Chain outlet to be applicable in the outlet. This setting is only available in cloud login.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="ignoreAddonPriceDiscount"
            checked={settings.ignoreAddonPriceDiscount}
            onCheckedChange={(checked) => updateSetting('ignoreAddonPriceDiscount', checked === true)}
          />
          <Label htmlFor="ignoreAddonPriceDiscount" className="text-sm cursor-pointer">
            Ignore add-on price while calculating discount (works for all types for discount)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="specialDiscountReasonMandatory"
            checked={settings.specialDiscountReasonMandatory}
            onCheckedChange={(checked) => updateSetting('specialDiscountReasonMandatory', checked === true)}
          />
          <Label htmlFor="specialDiscountReasonMandatory" className="text-sm cursor-pointer">
            Special discount reason mandatory
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="displayDiscountCouponTextbox"
            checked={settings.displayDiscountCouponTextbox}
            onCheckedChange={(checked) => updateSetting('displayDiscountCouponTextbox', checked === true)}
          />
          <Label htmlFor="displayDiscountCouponTextbox" className="text-sm cursor-pointer">
            Display Discount/Coupon Textbox
          </Label>
        </div>
      </div>
    </div>
  );

  const renderKOTBill = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">KOT/Bill</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the KOT/Bill in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="assignBillSalesToKOTUser"
              checked={settings.assignBillSalesToKOTUser}
              onCheckedChange={(checked) => updateSetting('assignBillSalesToKOTUser', checked === true)}
            />
            <Label htmlFor="assignBillSalesToKOTUser" className="text-sm cursor-pointer">
              Assign Bill sales to KOT punched user
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            When this setting is enabled, the bill sales would be assigned to the user who punched the KOT in the relevant reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="saveKOTOnSaveBill"
            checked={settings.saveKOTOnSaveBill}
            onCheckedChange={(checked) => updateSetting('saveKOTOnSaveBill', checked === true)}
          />
          <Label htmlFor="saveKOTOnSaveBill" className="text-sm cursor-pointer">
            Save KOT On Save Bill (Only first time not in edit)
          </Label>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="considerNonPreparedKOT"
              checked={settings.considerNonPreparedKOT}
              onCheckedChange={(checked) => updateSetting('considerNonPreparedKOT', checked === true)}
            />
            <Label htmlFor="considerNonPreparedKOT" className="text-sm cursor-pointer">
              Consider Non Prepared KOT in Bill
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            When this setting is enabled, even the KOT which is not marked as prepared in the system would be considered while printing bill
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mergeDuplicateItems"
              checked={settings.mergeDuplicateItems}
              onCheckedChange={(checked) => updateSetting('mergeDuplicateItems', checked === true)}
            />
            <Label htmlFor="mergeDuplicateItems" className="text-sm cursor-pointer">
              Merge duplicate items
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            This setting enables merging same items on billing screen .
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="splitBillMultipleGroups"
            checked={settings.splitBillMultipleGroups}
            onCheckedChange={(checked) => updateSetting('splitBillMultipleGroups', checked === true)}
          />
          <Label htmlFor="splitBillMultipleGroups" className="text-sm cursor-pointer">
            Split a bill when multiple groups are present
          </Label>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoFinalizeOrder"
              checked={settings.autoFinalizeOrder}
              onCheckedChange={(checked) => updateSetting('autoFinalizeOrder', checked === true)}
            />
            <Label htmlFor="autoFinalizeOrder" className="text-sm cursor-pointer">
              Auto Finalize Order
            </Label>
          </div>
          <p className="text-xs text-destructive ml-6">
            This setting is only available in cloud login.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Everyday reset KOT number from*:</Label>
          <Input
            type="number"
            value={settings.everydayResetKOTNumber}
            onChange={(e) => updateSetting('everydayResetKOTNumber', e.target.value)}
            className="w-48"
          />
        </div>
        <p className="text-xs text-destructive ml-[196px]">
          When this setting is enabled , the KOT number would reset to this particular number at the start of every day.
        </p>

        <div className="flex items-center gap-4">
          <Label className="min-w-[180px] text-sm">Split Bill Options.</Label>
          <RadioGroup
            value={settings.splitBillOption}
            onValueChange={(value) => updateSetting('splitBillOption', value as 'printGroupWise' | 'generateSeparateBills')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="printGroupWise" id="printGroupWise" />
              <Label htmlFor="printGroupWise" className="text-sm cursor-pointer">Print Group wise</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="generateSeparateBills" id="generateSeparateBills" />
              <Label htmlFor="generateSeparateBills" className="text-sm cursor-pointer">Generate Separate Bills</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Complimentary Bill */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold text-foreground mb-2">Complimentary Bill</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The following settings configures the complimentary order in billing screen
          </p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="disableTaxesOnComplimentary"
              checked={settings.disableTaxesOnComplimentary}
              onCheckedChange={(checked) => updateSetting('disableTaxesOnComplimentary', checked === true)}
            />
            <Label htmlFor="disableTaxesOnComplimentary" className="text-sm cursor-pointer">
              Disable Taxes and other Charges(Packing Charge, Delivery charge, Service charge) on Complimentary Bill
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSpecialNotes = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Special Notes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the special notes in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="saveSpecialNoteToMaster"
            checked={settings.saveSpecialNoteToMaster}
            onCheckedChange={(checked) => updateSetting('saveSpecialNoteToMaster', checked === true)}
          />
          <Label htmlFor="saveSpecialNoteToMaster" className="text-sm cursor-pointer">
            Save special note into special notes master while saving kot / orders.
          </Label>
        </div>
      </div>
    </div>
  );

  const renderSurcharge = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Surcharge</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following settings describes the settings related to the surcharge in the billing screen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="displaySurcharge"
            checked={settings.displaySurcharge}
            onCheckedChange={(checked) => updateSetting('displaySurcharge', checked === true)}
          />
          <Label htmlFor="displaySurcharge" className="text-sm cursor-pointer">
            Display & Calculate Surcharge
          </Label>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'roundOff':
        return renderRoundOffOptions();
      case 'serviceCharge':
        return renderServiceCharge();
      case 'containerCharge':
        return renderContainerCharge();
      case 'deliveryCharge':
        return renderDeliveryCharge();
      case 'discount':
        return renderDiscount();
      case 'kotBill':
        return renderKOTBill();
      case 'specialNotes':
        return renderSpecialNotes();
      case 'surcharge':
        return renderSurcharge();
      default:
        return renderRoundOffOptions();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Outlet Settings &gt; Calculations</span>
        </div>
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Menu */}
        <div className="w-64 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary border-l-4 border-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6">
              {renderContent()}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end gap-4 p-4 border-t bg-muted/30">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculationsSettings;
