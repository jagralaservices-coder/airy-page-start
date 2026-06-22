import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Printer as PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import BluetoothPrinterManager from '@/components/pos/BluetoothPrinterManager';
import { Switch } from '@/components/ui/switch';
import { BillConfigSettings } from './BillConfigSettings';
import { KOTSettings } from './KOTSettings';
import { useSubscription } from '@/hooks/useSubscription';
interface PrintSettingsProps {
  onBack: () => void;
}

interface PrinterConfig {
  id: string;
  printerName: string;
  selectedPrinter: string;
  printerType: 'general' | 'dotMatrix';
  receiptType: string;
  useForCaptainBill: boolean;
  useForReportPrint: boolean;
  highlightOrderId: string;
  assignedFor: string[];
  
  // Bill Print Settings
  restaurantName: string;
  headerText: string;
  footerText: string;
  messageForNewCustomer: string;
  
  // Display Options
  showRestaurantName: boolean;
  showRetailInvoiceOnTop: boolean;
  showSrNoColumn: boolean;
  showAssignToLabel: boolean;
  showNoOfPersons: boolean;
  showNetTotalGSTMessage: boolean;
  dateDisplay: 'date' | 'dateTime';
  dateSource: 'orderCreation' | 'firstBillPrint';
  showHeaderBold: boolean;
  showFooterBold: boolean;
  showRestaurantNameBold: boolean;
  showCustomerNotes: boolean;
  showAmountInTaxes: boolean;
  showDiscountReason: boolean;
  showAddonsPrice: boolean;
  showAddonsSeparateRow: boolean;
  showAddonGroupName: boolean;
  showSpecialNotes: boolean;
  printRestaurantLogo: boolean;
  showZeroTaxes: boolean;
  showAddonQuantity: boolean;
  hideCustomerInfoIfEmpty: boolean;
  showMaskedPhone: boolean;
  showCustomerDueAmount: boolean;
  
  // Layout Settings
  billingMainWidth: number;
  billingOuterSpace: { top: number; right: number; bottom: number; left: number };
  billingItemBoxHeight: number;
  restaurantNameFontSize: number;
  headerFooterFontSize: number;
  dateBillNoFontSize: number;
  itemListingFontSize: number;
  grandTotalFontSize: number;
  billingFontFamily: string;
  paperSize: string;
  
  // Column Widths
  srNoColumnWidth: number;
  quantityColumnWidth: number;
  itemPriceColumnWidth: number;
  itemTotalColumnWidth: number;
  itemListingLineHeight: number;
  extraGapBetweenSeparation: number;
  itemsPerPage: number;
  decimalPointsInQty: number;
  decimalPointsForCalc: string;
  
  // Labels
  showTotalItemsLine: boolean;
  complimentaryBillLabel: string;
  salesReturnBillLabel: string;
  mainSubTotalLabel: string;
  showSubTotal: 'withoutBackwardTax' | 'withBackwardTax';
  
  // Charge Display
  displayDeliveryCharge: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  displayContainerCharge: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  displayServiceCharge: { delivery: boolean; pickUp: boolean; dineIn: boolean };
  
  // Language & Order Type
  languageOption: 'primary' | 'secondary' | 'both';
  orderTypeOption: 'orderType' | 'subOrderType' | 'both';
  printItemWiseDiscount: boolean;
  printInvoiceBarcode: boolean;
  showSplitBillCount: boolean;
}

const defaultPrinter: PrinterConfig = {
  id: '',
  printerName: '',
  selectedPrinter: '',
  printerType: 'general',
  receiptType: '',
  useForCaptainBill: false,
  useForReportPrint: false,
  highlightOrderId: 'last4',
  assignedFor: [],
  restaurantName: '',
  headerText: '',
  footerText: 'Thanks',
  messageForNewCustomer: '',
  showRestaurantName: true,
  showRetailInvoiceOnTop: false,
  showSrNoColumn: false,
  showAssignToLabel: false,
  showNoOfPersons: false,
  showNetTotalGSTMessage: false,
  dateDisplay: 'dateTime',
  dateSource: 'orderCreation',
  showHeaderBold: false,
  showFooterBold: false,
  showRestaurantNameBold: true,
  showCustomerNotes: false,
  showAmountInTaxes: false,
  showDiscountReason: false,
  showAddonsPrice: true,
  showAddonsSeparateRow: true,
  showAddonGroupName: true,
  showSpecialNotes: false,
  printRestaurantLogo: false,
  showZeroTaxes: false,
  showAddonQuantity: true,
  hideCustomerInfoIfEmpty: false,
  showMaskedPhone: false,
  showCustomerDueAmount: false,
  billingMainWidth: 250,
  billingOuterSpace: { top: 0, right: 0, bottom: 0, left: 10 },
  billingItemBoxHeight: 0,
  restaurantNameFontSize: 14,
  headerFooterFontSize: 13,
  dateBillNoFontSize: 13,
  itemListingFontSize: 13,
  grandTotalFontSize: 14,
  billingFontFamily: 'Verdana',
  paperSize: '',
  srNoColumnWidth: 10,
  quantityColumnWidth: 20,
  itemPriceColumnWidth: 40,
  itemTotalColumnWidth: 55,
  itemListingLineHeight: 5,
  extraGapBetweenSeparation: 5,
  itemsPerPage: 0,
  decimalPointsInQty: 0,
  decimalPointsForCalc: 'master',
  showTotalItemsLine: false,
  complimentaryBillLabel: 'Complimentary Bill',
  salesReturnBillLabel: 'Sales Return Bill',
  mainSubTotalLabel: 'Sub Total',
  showSubTotal: 'withoutBackwardTax',
  displayDeliveryCharge: { delivery: true, pickUp: true, dineIn: true },
  displayContainerCharge: { delivery: true, pickUp: true, dineIn: true },
  displayServiceCharge: { delivery: true, pickUp: true, dineIn: true },
  languageOption: 'primary',
  orderTypeOption: 'orderType',
  printItemWiseDiscount: false,
  printInvoiceBarcode: false,
  showSplitBillCount: false,
};

const PrintSettings: React.FC<PrintSettingsProps> = ({ onBack }) => {
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const { canAccess } = useSubscription();
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [currentPrinter, setCurrentPrinter] = useState<PrinterConfig>(defaultPrinter);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printBill, setPrintBill] = useState(true);
  const [printKOT, setPrintKOT] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    const saved = getSetting<PrinterConfig[]>('printers_config');
    if (saved && Array.isArray(saved)) {
      setPrinters(saved);
    }
    const settings = getSetting<{ printBill?: boolean; printKOT?: boolean }>('pos_settings_printer');
    if (settings) {
      if (settings.printBill !== undefined) setPrintBill(settings.printBill);
      if (settings.printKOT !== undefined) setPrintKOT(settings.printKOT);
    }
  }, [isLoaded, getSetting]);

  const togglePrintBill = (checked: boolean) => {
    setPrintBill(checked);
    const settings = getSetting<{ printBill?: boolean; printKOT?: boolean }>('pos_settings_printer') || {};
    saveSetting('pos_settings_printer', { ...settings, printBill: checked });
    toast.success(`Bill printing turned ${checked ? 'ON' : 'OFF'}`);
  };

  const togglePrintKOT = (checked: boolean) => {
    setPrintKOT(checked);
    const settings = getSetting<{ printBill?: boolean; printKOT?: boolean }>('pos_settings_printer') || {};
    saveSetting('pos_settings_printer', { ...settings, printKOT: checked });
    toast.success(`KOT printing turned ${checked ? 'ON' : 'OFF'}`);
  };

  const savePrinters = (newPrinters: PrinterConfig[]) => {
    setPrinters(newPrinters);
    saveSetting('printers_config', newPrinters);
  };

  const handleAddPrinter = () => {
    setCurrentPrinter({ ...defaultPrinter, id: Date.now().toString() });
    setView('add');
  };

  const handleEditPrinter = (printer: PrinterConfig) => {
    setCurrentPrinter(printer);
    setEditingId(printer.id);
    setView('edit');
  };

  const handleDeletePrinter = (id: string) => {
    const updated = printers.filter(p => p.id !== id);
    savePrinters(updated);
    toast.success('Printer deleted');
  };

  const handleSavePrinter = () => {
    if (!currentPrinter.printerName) {
      toast.error('Printer name is required');
      return;
    }
    
    if (view === 'add') {
      savePrinters([...printers, currentPrinter]);
      toast.success('Printer added successfully');
    } else {
      const updated = printers.map(p => p.id === editingId ? currentPrinter : p);
      savePrinters(updated);
      toast.success('Printer updated successfully');
    }
    setView('list');
    setEditingId(null);
  };

  const updatePrinter = <K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) => {
    setCurrentPrinter(prev => ({ ...prev, [key]: value }));
  };

  // Printer Listing View
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold text-foreground">Printer Listing</h1>
            <div className="flex items-center gap-3">
              <Button onClick={handleAddPrinter} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Printer
              </Button>
              <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 space-y-4">
          {/* Master Print Configuration Toggles */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <PrinterIcon className="w-5 h-5 text-primary" />
                Master Print Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="print-bill-toggle" className="font-semibold text-base cursor-pointer">Print Bill (Checkout)</Label>
                    <p className="text-sm text-muted-foreground">Automatically trigger or skip physical print on checkout completion.</p>
                  </div>
                  <Switch
                    id="print-bill-toggle"
                    checked={printBill}
                    onCheckedChange={togglePrintBill}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="print-kot-toggle" className="font-semibold text-base cursor-pointer">Print KOT (Kitchen Ticket)</Label>
                    <p className="text-sm text-muted-foreground">Automatically trigger or skip physical print for kitchen orders.</p>
                  </div>
                  <Switch
                    id="print-kot-toggle"
                    checked={printKOT}
                    onCheckedChange={togglePrintKOT}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bluetooth Thermal Printer Section */}
          <BluetoothPrinterManager />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Department wise Printer Name</th>
                      <th className="text-left p-4 font-medium">Printer Type</th>
                      <th className="text-left p-4 font-medium">Action</th>
                      <th className="text-left p-4 font-medium">Printer Assign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No printers configured. Click "Add Printer" to add one.
                        </td>
                      </tr>
                    ) : (
                      printers.map((printer) => (
                        <tr key={printer.id} className="border-b">
                          <td className="p-4">
                            <div>
                              <span className="font-medium">{printer.printerName}</span>
                              <div className="flex gap-1 mt-1">
                                {printer.assignedFor.map(a => (
                                  <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {printer.printerType === 'general' ? 'General' : 'Dot Matrix with Roll Paper'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditPrinter(printer)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePrinter(printer.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <PrinterIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <Button variant="outline" size="sm">Assign</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="border-t border-border pt-6 mt-6 space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Bill Configuration</h4>
              <BillConfigSettings />
            </div>
            {canAccess('kot') && (
              <div className="border-t border-border pt-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">KOT Settings</h4>
                <KOTSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Add/Edit Printer View
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-foreground">
            {view === 'add' ? 'Add Printer' : 'Edit Printer'}
          </h1>
          <Button variant="ghost" onClick={() => setView('list')} className="flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Printer Basic Settings */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Printer Name <span className="text-destructive">*</span></Label>
                <Input
                  className="col-span-2"
                  value={currentPrinter.printerName}
                  onChange={(e) => updatePrinter('printerName', e.target.value)}
                  placeholder="Enter printer name"
                />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Select Printer <span className="text-destructive">*</span></Label>
                <Select value={currentPrinter.selectedPrinter} onValueChange={(v) => updatePrinter('selectedPrinter', v)}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue placeholder="Select Printer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="printer1">Printer 1</SelectItem>
                    <SelectItem value="printer2">Printer 2</SelectItem>
                    <SelectItem value="printer3">Printer 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Printer Type</Label>
                <RadioGroup
                  className="col-span-2 flex gap-6"
                  value={currentPrinter.printerType}
                  onValueChange={(v: any) => updatePrinter('printerType', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="general" id="general" />
                    <Label htmlFor="general" className="font-normal">General</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="dotMatrix" id="dotMatrix" />
                    <Label htmlFor="dotMatrix" className="font-normal">Dot Matrix with Roll Paper</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Set standard printer receipt type</Label>
                <div className="col-span-2 flex gap-2">
                  <Select value={currentPrinter.receiptType} onValueChange={(v) => updatePrinter('receiptType', v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Set standard printer receipt type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal58">Thermal 58mm</SelectItem>
                      <SelectItem value="thermal80">Thermal 80mm</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-primary hover:bg-primary/90">Populate</Button>
                </div>
              </div>

              <p className="text-sm text-primary ml-[33%]">
                Note: Once the user clicks on Populate, the settings for receipt on based on the printer receipt type would be added
              </p>

              <div className="space-y-3 ml-[33%]">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="captainBill" 
                    checked={currentPrinter.useForCaptainBill}
                    onCheckedChange={(c) => updatePrinter('useForCaptainBill', !!c)}
                  />
                  <Label htmlFor="captainBill" className="font-normal">Use only for captain bill print</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="reportPrint" 
                    checked={currentPrinter.useForReportPrint}
                    onCheckedChange={(c) => updatePrinter('useForReportPrint', !!c)}
                  />
                  <Label htmlFor="reportPrint" className="font-normal">Use this printer for Report print</Label>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Highlight order id on bill and KoT</Label>
                <Select value={currentPrinter.highlightOrderId} onValueChange={(v) => updatePrinter('highlightOrderId', v)}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last4">Last 4 characters</SelectItem>
                    <SelectItem value="last6">Last 6 characters</SelectItem>
                    <SelectItem value="full">Full Order ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Bill Print Settings */}
              <h3 className="text-lg font-semibold">Bill Print Settings</h3>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Restaurant Name <span className="text-destructive">*</span></Label>
                <Input
                  className="col-span-2"
                  value={currentPrinter.restaurantName}
                  onChange={(e) => updatePrinter('restaurantName', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="pt-2">Header Text <span className="text-destructive">*</span></Label>
                <div className="col-span-2">
                  <Textarea
                    value={currentPrinter.headerText}
                    onChange={(e) => updatePrinter('headerText', e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-primary mt-1">Example:- Restaurant Name, Add, Phone Number, etc.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="pt-2">Footer Text</Label>
                <div className="col-span-2">
                  <Textarea
                    value={currentPrinter.footerText}
                    onChange={(e) => updatePrinter('footerText', e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-primary mt-1">Example:- TIN No., Comments, etc.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="pt-2">Message for new customer</Label>
                <Textarea
                  className="col-span-2"
                  value={currentPrinter.messageForNewCustomer}
                  onChange={(e) => updatePrinter('messageForNewCustomer', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Display Options */}
              <div className="space-y-3 ml-[33%]">
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showRestaurantName} onCheckedChange={(c) => updatePrinter('showRestaurantName', !!c)} />
                  <Label className="font-normal">Show Restaurant Name</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showRetailInvoiceOnTop} onCheckedChange={(c) => updatePrinter('showRetailInvoiceOnTop', !!c)} />
                  <Label className="font-normal">Show "Retail Invoice" On Top</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showSrNoColumn} onCheckedChange={(c) => updatePrinter('showSrNoColumn', !!c)} />
                  <Label className="font-normal">Show Sr No. Column In Item Listing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAssignToLabel} onCheckedChange={(c) => updatePrinter('showAssignToLabel', !!c)} />
                  <Label className="font-normal">Show Assign to Label</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showNoOfPersons} onCheckedChange={(c) => updatePrinter('showNoOfPersons', !!c)} />
                  <Label className="font-normal">Show No. of persons in Dine In</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showNetTotalGSTMessage} onCheckedChange={(c) => updatePrinter('showNetTotalGSTMessage', !!c)} />
                  <Label className="font-normal">Show "Net Total inclusive of GST" message to bill</Label>
                </div>
              </div>

              <div className="ml-[33%]">
                <RadioGroup
                  className="flex gap-6"
                  value={currentPrinter.dateDisplay}
                  onValueChange={(v: any) => updatePrinter('dateDisplay', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="date" id="showDate" />
                    <Label htmlFor="showDate" className="font-normal">Show Date</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="dateTime" id="showDateTime" />
                    <Label htmlFor="showDateTime" className="font-normal">Show Date & Time</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="ml-[33%]">
                <RadioGroup
                  className="flex gap-6"
                  value={currentPrinter.dateSource}
                  onValueChange={(v: any) => updatePrinter('dateSource', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="orderCreation" id="orderCreation" />
                    <Label htmlFor="orderCreation" className="font-normal">Use Order Creation Date</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="firstBillPrint" id="firstBillPrint" />
                    <Label htmlFor="firstBillPrint" className="font-normal">Use First Time Bill Print Date</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 ml-[33%]">
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showHeaderBold} onCheckedChange={(c) => updatePrinter('showHeaderBold', !!c)} />
                  <Label className="font-normal">Show Header Bold in Bill</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showFooterBold} onCheckedChange={(c) => updatePrinter('showFooterBold', !!c)} />
                  <Label className="font-normal">Show Footer Bold in Bill</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showRestaurantNameBold} onCheckedChange={(c) => updatePrinter('showRestaurantNameBold', !!c)} />
                  <Label className="font-normal">Show Restaurant Name Bold</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showCustomerNotes} onCheckedChange={(c) => updatePrinter('showCustomerNotes', !!c)} />
                  <Label className="font-normal">Show customer notes on bill.</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAmountInTaxes} onCheckedChange={(c) => updatePrinter('showAmountInTaxes', !!c)} />
                  <Label className="font-normal">Show Amount(xxx@) in Taxes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showDiscountReason} onCheckedChange={(c) => updatePrinter('showDiscountReason', !!c)} />
                  <Label className="font-normal">Show Discount Reason</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAddonsPrice} onCheckedChange={(c) => updatePrinter('showAddonsPrice', !!c)} />
                  <Label className="font-normal">Show Addons price in bill print</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAddonsSeparateRow} onCheckedChange={(c) => updatePrinter('showAddonsSeparateRow', !!c)} />
                  <Label className="font-normal">Show Addons as a separate row in bill print</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAddonGroupName} onCheckedChange={(c) => updatePrinter('showAddonGroupName', !!c)} />
                  <Label className="font-normal">Show Addon Group Name</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showSpecialNotes} onCheckedChange={(c) => updatePrinter('showSpecialNotes', !!c)} />
                  <Label className="font-normal">Show Special Notes in bill print</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.printRestaurantLogo} onCheckedChange={(c) => updatePrinter('printRestaurantLogo', !!c)} />
                  <Label className="font-normal">Print restaurant logo in bill</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showZeroTaxes} onCheckedChange={(c) => updatePrinter('showZeroTaxes', !!c)} />
                  <Label className="font-normal">Show Zero Taxes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showAddonQuantity} onCheckedChange={(c) => updatePrinter('showAddonQuantity', !!c)} />
                  <Label className="font-normal">Show Addon Quantity with the total item quantity (multiplication) to prepare in Bill.</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.hideCustomerInfoIfEmpty} onCheckedChange={(c) => updatePrinter('hideCustomerInfoIfEmpty', !!c)} />
                  <Label className="font-normal">Hide customer information labels if customer name/phone number is empty.</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showMaskedPhone} onCheckedChange={(c) => updatePrinter('showMaskedPhone', !!c)} />
                  <Label className="font-normal">Show masked phone number</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showCustomerDueAmount} onCheckedChange={(c) => updatePrinter('showCustomerDueAmount', !!c)} />
                  <Label className="font-normal">Show customer due amount on bill print.</Label>
                </div>
              </div>

              <Separator />

              {/* Layout Settings */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Billing Main Width <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  className="col-span-2"
                  value={currentPrinter.billingMainWidth}
                  onChange={(e) => updatePrinter('billingMainWidth', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Billing Outer Space <span className="text-destructive">*</span></Label>
                <div className="col-span-2 grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Top</Label>
                    <Input
                      type="number"
                      value={currentPrinter.billingOuterSpace.top}
                      onChange={(e) => updatePrinter('billingOuterSpace', { ...currentPrinter.billingOuterSpace, top: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Right</Label>
                    <Input
                      type="number"
                      value={currentPrinter.billingOuterSpace.right}
                      onChange={(e) => updatePrinter('billingOuterSpace', { ...currentPrinter.billingOuterSpace, right: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bottom</Label>
                    <Input
                      type="number"
                      value={currentPrinter.billingOuterSpace.bottom}
                      onChange={(e) => updatePrinter('billingOuterSpace', { ...currentPrinter.billingOuterSpace, bottom: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Left</Label>
                    <Input
                      type="number"
                      value={currentPrinter.billingOuterSpace.left}
                      onChange={(e) => updatePrinter('billingOuterSpace', { ...currentPrinter.billingOuterSpace, left: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Billing Item Box Height <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  className="col-span-2"
                  value={currentPrinter.billingItemBoxHeight}
                  onChange={(e) => updatePrinter('billingItemBoxHeight', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Restaurant Name Font Size <span className="text-destructive">*</span></Label>
                <Select value={String(currentPrinter.restaurantNameFontSize)} onValueChange={(v) => updatePrinter('restaurantNameFontSize', parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Header Footer Font Size for Bill <span className="text-destructive">*</span></Label>
                <Select value={String(currentPrinter.headerFooterFontSize)} onValueChange={(v) => updatePrinter('headerFooterFontSize', parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Date Bill-No. Box Font Size <span className="text-destructive">*</span></Label>
                <Select value={String(currentPrinter.dateBillNoFontSize)} onValueChange={(v) => updatePrinter('dateBillNoFontSize', parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Item Listing Box Font Size for Bill <span className="text-destructive">*</span></Label>
                <Select value={String(currentPrinter.itemListingFontSize)} onValueChange={(v) => updatePrinter('itemListingFontSize', parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Grand Total Text Font Size <span className="text-destructive">*</span></Label>
                <Select value={String(currentPrinter.grandTotalFontSize)} onValueChange={(v) => updatePrinter('grandTotalFontSize', parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Billing Font Family <span className="text-destructive">*</span></Label>
                <Select value={currentPrinter.billingFontFamily} onValueChange={(v) => updatePrinter('billingFontFamily', v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Paper Size</Label>
                <Select value={currentPrinter.paperSize} onValueChange={(v) => updatePrinter('paperSize', v)}>
                  <SelectTrigger className="col-span-2"><SelectValue placeholder="Select Paper Size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Column Widths */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Sr No. Column width <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.srNoColumnWidth} onChange={(e) => updatePrinter('srNoColumnWidth', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Quantity Column width <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.quantityColumnWidth} onChange={(e) => updatePrinter('quantityColumnWidth', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Item Price Column width <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.itemPriceColumnWidth} onChange={(e) => updatePrinter('itemPriceColumnWidth', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Item Total Amount Column width <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.itemTotalColumnWidth} onChange={(e) => updatePrinter('itemTotalColumnWidth', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Item Listing Line height Between two rows <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.itemListingLineHeight} onChange={(e) => updatePrinter('itemListingLineHeight', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Extra Gap Between Separation <span className="text-destructive">*</span></Label>
                <Input type="number" className="col-span-2" value={currentPrinter.extraGapBetweenSeparation} onChange={(e) => updatePrinter('extraGapBetweenSeparation', parseInt(e.target.value) || 0)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Items Per Page in Bill <span className="text-destructive">*</span></Label>
                <div className="col-span-2">
                  <Input type="number" value={currentPrinter.itemsPerPage} onChange={(e) => updatePrinter('itemsPerPage', parseInt(e.target.value) || 0)} />
                  <p className="text-sm text-primary mt-1">Recommended value is 40 for thermal with roll paper printer.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Enter decimal point shown in Quantity <span className="text-destructive">*</span></Label>
                <div className="col-span-2">
                  <Select value={String(currentPrinter.decimalPointsInQty)} onValueChange={(v) => updatePrinter('decimalPointsInQty', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-primary mt-1">(ex. 3 decimal to show 0.250 KG in Print.)</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Select decimal points for bill print calculation</Label>
                <Select value={currentPrinter.decimalPointsForCalc} onValueChange={(v) => updatePrinter('decimalPointsForCalc', v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master">Master Decimal</SelectItem>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-[33%]">
                <Checkbox checked={currentPrinter.showTotalItemsLine} onCheckedChange={(c) => updatePrinter('showTotalItemsLine', !!c)} />
                <Label className="font-normal">Show total of items line after items listing</Label>
              </div>

              <Separator />

              {/* Labels */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Complimentary Bill Label</Label>
                <div className="col-span-2">
                  <Input value={currentPrinter.complimentaryBillLabel} onChange={(e) => updatePrinter('complimentaryBillLabel', e.target.value)} />
                  <p className="text-sm text-primary mt-1">Leave blank if you dont want label.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Sales Return Bill Label</Label>
                <div className="col-span-2">
                  <Input value={currentPrinter.salesReturnBillLabel} onChange={(e) => updatePrinter('salesReturnBillLabel', e.target.value)} />
                  <p className="text-sm text-primary mt-1">Leave blank if you dont want label.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Main sub total label <span className="text-destructive">*</span></Label>
                <Input className="col-span-2" value={currentPrinter.mainSubTotalLabel} onChange={(e) => updatePrinter('mainSubTotalLabel', e.target.value)} />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Show Sub Total <span className="text-destructive">*</span></Label>
                <RadioGroup
                  className="col-span-2 flex gap-6"
                  value={currentPrinter.showSubTotal}
                  onValueChange={(v: any) => updatePrinter('showSubTotal', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="withoutBackwardTax" id="withoutTax" />
                    <Label htmlFor="withoutTax" className="font-normal">Without backward tax</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="withBackwardTax" id="withTax" />
                    <Label htmlFor="withTax" className="font-normal">With backward tax</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Charge Display */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Display Delivery Charge in Bill</Label>
                <div className="col-span-2 flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayDeliveryCharge.delivery} onCheckedChange={(c) => updatePrinter('displayDeliveryCharge', { ...currentPrinter.displayDeliveryCharge, delivery: !!c })} />
                    <Label className="font-normal">Delivery</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayDeliveryCharge.pickUp} onCheckedChange={(c) => updatePrinter('displayDeliveryCharge', { ...currentPrinter.displayDeliveryCharge, pickUp: !!c })} />
                    <Label className="font-normal">Pick Up</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayDeliveryCharge.dineIn} onCheckedChange={(c) => updatePrinter('displayDeliveryCharge', { ...currentPrinter.displayDeliveryCharge, dineIn: !!c })} />
                    <Label className="font-normal">Dine In</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Display Container Charge in Bill</Label>
                <div className="col-span-2 flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayContainerCharge.delivery} onCheckedChange={(c) => updatePrinter('displayContainerCharge', { ...currentPrinter.displayContainerCharge, delivery: !!c })} />
                    <Label className="font-normal">Delivery</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayContainerCharge.pickUp} onCheckedChange={(c) => updatePrinter('displayContainerCharge', { ...currentPrinter.displayContainerCharge, pickUp: !!c })} />
                    <Label className="font-normal">Pick Up</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayContainerCharge.dineIn} onCheckedChange={(c) => updatePrinter('displayContainerCharge', { ...currentPrinter.displayContainerCharge, dineIn: !!c })} />
                    <Label className="font-normal">Dine In</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Display Service Charge in Bill</Label>
                <div className="col-span-2 flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayServiceCharge.delivery} onCheckedChange={(c) => updatePrinter('displayServiceCharge', { ...currentPrinter.displayServiceCharge, delivery: !!c })} />
                    <Label className="font-normal">Delivery</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayServiceCharge.pickUp} onCheckedChange={(c) => updatePrinter('displayServiceCharge', { ...currentPrinter.displayServiceCharge, pickUp: !!c })} />
                    <Label className="font-normal">Pick Up</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.displayServiceCharge.dineIn} onCheckedChange={(c) => updatePrinter('displayServiceCharge', { ...currentPrinter.displayServiceCharge, dineIn: !!c })} />
                    <Label className="font-normal">Dine In</Label>
                  </div>
                </div>
              </div>

              {/* Language & Order Type */}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Language Options</Label>
                <RadioGroup
                  className="col-span-2 flex gap-6"
                  value={currentPrinter.languageOption}
                  onValueChange={(v: any) => updatePrinter('languageOption', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="primary" id="primary" />
                    <Label htmlFor="primary" className="font-normal">Primary Language</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="secondary" id="secondary" />
                    <Label htmlFor="secondary" className="font-normal">Secondary Language</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="both" id="bothLang" />
                    <Label htmlFor="bothLang" className="font-normal">Both</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <Label>Order type options <span className="text-destructive">*</span></Label>
                <RadioGroup
                  className="col-span-2 flex gap-6"
                  value={currentPrinter.orderTypeOption}
                  onValueChange={(v: any) => updatePrinter('orderTypeOption', v)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="orderType" id="orderType" />
                    <Label htmlFor="orderType" className="font-normal">Order Type</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="subOrderType" id="subOrderType" />
                    <Label htmlFor="subOrderType" className="font-normal">Sub Order Type</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="both" id="bothOrder" />
                    <Label htmlFor="bothOrder" className="font-normal">Both</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 ml-[33%]">
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.printItemWiseDiscount} onCheckedChange={(c) => updatePrinter('printItemWiseDiscount', !!c)} />
                  <Label className="font-normal">Print total of item wise discount on bill</Label>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentPrinter.printInvoiceBarcode} onCheckedChange={(c) => updatePrinter('printInvoiceBarcode', !!c)} />
                    <Label className="font-normal">Print invoice barcode on bill.</Label>
                  </div>
                  <p className="text-sm text-primary ml-6">Note: Scanning this barcode opens the bill in edit mode.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={currentPrinter.showSplitBillCount} onCheckedChange={(c) => updatePrinter('showSplitBillCount', !!c)} />
                  <Label className="font-normal">Show split bill count and total on bills.</Label>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border bg-card p-4 flex justify-end gap-3">
        <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
        <Button onClick={handleSavePrinter} className="bg-primary hover:bg-primary/90">Save</Button>
      </div>
    </div>
  );
};

export default PrintSettings;
