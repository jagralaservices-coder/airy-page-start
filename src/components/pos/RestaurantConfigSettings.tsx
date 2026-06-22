import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface RestaurantConfigSettingsProps {
  onBack: () => void;
}

export const RestaurantConfigSettings: React.FC<RestaurantConfigSettingsProps> = ({ onBack }) => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  // Closing Hours
  const [closingHour, setClosingHour] = useState('06');
  const [closingMinute, setClosingMinute] = useState('00');
  const [closingDisplayHour, setClosingDisplayHour] = useState('06');
  const [closingPeriod, setClosingPeriod] = useState<'AM' | 'PM'>('AM');

  // Sync & Order Settings
  const [syncBatchPacketSize, setSyncBatchPacketSize] = useState('100');
  const [defaultOrderLimit, setDefaultOrderLimit] = useState('500');
  const [defaultAutoSyncTime, setDefaultAutoSyncTime] = useState('5');
  const [autoSyncTimeUnit, setAutoSyncTimeUnit] = useState('Min');
  const [defaultPettyCashAmount, setDefaultPettyCashAmount] = useState('2000');
  const [paymentRequestSyncTime, setPaymentRequestSyncTime] = useState('5');
  const [checkPaymentRequestSyncTime, setCheckPaymentRequestSyncTime] = useState('5');
  const [pendingOrderSyncTime, setPendingOrderSyncTime] = useState('5');
  const [pendingOrderSyncUnit, setPendingOrderSyncUnit] = useState('sec (second)');
  const [minimumDeliveryTime, setMinimumDeliveryTime] = useState('30');
  const [preparationTime, setPreparationTime] = useState('30');

  // Invoice & Display Settings
  const [decimalPoints, setDecimalPoints] = useState('2');
  const [fontConfiguration, setFontConfiguration] = useState('Default');
  const [displayType, setDisplayType] = useState('touch');

  // Checkboxes
  const [wantVirtualKeyboard, setWantVirtualKeyboard] = useState(false);
  const [openVirtualKeyboardOnlineOrder, setOpenVirtualKeyboardOnlineOrder] = useState(false);
  const [displayItemImages, setDisplayItemImages] = useState(false);
  const [resetStockOnDayStart, setResetStockOnDayStart] = useState(false);
  const [saleResetAlertMinutes, setSaleResetAlertMinutes] = useState('30');

  // Login Screen
  const [defaultLoginScreen, setDefaultLoginScreen] = useState('username');
  const [mapDigitalTransactions, setMapDigitalTransactions] = useState(false);

  // Live View Settings
  const [orderLiveView, setOrderLiveView] = useState('DESC');
  const [kotLiveView, setKotLiveView] = useState('ASC');

  // KDS/KOT Settings
  const [kdsKotSendUpdate, setKdsKotSendUpdate] = useState(true);
  const [markKotAsDone, setMarkKotAsDone] = useState(true);
  const [displaySettleSaveButton, setDisplaySettleSaveButton] = useState(false);
  const [saveSpecialNotes, setSaveSpecialNotes] = useState(false);
  const [showAddonQuantity, setShowAddonQuantity] = useState(true);

  // Advance Order Settings
  const [noMemoForAdvanceOrders, setNoMemoForAdvanceOrders] = useState(false);
  const [createKotOnMemo, setCreateKotOnMemo] = useState(false);
  const [createInvoiceManually, setCreateInvoiceManually] = useState(false);
  const [printKotOnAccepting, setPrintKotOnAccepting] = useState(false);
  const [noCheckOfflineStock, setNoCheckOfflineStock] = useState(false);

  // Hydrate from DB/local fallback after load
  useEffect(() => {
    if (!isLoaded) return;

    const s = getSetting<Record<string, any>>('pos_restaurant_config', {});

    if (s.closingHour !== undefined) {
      const hour24 = String(s.closingHour).padStart(2, '0');
      const hourNum = Number(hour24);
      setClosingHour(hour24);
      setClosingDisplayHour((((hourNum + 11) % 12) + 1).toString().padStart(2, '0'));
      setClosingPeriod(hourNum >= 12 ? 'PM' : 'AM');
    }
    if (s.closingMinute !== undefined) setClosingMinute(String(s.closingMinute));

    if (s.syncBatchPacketSize !== undefined) setSyncBatchPacketSize(String(s.syncBatchPacketSize));
    if (s.defaultOrderLimit !== undefined) setDefaultOrderLimit(String(s.defaultOrderLimit));
    if (s.defaultAutoSyncTime !== undefined) setDefaultAutoSyncTime(String(s.defaultAutoSyncTime));
    if (s.autoSyncTimeUnit !== undefined) setAutoSyncTimeUnit(String(s.autoSyncTimeUnit));
    if (s.defaultPettyCashAmount !== undefined) setDefaultPettyCashAmount(String(s.defaultPettyCashAmount));
    if (s.paymentRequestSyncTime !== undefined) setPaymentRequestSyncTime(String(s.paymentRequestSyncTime));
    if (s.checkPaymentRequestSyncTime !== undefined) setCheckPaymentRequestSyncTime(String(s.checkPaymentRequestSyncTime));
    if (s.pendingOrderSyncTime !== undefined) setPendingOrderSyncTime(String(s.pendingOrderSyncTime));
    if (s.pendingOrderSyncUnit !== undefined) setPendingOrderSyncUnit(String(s.pendingOrderSyncUnit));
    if (s.minimumDeliveryTime !== undefined) setMinimumDeliveryTime(String(s.minimumDeliveryTime));
    if (s.preparationTime !== undefined) setPreparationTime(String(s.preparationTime));

    if (s.decimalPoints !== undefined) setDecimalPoints(String(s.decimalPoints));
    if (s.fontConfiguration !== undefined) setFontConfiguration(String(s.fontConfiguration));
    if (s.displayType !== undefined) setDisplayType(String(s.displayType));

    if (s.wantVirtualKeyboard !== undefined) setWantVirtualKeyboard(!!s.wantVirtualKeyboard);
    if (s.openVirtualKeyboardOnlineOrder !== undefined) setOpenVirtualKeyboardOnlineOrder(!!s.openVirtualKeyboardOnlineOrder);
    if (s.displayItemImages !== undefined) setDisplayItemImages(!!s.displayItemImages);
    if (s.resetStockOnDayStart !== undefined) setResetStockOnDayStart(!!s.resetStockOnDayStart);
    if (s.saleResetAlertMinutes !== undefined) setSaleResetAlertMinutes(String(s.saleResetAlertMinutes));
    const dedicatedAlertMinutes = getSetting<number>('sale_reset_alert_minutes_before');
    if (dedicatedAlertMinutes !== undefined && dedicatedAlertMinutes !== null) {
      setSaleResetAlertMinutes(String(dedicatedAlertMinutes));
    }

    if (s.defaultLoginScreen !== undefined) setDefaultLoginScreen(String(s.defaultLoginScreen));
    if (s.mapDigitalTransactions !== undefined) setMapDigitalTransactions(!!s.mapDigitalTransactions);

    if (s.orderLiveView !== undefined) setOrderLiveView(String(s.orderLiveView));
    if (s.kotLiveView !== undefined) setKotLiveView(String(s.kotLiveView));

    if (s.kdsKotSendUpdate !== undefined) setKdsKotSendUpdate(!!s.kdsKotSendUpdate);
    if (s.markKotAsDone !== undefined) setMarkKotAsDone(!!s.markKotAsDone);
    if (s.displaySettleSaveButton !== undefined) setDisplaySettleSaveButton(!!s.displaySettleSaveButton);
    if (s.saveSpecialNotes !== undefined) setSaveSpecialNotes(!!s.saveSpecialNotes);
    if (s.showAddonQuantity !== undefined) setShowAddonQuantity(!!s.showAddonQuantity);

    if (s.noMemoForAdvanceOrders !== undefined) setNoMemoForAdvanceOrders(!!s.noMemoForAdvanceOrders);
    if (s.createKotOnMemo !== undefined) setCreateKotOnMemo(!!s.createKotOnMemo);
    if (s.createInvoiceManually !== undefined) setCreateInvoiceManually(!!s.createInvoiceManually);
    if (s.printKotOnAccepting !== undefined) setPrintKotOnAccepting(!!s.printKotOnAccepting);
    if (s.noCheckOfflineStock !== undefined) setNoCheckOfflineStock(!!s.noCheckOfflineStock);
  }, [isLoaded, getSetting]);

  const handleSave = () => {
    const settings = {
      closingHour,
      closingMinute,
      syncBatchPacketSize,
      defaultOrderLimit,
      defaultAutoSyncTime,
      autoSyncTimeUnit,
      defaultPettyCashAmount,
      paymentRequestSyncTime,
      checkPaymentRequestSyncTime,
      pendingOrderSyncTime,
      pendingOrderSyncUnit,
      minimumDeliveryTime,
      preparationTime,
      decimalPoints,
      fontConfiguration,
      displayType,
      wantVirtualKeyboard,
      openVirtualKeyboardOnlineOrder,
      displayItemImages,
      resetStockOnDayStart,
      saleResetAlertMinutes: parseInt(saleResetAlertMinutes) || 30,
      defaultLoginScreen,
      mapDigitalTransactions,
      orderLiveView,
      kotLiveView,
      kdsKotSendUpdate,
      markKotAsDone,
      displaySettleSaveButton,
      saveSpecialNotes,
      showAddonQuantity,
      noMemoForAdvanceOrders,
      createKotOnMemo,
      createInvoiceManually,
      printKotOnAccepting,
      noCheckOfflineStock,
    };
    saveSetting('pos_restaurant_config', settings);
    saveSetting('sale_reset_alert_minutes_before', parseInt(saleResetAlertMinutes) || 30);
    toast.success('Restaurant configuration saved successfully');
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const syncClosingTime = (displayHour: string, minute: string, period: 'AM' | 'PM') => {
    let hour24 = Number(displayHour) % 12;
    if (period === 'PM') hour24 += 12;
    setClosingHour(hour24.toString().padStart(2, '0'));
    setClosingMinute(minute);
    setClosingDisplayHour(displayHour);
    setClosingPeriod(period);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Restaurant Configuration</h2>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Restaurant Closing Hours */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Label className="min-w-[200px] pt-2">Restaurant Closing Hours</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={closingDisplayHour} onValueChange={(value) => syncClosingTime(value, closingMinute, closingPeriod)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={closingMinute} onValueChange={(value) => syncClosingTime(closingDisplayHour, value, closingPeriod)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={closingPeriod} onValueChange={(value: 'AM' | 'PM') => syncClosingTime(closingDisplayHour, closingMinute, value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-primary border-primary">
              Change Closing Hours
            </Button>
            <Button variant="outline" size="sm" className="text-primary border-primary">
              + Extend Closing Hours
            </Button>
          </div>
        </div>
        <p className="text-sm text-primary ml-0 sm:ml-[216px]">
          Current day closing hours have been extended to {new Date().toLocaleDateString()} {closingDisplayHour}:{closingMinute} {closingPeriod}.
        </p>

        {/* Sale Reset Alert Minutes */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Show Reset Alert Before <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={saleResetAlertMinutes}
              onChange={(e) => setSaleResetAlertMinutes(e.target.value)}
              className="w-24"
              min="1"
              max="120"
            />
            <span className="text-muted-foreground text-sm">Minutes</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground ml-0 sm:ml-[216px]">
          Alert popup will appear this many minutes before the sale reset time.
        </p>

        {/* Sync Batch Packet Size */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Sync Batch Packet Size</Label>
          <Select value={syncBatchPacketSize} onValueChange={setSyncBatchPacketSize}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['50', '100', '200', '500'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Default Order Limit */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Default Order Limit <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            value={defaultOrderLimit}
            onChange={(e) => setDefaultOrderLimit(e.target.value)}
            className="w-full sm:w-[200px]"
          />
        </div>

        {/* Default Auto Sync Time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Default Auto Sync Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={defaultAutoSyncTime}
              onChange={(e) => setDefaultAutoSyncTime(e.target.value)}
              className="w-20"
            />
            <Select value={autoSyncTimeUnit} onValueChange={setAutoSyncTimeUnit}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Min">Min</SelectItem>
                <SelectItem value="Sec">Sec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Default Petty Cash Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Default Petty Cash Amount <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            value={defaultPettyCashAmount}
            onChange={(e) => setDefaultPettyCashAmount(e.target.value)}
            className="w-full sm:w-[200px]"
          />
        </div>

        {/* Payment request sync time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Payment request sync time <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={paymentRequestSyncTime}
              onChange={(e) => setPaymentRequestSyncTime(e.target.value)}
              className="w-20"
            />
            <span className="text-muted-foreground">sec (second)</span>
          </div>
        </div>

        {/* Check payment request sync time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Check payment request sync time <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={checkPaymentRequestSyncTime}
              onChange={(e) => setCheckPaymentRequestSyncTime(e.target.value)}
              className="w-20"
            />
            <span className="text-muted-foreground">sec (second)</span>
          </div>
        </div>

        {/* Default Pending Order Sync Time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Default Pending Order Sync Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={pendingOrderSyncTime}
              onChange={(e) => setPendingOrderSyncTime(e.target.value)}
              className="w-20"
            />
            <Select value={pendingOrderSyncUnit} onValueChange={setPendingOrderSyncUnit}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sec (second)">sec (second)</SelectItem>
                <SelectItem value="min">min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Minimum Delivery Time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Minimum Delivery Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minimumDeliveryTime}
              onChange={(e) => setMinimumDeliveryTime(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <span className="text-muted-foreground">Min</span>
          </div>
        </div>

        {/* Preparation Time */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Preparation Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <span className="text-muted-foreground">Min</span>
          </div>
        </div>

        {/* Select decimal points for invoice calculation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Select decimal points for invoice calculation <span className="text-destructive">*</span></Label>
          <Select value={decimalPoints} onValueChange={setDecimalPoints}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['0', '1', '2', '3', '4'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Font Configuration */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Label className="min-w-[200px]">Font Configuration</Label>
          <Select value={fontConfiguration} onValueChange={setFontConfiguration}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Default">Default</SelectItem>
              <SelectItem value="Large">Large</SelectItem>
              <SelectItem value="Small">Small</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Display type */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Label className="min-w-[200px] pt-2">Display type</Label>
          <RadioGroup value={displayType} onValueChange={setDisplayType} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="keyboard" id="keyboard" />
              <Label htmlFor="keyboard">Keyboard</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="touch" id="touch" />
              <Label htmlFor="touch">Touch Screen</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Virtual Keyboard Options */}
        <div className="space-y-3 ml-0 sm:ml-[216px]">
          <div className="flex items-center space-x-2">
            <Checkbox id="virtualKeyboard" checked={wantVirtualKeyboard} onCheckedChange={(c) => setWantVirtualKeyboard(!!c)} />
            <Label htmlFor="virtualKeyboard">Want to open virtual keyboard?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="virtualKeyboardOnline" checked={openVirtualKeyboardOnlineOrder} onCheckedChange={(c) => setOpenVirtualKeyboardOnlineOrder(!!c)} />
            <Label htmlFor="virtualKeyboardOnline">Open virtual keyboard while entering order number in online order food ready text box</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="displayItemImages" checked={displayItemImages} onCheckedChange={(c) => setDisplayItemImages(!!c)} />
            <Label htmlFor="displayItemImages">Display item images on the billing screen</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="resetStock" checked={resetStockOnDayStart} onCheckedChange={(c) => setResetStockOnDayStart(!!c)} />
            <Label htmlFor="resetStock">Reset your stock on a day start</Label>
          </div>
        </div>

        {/* Default Login Screen */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Label className="min-w-[200px] pt-2">Default Login Screen</Label>
          <RadioGroup value={defaultLoginScreen} onValueChange={setDefaultLoginScreen} className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="username" id="username" />
              <Label htmlFor="username">Username / Password</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passcode" id="passcode" />
              <Label htmlFor="passcode">Passcode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipecard" id="swipecard" />
              <Label htmlFor="swipecard">Swipe Card</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Map digital transactions */}
        <div className="ml-0 sm:ml-[216px]">
          <div className="flex items-center space-x-2">
            <Checkbox id="mapDigital" checked={mapDigitalTransactions} onCheckedChange={(c) => setMapDigitalTransactions(!!c)} />
            <Label htmlFor="mapDigital">Map digital transaction entries against invoices</Label>
          </div>
        </div>

        {/* Order Live View */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Label className="min-w-[200px] pt-2">Order Live View</Label>
          <RadioGroup value={orderLiveView} onValueChange={setOrderLiveView} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ASC" id="orderAsc" />
              <Label htmlFor="orderAsc">ASC</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="DESC" id="orderDesc" />
              <Label htmlFor="orderDesc">DESC</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Kot Live View */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Label className="min-w-[200px] pt-2">Kot Live View</Label>
          <RadioGroup value={kotLiveView} onValueChange={setKotLiveView} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ASC" id="kotAsc" />
              <Label htmlFor="kotAsc">ASC</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="DESC" id="kotDesc" />
              <Label htmlFor="kotDesc">DESC</Label>
            </div>
          </RadioGroup>
        </div>

        {/* KDS/KOT Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="kdsKotUpdate" checked={kdsKotSendUpdate} onCheckedChange={(c) => setKdsKotSendUpdate(!!c)} />
            <Label htmlFor="kdsKotUpdate">From KDS/KOT live screen send update to order screen.</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="markKotDone" checked={markKotAsDone} onCheckedChange={(c) => setMarkKotAsDone(!!c)} />
            <Label htmlFor="markKotDone">On marking done all items on KDS, Mark KOT as done.</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="settleSave" checked={displaySettleSaveButton} onCheckedChange={(c) => setDisplaySettleSaveButton(!!c)} />
            <Label htmlFor="settleSave">Display Settle and Save button for delivery and pickup orders on live view card</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="saveNotes" checked={saveSpecialNotes} onCheckedChange={(c) => setSaveSpecialNotes(!!c)} />
            <Label htmlFor="saveNotes">Save special notes into special notes master while saving kot / orders.</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="showAddon" checked={showAddonQuantity} onCheckedChange={(c) => setShowAddonQuantity(!!c)} />
            <Label htmlFor="showAddon">Show Addon Quantity with the total item quantity (multiplication) to prepare in Bill.</Label>
          </div>
        </div>

        {/* Advance Order Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="noMemo" checked={noMemoForAdvanceOrders} onCheckedChange={(c) => setNoMemoForAdvanceOrders(!!c)} />
            <Label htmlFor="noMemo">Do not create memo for advance orders (Offline Orders Only)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="createKotMemo" checked={createKotOnMemo} onCheckedChange={(c) => setCreateKotOnMemo(!!c)} />
            <Label htmlFor="createKotMemo">Create kot on creating memo for advance orders (Offline orders Only)</Label>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="invoiceManual" checked={createInvoiceManually} onCheckedChange={(c) => setCreateInvoiceManually(!!c)} />
              <Label htmlFor="invoiceManual">Create invoice from memo manually after settlement</Label>
            </div>
            <p className="text-sm text-primary ml-6">
              When enabled, invoice for settled orders won't be created automatically. The biller must manually create invoice from advanced order grid.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="printKotAccept" checked={printKotOnAccepting} onCheckedChange={(c) => setPrintKotOnAccepting(!!c)} />
            <Label htmlFor="printKotAccept">Print Kot on accepting online advance order</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="noCheckStock" checked={noCheckOfflineStock} onCheckedChange={(c) => setNoCheckOfflineStock(!!c)} />
            <Label htmlFor="noCheckStock">Do not check offline stock at time of advance order</Label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
        </div>
      </div>
    </div>
  );
};
