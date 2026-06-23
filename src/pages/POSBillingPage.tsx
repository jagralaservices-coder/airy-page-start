import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency as formatCurrencyLib, MenuItem, MenuItemVariation } from '@/lib/store';
import { directPrint } from '@/lib/printUtils';
import { generateProfessionalBill, generateKOTContent } from '@/lib/billTemplate';
import { useIsMobile } from '@/hooks/use-mobile';
import MobilePOSPage from './MobilePOSPage';
import { VariationSelectorSheet } from '@/components/pos/VariationSelectorSheet';
import { BarcodeButton } from '@/components/pos/BarcodeButton';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { LinkBarcodeDialog } from '@/components/pos/LinkBarcodeDialog';
import { CustomItemDialog } from '@/components/pos/CustomItemDialog';
import { PromptPriceWeightDialog } from '@/components/pos/PromptPriceWeightDialog';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Pause, 
  Play, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Scissors, 
  Printer,
  FileText,
  ChevronUp,
  ChevronDown,
  Percent,
  Receipt,
  MapPin,
  Layers,
  MoreHorizontal,
  Wallet,
  Clock,
  SplitSquareHorizontal,
  Check,
  ScanBarcode,
  User,
  PackagePlus,
  QrCode,
  ShoppingBag,
  Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { SplitBillDialog } from '@/components/pos/SplitBillDialog';
import { DiscountDialog } from '@/components/pos/DiscountDialog';
import { PartPaymentDialog } from '@/components/pos/PartPaymentDialog';
import { AccessPaymentDialog, AccessPaySubMethod } from '@/components/pos/AccessPaymentDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CustomerDetails } from '@/components/pos/CustomerDetails';
import { autoShareBillAfterPrint } from '@/lib/billShareUtils';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { QRMenuGenerator } from '@/components/pos/QRMenuGenerator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { QROrdersPanel } from '@/components/pos/QROrdersPanel';
import { useSubscription } from '@/hooks/useSubscription';
import { useSalesResetWarning } from '@/hooks/useSalesResetWarning';
import { SalesResetWarningDialog } from '@/components/pos/SalesResetWarningDialog';
import { useUICustomization, ButtonConfig, DEFAULT_CONFIG } from '@/hooks/useUICustomization';
import { useEditMode } from '@/hooks/useEditMode';
import { EditModeToolbar } from '@/components/pos/EditModeToolbar';
import { DraggableButtonGrid } from '@/components/pos/DraggableButtonGrid';
import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import {
  Select as LayoutSelect,
  SelectContent as LayoutSelectContent,
  SelectItem as LayoutSelectItem,
  SelectTrigger as LayoutSelectTrigger,
  SelectValue as LayoutSelectValue,
} from '@/components/ui/select';

export const POSBillingPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { config: uiConfig, isButtonVisible, toggleButton, reorderButtons, getGroupButtons, updateLayout, updateConfig, resetToDefault } = useUICustomization();
  const editMode = useEditMode();
  const { t, formatCurrency } = useLocale();
  const {
    menuItems,
    categories,
    activeCategory,
    setActiveCategory,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    cartTax,
    cartTotal,
    discount,
    setDiscount,
    taxPercent,
    setTaxPercent,
    customTax,
    setCustomTax,
    currentOrderType,
    setCurrentOrderType,
    selectedTable,
    setSelectedTable,
    tables,
    placeOrder,
    directBillPrint,
    holdBill,
    heldBills,
    recallBill,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('pos_billing_search_query') || '';
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showQROrders, setShowQROrders] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'upi' | 'due' | 'part' | 'wallet' | 'credit' | 'access' | null>(() => {
    return (localStorage.getItem('pos_billing_selected_payment') as any) || null;
  });
  const [activeSection, setActiveSection] = useState<'products' | 'cart' | 'payments' | 'actions'>('products');
  const [cartHighlightIndex, setCartHighlightIndex] = useState(0);
  const [paymentHighlightIndex, setPaymentHighlightIndex] = useState(0);
  const [actionHighlightIndex, setActionHighlightIndex] = useState(0);
  const [sheetPaymentHighlightIndex, setSheetPaymentHighlightIndex] = useState(0);
  const [showBillingSummary, setShowBillingSummary] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showMorePayments, setShowMorePayments] = useState(false);
  const [showPartPaymentDialog, setShowPartPaymentDialog] = useState(false);
  const [showAccessPaymentDialog, setShowAccessPaymentDialog] = useState(false);
  const [partPaymentDetails, setPartPaymentDetails] = useState<{ method: string; amount: number }[]>([]);
  const [discountReason, setDiscountReason] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(() => {
    const saved = localStorage.getItem('pos_billing_delivery_charge');
    return saved ? Number(saved) : 0;
  });
  const [containerCharge, setContainerCharge] = useState(() => {
    const saved = localStorage.getItem('pos_billing_container_charge');
    return saved ? Number(saved) : 0;
  });
  const [tip, setTip] = useState(() => {
    const saved = localStorage.getItem('pos_billing_tip');
    return saved ? Number(saved) : 0;
  });
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(selectedTable?.id || null);
  const [selectedItemForVariation, setSelectedItemForVariation] = useState<MenuItem | null>(null);
  const [variationSheetOpen, setVariationSheetOpen] = useState(false);
  const [promptItem, setPromptItem] = useState<MenuItem | null>(null);
  const [showPaidConfirmDialog, setShowPaidConfirmDialog] = useState(false);
  const preparedPrintWindowRef = useRef<Window | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [complimentaryNote, setComplimentaryNote] = useState('');
  const [showComplimentaryDialog, setShowComplimentaryDialog] = useState(false);
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_billing_customer');
      return saved ? JSON.parse(saved) : { name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' };
    } catch {
      return { name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' };
    }
  });
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const { canAccess } = useSubscription();
  const { getSetting } = useStoreSettings();
  const printerSettings = getSetting<{ printBill?: boolean; printKOT?: boolean }>('pos_settings_printer') || { printBill: true, printKOT: true };

  const actionButtons = useMemo(() => {
    return getGroupButtons('cart_actions').filter(btn => {
      if (['discount', 'customer', 'qrMenu', 'qrOrders', 'heldBills'].includes(btn.id)) return false;
      if ((btn.id === 'kot' || btn.id === 'kotPrint') && !canAccess('kot')) return false;
      return true;
    });
  }, [getGroupButtons, canAccess]);

  // Sales Reset Warning - global listener
  const {
    showWarning: showSalesResetWarning,
    timeUntilReset,
    formattedResetTime,
    handleResetNow,
    handleExtendTime,
    dismissWarning: dismissSalesResetWarning,
  } = useSalesResetWarning();

  // Initialize barcode scanner for USB/wireless scanner support
  const { unmatchedCode, clearUnmatchedCode } = useBarcodeScanner();

  const filteredItems = useMemo(() => {
    const baseProducts = menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery || 
                           item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.sku && String(item.sku).toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (item.barcode && String(item.barcode).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch && item.isAvailable;
    });

    const othersItem: MenuItem = {
      id: `others-${activeCategory}`,
      name: 'Others',
      price: 0,
      category: activeCategory === 'all' ? 'others' : activeCategory,
      color: 'hsl(var(--card))',
      isAvailable: true,
    };

    return [othersItem, ...baseProducts];
  }, [menuItems, activeCategory, searchQuery]);

  const activeCategories = useMemo(() => {
    return categories.filter(cat => menuItems.some(item => item.category === cat.id));
  }, [categories, menuItems]);

  // Get available tables for dropdown
  const availableTables = tables.filter(t => t.status === 'available' || t.id === selectedTableId);

  const handleTableChange = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      setSelectedTable(table);
      setSelectedTableId(tableId);
    }
  };

  // Handle item click - check for variations
  const handleItemClick = (item: MenuItem) => {
    if (item.id.startsWith('others-')) {
      setShowCustomItemDialog(true);
      return;
    }

    if (!item.isAvailable) return;
    
    if (item.variations && item.variations.length > 0) {
      setSelectedItemForVariation(item);
      setVariationSheetOpen(true);
    } else if (item.preparationTime === 998 || item.preparationTime === 999) {
      setPromptItem(item);
    } else {
      addToCart(item);
    }
  };

  const handleAddCustomItem = (item: MenuItem, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(item);
    }
  };

  // Handle variation selection from popup
  const handleVariationSelect = (item: MenuItem, variation?: MenuItemVariation, quantity: number = 1) => {
    const itemToAdd = variation ? {
      ...item,
      price: variation.price,
      name: `${item.name} (${variation.name})`,
      sku: variation.sku || item.sku,
    } : item;

    if (item.preparationTime === 998 || item.preparationTime === 999) {
      setPromptItem(itemToAdd);
    } else {
      for (let i = 0; i < quantity; i++) {
        addToCart(itemToAdd);
      }
    }
  };

  const allOrderTypes = [
    { id: 'dine-in' as const, label: t('pos.dineIn') },
    { id: 'takeaway' as const, label: t('pos.takeaway') },
    { id: 'delivery' as const, label: t('pos.delivery') },
  ];

  const orderTypes = allOrderTypes.filter(t => {
    if (t.id === 'dine-in' && !canAccess('dineIn')) return false;
    if (t.id === 'takeaway' && !canAccess('takeaway')) return false;
    if (t.id === 'delivery' && !canAccess('delivery')) return false;
    return true;
  });

  // Calculate custom tax
  const calculatedTax = customTax !== null ? customTax : (cartSubtotal * taxPercent / 100);
  const adjustedTotal = cartSubtotal + calculatedTax - discount + deliveryCharge + containerCharge + tip;
  const finalTotal = isComplimentary ? 0 : adjustedTotal;
  const roundOff = Math.round(finalTotal) - finalTotal;

  const handlePaymentSelect = (method: 'cash' | 'card' | 'upi' | 'due' | 'part' | 'wallet' | 'credit' | 'access') => {
    setSelectedPayment(method);
  };

  const pendingAccessSaleRef = React.useRef<{ amount: number; subMethod: AccessPaySubMethod } | null>(null);
  const pendingAccessPrintWindowRef = React.useRef<Window | null>(null);
  const accessSubMethodRef = React.useRef<AccessPaySubMethod | null>(null);

  const handleAccessPaymentConfirm = (amount: number, subMethod: AccessPaySubMethod) => {
    handlePaymentSelect('access');
    accessSubMethodRef.current = subMethod;
    // Open print window synchronously while still inside user-gesture context
    // so the browser popup blocker doesn't block it.
    const printWindow = preparePrintWindow();
    if (!printWindow) return;

    if (cart.length === 0) {
      // No products selected → add a synthetic Access Payment line item, then sale.
      const accessItem: MenuItem = {
        id: `access-pay-${Date.now()}`,
        name: `Access Payment (${subMethod.toUpperCase()})`,
        price: amount,
        category: 'access',
        categoryId: activeCategory || 'access',
        description: 'Access payment entry',
        image: '',
        available: true,
        preparationTime: 999,
      } as any;
      pendingAccessSaleRef.current = { amount, subMethod };
      pendingAccessPrintWindowRef.current = printWindow;
      addToCart(accessItem, amount, 1);
    } else {
      // Cart already has items → just complete sale as Access Payment.
      setTimeout(() => completeSale('print', 'access', printWindow), 0);
    }
  };

  // When pending access sale flag is set and cart updates, trigger completeSale.
  useEffect(() => {
    if (pendingAccessSaleRef.current && cart.length > 0) {
      const printWindow = pendingAccessPrintWindowRef.current;
      pendingAccessSaleRef.current = null;
      pendingAccessPrintWindowRef.current = null;
      setTimeout(() => {
        completeSale('print', 'access', printWindow);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);



  const getStoreId = (): string => {
    try {
      const storeData = localStorage.getItem('pos_active_store_data');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        return parsed?.id || parsed?.storeId || '';
      }
    } catch {}
    return '';
  };


  // Generate bill content for printing - using centralized template
  const generateBillContent = (order: any) => {
    return generateProfessionalBill({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt
    });
  };

  // Generate KOT content for printing - using centralized template  
  const generateKOT = (order: any) => {
    return generateKOTContent({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt || new Date().toISOString()),
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash'
    });
  };

  const preparePrintWindow = () => {
    console.log('[Print] Button clicked');

    const printWindow = window.open('', '_blank', 'width=420,height=800,menubar=no,toolbar=no,location=no,status=no');

    if (!printWindow) {
      alert('Please allow popups for printing');
      console.log('[Print] Popup blocked');
      return null;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>Print Bill</title><style>@page{size:80mm auto;margin:2mm}body{font-family:monospace;padding:8px;margin:0}</style></head><body>Preparing bill...</body></html>`);
    printWindow.document.close();

    console.log('[Print] Window opened');
    return printWindow;
  };

  // Complete sale - called when Print/E-Bill or KOT is clicked (counts as sale)
  const completeSale = async (action: 'print' | 'kot', overridePayment?: typeof selectedPayment, existingPrintWindow?: Window | null) => {
    if (isProcessingSale) {
      existingPrintWindow?.close();
      return;
    }

    if (cart.length === 0) {
      toast({ title: t('msg.emptyCart'), description: t('msg.addItemsFirst'), variant: 'destructive' });
      existingPrintWindow?.close();
      return;
    }
    
    const paymentToUse = overridePayment || selectedPayment;
    if (!paymentToUse) {
      toast({ title: t('common.selectPayment'), description: t('msg.selectPaymentFirst'), variant: 'destructive' });
      existingPrintWindow?.close();
      return;
    }

    if (paymentToUse === 'credit') {
      if (!customer.name.trim() || !customer.phone.trim()) {
        toast({
          title: 'Customer Details Required',
          description: 'Please add Customer Name and Phone Number for credit (Khata) bills.',
          variant: 'destructive'
        });
        existingPrintWindow?.close();
        setShowCustomerDetails(true);
        return;
      }
    }

    setIsProcessingSale(true);
    try {
      const accessBreakdown = paymentToUse === 'access' && accessSubMethodRef.current
        ? [{ method: accessSubMethodRef.current, amount: cartTotal }]
        : undefined;
      const order = await directBillPrint(paymentToUse as any, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
      }, paymentToUse === 'part' ? partPaymentDetails : accessBreakdown);

      if (order) {
        if (action === 'print') {
          const billContent = generateBillContent({
            ...order,
            paymentMethod: paymentToUse,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            customerAddress: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
          });
          const kotContent = generateKOT(order);

          console.log('[Print] Bill HTML:', billContent);

          const shouldPrintBill = printerSettings.printBill !== false;
          const shouldPrintKOT = (printerSettings.printKOT !== false) && canAccess('kot');

          const handleAfterBillPrint = () => {
            if (customer.phone || customer.email) {
              autoShareBillAfterPrint({
                customerName: customer.name,
                customerPhone: customer.phone,
                customerEmail: customer.email,
                billNumber: order.billNumber || order.id.slice(-6).toUpperCase(),
                total: Math.round(finalTotal),
                items: order.items,
                subtotal: order.subtotal,
                tax: order.tax,
                discount: order.discount,
              });
            }

            if (shouldPrintKOT) {
              setTimeout(() => {
                directPrint(kotContent, () => {
                  toast({ title: t('msg.saleComplete'), description: `${t('pos.billNumber')} #${order.billNumber || order.id.slice(-6).toUpperCase()} - ${t('msg.billKotPrinted')}` });
                });
              }, 500);
            } else {
              toast({ title: t('msg.saleComplete'), description: `${t('pos.billNumber')} #${order.billNumber || order.id.slice(-6).toUpperCase()}` });
            }
          };

          if (shouldPrintBill) {
            directPrint(billContent, handleAfterBillPrint, existingPrintWindow);
          } else {
            existingPrintWindow?.close();
            handleAfterBillPrint();
          }
        } else if (action === 'kot') {
          const kotContent = generateKOT(order);
          const shouldPrintKOT = (printerSettings.printKOT !== false) && canAccess('kot');
          if (shouldPrintKOT) {
            directPrint(kotContent, () => {
              toast({ title: t('msg.saleComplete'), description: `${t('common.orderNo')} #${order.kotNumber || order.id.slice(-6).toUpperCase()} - ${t('msg.kotSentKitchen')}` });
            });
          } else {
            toast({ title: t('msg.saleComplete'), description: `${t('common.orderNo')} #${order.kotNumber || order.id.slice(-6).toUpperCase()}` });
          }
        }
        
        // Reset states
        setSelectedPayment(null);
        setDiscount(0);
        setDiscountReason('');
        setDeliveryCharge(0);
        setContainerCharge(0);
        setTip(0);
        setCustomer({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' });
        setPartPaymentDetails([]);
        setIsPaid(false);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      toast({ title: 'Error', description: 'Failed to complete sale. Please try again.', variant: 'destructive' });
      existingPrintWindow?.close();
    } finally {
      setIsProcessingSale(false);
    }
  };

  // KOT + Print: Only prints KOT, does NOT count as sale
  const printKOTOnly = () => {
    if (cart.length === 0) {
      toast({ title: t('msg.emptyCart'), description: t('msg.addItemsFirst'), variant: 'destructive' });
      return;
    }

    const kotOrder = {
      id: `KOT-${Date.now()}`,
      kotNumber: `KOT-${Date.now().toString().slice(-6)}`,
      items: cart,
      tableNumber: selectedTable?.number,
      orderType: currentOrderType,
    };

    const kotContent = generateKOT(kotOrder);
    const shouldPrintKOT = (printerSettings.printKOT !== false) && canAccess('kot');

    if (shouldPrintKOT) {
      directPrint(kotContent, () => {
        toast({ title: t('msg.kotPrinted'), description: t('msg.kotNotCountedAsSale') });
      });
    } else {
      toast({ title: 'KOT Saved', description: 'KOT saved successfully (printing is disabled)' });
    }
  };

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    holdBill();
    toast({
      title: t('msg.billHeld'),
      description: t('msg.billSavedForLater'),
    });
    setSelectedPayment(null);
  };

  const handleApplyDiscount = (discountAmount: number, reason: string) => {
    setDiscount(discountAmount);
    setDiscountReason(reason);
    toast({ title: t('msg.discountApplied'), description: `${formatCurrency(discountAmount)} ${t('msg.discountAppliedAmount')}` });
  };

  const handleSplitConfirm = async (splits: any[]) => {
    const order = await directBillPrint('cash');
    if (order) {
      toast({ 
        title: t('msg.splitBillComplete'), 
        description: `${t('common.orderNo')} #${order.id.slice(-6)} ${t('msg.splitBetweenCustomers')} ${splits.length}` 
      });
      setSelectedPayment(null);
      setDiscount(0);
    }
  };

  // Automatically reset highlightedIndex to the first actual product in the list when filter results change
  useEffect(() => {
    if (filteredItems.length > 1) {
      setHighlightedIndex(1); // Default to index 1 (the first real product since index 0 is 'Others')
    } else if (filteredItems.length > 0) {
      setHighlightedIndex(0); // Default to 0 if only 'Others' is present
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredItems]);
  useEffect(() => {
    localStorage.setItem('pos_billing_customer', JSON.stringify(customer));
  }, [customer]);

  useEffect(() => {
    localStorage.setItem('pos_billing_delivery_charge', String(deliveryCharge));
  }, [deliveryCharge]);

  useEffect(() => {
    localStorage.setItem('pos_billing_container_charge', String(containerCharge));
  }, [containerCharge]);

  useEffect(() => {
    localStorage.setItem('pos_billing_tip', String(tip));
  }, [tip]);

  useEffect(() => {
    localStorage.setItem('pos_billing_search_query', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPayment) {
      localStorage.setItem('pos_billing_selected_payment', selectedPayment);
    } else {
      localStorage.removeItem('pos_billing_selected_payment');
    }
  }, [selectedPayment]);
  const getButtonActions = useCallback(() => ({
    split: () => setShowSplitDialog(true),
    print: () => {
      if (cart.length === 0) { toast({ title: t('msg.emptyCart'), description: t('msg.addItemsFirst'), variant: 'destructive' }); return; }
      if (!selectedPayment) { toast({ title: t('common.selectPayment'), description: t('msg.selectPaymentFirst'), variant: 'destructive' }); return; }
      preparedPrintWindowRef.current?.close();
      preparedPrintWindowRef.current = preparePrintWindow();
      if (!preparedPrintWindowRef.current) return;
      const printWindow = preparedPrintWindowRef.current;
      preparedPrintWindowRef.current = null;
      completeSale('print', selectedPayment || 'cash', printWindow);
    },
    kot: () => completeSale('kot'),
    kotPrint: () => printKOTOnly(),
    hold: () => handleHoldBill(),
    discount: () => setShowDiscountDialog(true),
  }), [cart, selectedPayment, completeSale, printKOTOnly, handleHoldBill, t]);

  // Reset cartHighlightIndex when cart items decrease below the index
  useEffect(() => {
    if (cartHighlightIndex >= cart.length) {
      setCartHighlightIndex(Math.max(0, cart.length - 1));
    }
  }, [cart, cartHighlightIndex]);

  // Full Keyboard Billing & Custom Section-based Navigation
  useEffect(() => {
    const focusNextDetailedSection = (currentSection: string, forward: boolean) => {
      const sections = [
        'app-sidebar',
        'app-header',
        'categories-sidebar',
        'order-type-tabs',
        'products-search',
        'products-grid',
        'cart-header',
        'table-select',
        'cart-items',
        'show-details',
        'complimentary-paid',
        'payments',
        'actions'
      ];
      let idx = sections.indexOf(currentSection);
      if (idx === -1) idx = 0;
      
      // Try up to sections.length times to find a focusable section
      for (let i = 1; i <= sections.length; i++) {
        const nextIdx = (idx + (forward ? i : -i) + sections.length) % sections.length;
        const nextSec = sections[nextIdx];
        
        // Check if the section is present/visible/valid
        if (nextSec === 'app-sidebar') {
          const container = document.querySelector('aside');
          const firstBtn = container?.querySelector('a, button');
          if (firstBtn && (firstBtn as HTMLElement).offsetParent !== null) {
            (firstBtn as HTMLElement).focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'app-header') {
          const header = document.querySelector('header');
          const firstBtn = header?.querySelector('button');
          if (firstBtn && firstBtn.offsetParent !== null) {
            firstBtn.focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'categories-sidebar') {
          const container = document.getElementById('categories-sidebar');
          const activeBtn = container?.querySelector('.bg-primary') as HTMLElement || container?.querySelector('button');
          if (activeBtn && activeBtn.offsetParent !== null) {
            activeBtn.focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'order-type-tabs') {
          const container = document.getElementById('order-type-tabs');
          const activeBtn = container?.querySelector('.bg-primary') as HTMLElement || container?.querySelector('button');
          if (activeBtn && activeBtn.offsetParent !== null) {
            activeBtn.focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'products-search') {
          const el = document.getElementById('search-product-input');
          if (el && el.offsetParent !== null) {
            el.focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'products-grid') {
          const items = Array.from(document.querySelectorAll('.menu-item')) as HTMLElement[];
          const target = items[highlightedIndex] || items[0];
          if (target && target.offsetParent !== null) {
            target.focus();
            setActiveSection('products');
            return;
          }
        } else if (nextSec === 'cart-header') {
          const container = document.getElementById('cart-header-actions');
          const firstBtn = container?.querySelector('button');
          if (firstBtn && firstBtn.offsetParent !== null) {
            firstBtn.focus();
            setActiveSection('cart');
            return;
          }
        } else if (nextSec === 'table-select') {
          const container = document.getElementById('table-select-container');
          const trigger = container?.querySelector('button');
          if (trigger && trigger.offsetParent !== null) {
            trigger.focus();
            setActiveSection('cart');
            return;
          }
        } else if (nextSec === 'cart-items') {
          const container = document.getElementById('right-billing-panel');
          const firstCartBtn = container?.querySelector('.cart-item button');
          if (firstCartBtn && (firstCartBtn as HTMLElement).offsetParent !== null) {
            (firstCartBtn as HTMLElement).focus();
            setActiveSection('cart');
            return;
          }
        } else if (nextSec === 'show-details') {
          const el = document.getElementById('show-details-btn');
          if (el && el.offsetParent !== null) {
            el.focus();
            setActiveSection('cart');
            return;
          }
        } else if (nextSec === 'complimentary-paid') {
          const container = document.getElementById('complimentary-paid-container');
          const firstInput = container?.querySelector('input');
          if (firstInput && firstInput.offsetParent !== null) {
            firstInput.focus();
            setActiveSection('cart');
            return;
          }
        } else if (nextSec === 'payments') {
          const container = document.getElementById('payments-section');
          const buttons = Array.from(container?.querySelectorAll('button') || []).filter(b => {
            const htmlEl = b as HTMLElement;
            return htmlEl.offsetParent !== null && !htmlEl.hasAttribute('disabled');
          });
          const targetBtn = buttons[paymentHighlightIndex] || buttons[0];
          if (targetBtn) {
            (targetBtn as HTMLElement).focus();
            setActiveSection('payments');
            return;
          }
        } else if (nextSec === 'actions') {
          const container = document.getElementById('actions-section');
          const buttons = Array.from(container?.querySelectorAll('button') || []).filter(b => {
            const htmlEl = b as HTMLElement;
            return htmlEl.offsetParent !== null && !htmlEl.hasAttribute('disabled');
          });
          const targetBtn = buttons[actionHighlightIndex] || buttons[0];
          if (targetBtn) {
            (targetBtn as HTMLElement).focus();
            setActiveSection('actions');
            return;
          }
        }
      }
    };

    const handleCartArrowNavigation = (direction: 'up' | 'down') => {
      const container = document.getElementById('right-billing-panel');
      if (!container) return;

      const focusables = Array.from(container.querySelectorAll('button, input, select, [tabindex="0"]'))
        .filter(el => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.offsetParent === null) return false;
          if (htmlEl.hasAttribute('disabled')) return false;
          if (htmlEl.closest('#payments-section') || htmlEl.closest('#actions-section')) return false;
          return true;
        }) as HTMLElement[];

      if (focusables.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      let currentIndex = focusables.indexOf(activeEl);

      // If focus is not inside the list, default to first or last depending on direction
      if (currentIndex === -1) {
        if (direction === 'down') {
          focusables[0].focus();
        } else {
          focusables[focusables.length - 1].focus();
        }
        return;
      }

      let nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
      // Circular wrap-around
      if (nextIndex >= focusables.length) {
        nextIndex = 0;
      } else if (nextIndex < 0) {
         nextIndex = focusables.length - 1;
      }

      focusables[nextIndex].focus();
    };

    const handlePaymentsArrowNavigation = (direction: 'next' | 'prev') => {
      const container = document.getElementById('payments-section');
      if (!container) return;

      const buttons = Array.from(container.querySelectorAll('button')).filter(b => !b.hasAttribute('disabled')) as HTMLElement[];
      if (buttons.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      let currentIndex = buttons.indexOf(activeEl);

      if (currentIndex === -1) {
        buttons[0].focus();
        return;
      }

      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= buttons.length) {
        nextIndex = 0;
      } else if (nextIndex < 0) {
        nextIndex = buttons.length - 1;
      }

      buttons[nextIndex].focus();
    };

    const handleActionsArrowNavigation = (direction: 'next' | 'prev') => {
      const container = document.getElementById('actions-section');
      if (!container) return;

      const buttons = Array.from(container.querySelectorAll('button')).filter(b => !b.hasAttribute('disabled')) as HTMLElement[];
      if (buttons.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      let currentIndex = buttons.indexOf(activeEl);

      if (currentIndex === -1) {
        buttons[0].focus();
        return;
      }

      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= buttons.length) {
        nextIndex = 0;
      } else if (nextIndex < 0) {
        nextIndex = buttons.length - 1;
      }

      buttons[nextIndex].focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      
      const isSearchInput = activeEl && (
        activeEl.id === 'search-product-input' ||
        activeEl.getAttribute('placeholder') === 'Search Product...'
      );

      // 1. Handle Tab / Shift+Tab globally (cycles detailed sections)
      if (e.key === 'Tab') {
        e.preventDefault();
        
        let currentSection = 'products-search';
        if (activeEl) {
          if (activeEl.closest('aside')) {
            currentSection = 'app-sidebar';
          } else if (activeEl.closest('header')) {
            currentSection = 'app-header';
          } else if (activeEl.closest('#categories-sidebar')) {
            currentSection = 'categories-sidebar';
          } else if (activeEl.closest('#order-type-tabs')) {
            currentSection = 'order-type-tabs';
          } else if (activeEl.id === 'search-product-input') {
            currentSection = 'products-search';
          } else if (activeEl.closest('.menu-item')) {
            currentSection = 'products-grid';
          } else if (activeEl.closest('#cart-header-actions')) {
            currentSection = 'cart-header';
          } else if (activeEl.closest('#table-select-container') || activeEl.id === 'table-select-container') {
            currentSection = 'table-select';
          } else if (activeEl.closest('.cart-item')) {
            currentSection = 'cart-items';
          } else if (activeEl.id === 'show-details-btn') {
            currentSection = 'show-details';
          } else if (activeEl.closest('#complimentary-paid-container') || activeEl.id === 'complimentary-paid-container') {
            currentSection = 'complimentary-paid';
          } else if (activeEl.closest('#payments-section')) {
            currentSection = 'payments';
          } else if (activeEl.closest('#actions-section')) {
            currentSection = 'actions';
          } else if (activeEl.closest('#right-billing-panel')) {
            currentSection = 'cart-items';
          }
        }
        
        focusNextDetailedSection(currentSection, true);
        return;
      }
      
      // If typing in other input elements (e.g. table number, customer details, discount), ignore other keyboard shortcuts
      if (isInput && !isSearchInput) {
        return;
      }

      // If F-key, prevent default browser actions
      if (e.key.startsWith('F')) {
        e.preventDefault();
      }

      // 2. Arrow Key Grid/List Navigation based on activeSection
      if (activeSection === 'products') {
        const isMenuOrSearch = activeEl && (
          activeEl.id === 'search-product-input' ||
          activeEl.closest('.menu-item') ||
          activeEl.getAttribute('placeholder') === 'Search Product...'
        );
        if (isMenuOrSearch) {
          const cols = uiConfig.layout.menuGridCols || 4;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(0, prev - 1));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(filteredItems.length - 1, prev + cols));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(0, prev - cols));
          }
        }
      } else if (activeSection === 'cart') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleCartArrowNavigation('down');
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handleCartArrowNavigation('up');
        }
      } else if (activeSection === 'payments') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handlePaymentsArrowNavigation('next');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handlePaymentsArrowNavigation('prev');
        }
      } else if (activeSection === 'actions') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleActionsArrowNavigation('next');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleActionsArrowNavigation('prev');
        }
      }

      // 3. Enter Selection based on activeSection
      if (e.key === 'Enter') {
        // If focusing a button, checkbox, select or link (except search input), let default click happen
        if (activeEl && activeEl !== document.body && activeEl.id !== 'search-product-input') {
          const tagName = activeEl.tagName;
          const typeAttr = activeEl.getAttribute('type');
          if (tagName === 'BUTTON' || tagName === 'SELECT' || tagName === 'A' || typeAttr === 'checkbox' || typeAttr === 'radio') {
            return;
          }
        }
        e.preventDefault();
        if (activeSection === 'products' || isSearchInput) {
          let selectedItem = null;
          // Check for exact SKU or barcode match first (case-insensitive, trimmed)
          const exactSkuMatch = menuItems.find(item => 
            (item.sku && item.sku.toLowerCase() === searchQuery.toLowerCase().trim()) ||
            (item.barcode && item.barcode.toLowerCase() === searchQuery.toLowerCase().trim())
          );
          if (exactSkuMatch) {
            selectedItem = exactSkuMatch;
          } else if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
            selectedItem = filteredItems[highlightedIndex];
          }
          if (selectedItem) {
            handleItemClick(selectedItem);
            setSearchQuery('');
            // Ensure focus stays in the search box
            const searchInput = document.querySelector('input[placeholder="Search Product..."]') as HTMLInputElement;
            if (searchInput) {
              setTimeout(() => searchInput.focus(), 10);
            }
          }
        } else if (activeSection === 'payments') {
          if (showMorePayments) {
            const sheetOptions: ('cash' | 'upi' | 'card' | 'due' | 'part' | 'wallet' | 'credit' | 'access')[] = ['cash', 'upi', 'card', 'due', 'part', 'wallet', 'credit', 'access'];
            const selectedOpt = sheetOptions[sheetPaymentHighlightIndex];
            if (selectedOpt === 'part') {
              setShowMorePayments(false);
              setShowPartPaymentDialog(true);
            } else {
              handlePaymentSelect(selectedOpt);
              setShowMorePayments(false);
            }
          } else {
            if (paymentHighlightIndex === 0) handlePaymentSelect('cash');
            else if (paymentHighlightIndex === 1) handlePaymentSelect('card');
            else if (paymentHighlightIndex === 2) handlePaymentSelect('upi');
            else if (paymentHighlightIndex === 3) {
              setShowMorePayments(true);
              setSheetPaymentHighlightIndex(0);
            }
          }
        } else if (activeSection === 'actions') {
          const btn = actionButtons[actionHighlightIndex];
          if (btn) {
            const buttonActions = getButtonActions();
            if (buttonActions[btn.id]) {
              buttonActions[btn.id]();
            }
          }
        }
        return;
      }

      // 4. Escape to clear/close
      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        setShowMorePayments(false);
        return;
      }

      // 5. Quantity / Item adjustments (+, -, Delete, Backspace)
      const targetCartItem = activeSection === 'cart' && cart.length > 0 
        ? cart[cartHighlightIndex] 
        : (cart.length > 0 ? cart[cart.length - 1] : null);

      if (targetCartItem) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          updateCartQuantity(targetCartItem.cartItemId || targetCartItem.id, targetCartItem.quantity + 1);
        } else if (e.key === '-') {
          e.preventDefault();
          if (targetCartItem.quantity > 1) {
            updateCartQuantity(targetCartItem.cartItemId || targetCartItem.id, targetCartItem.quantity - 1);
          } else {
            removeFromCart(targetCartItem.cartItemId || targetCartItem.id);
            if (activeSection === 'cart') {
              setCartHighlightIndex(prev => Math.max(0, prev - 1));
            }
          }
        } else if (e.key === 'Delete' || (e.key === 'Backspace' && !isInput)) {
          e.preventDefault();
          removeFromCart(targetCartItem.cartItemId || targetCartItem.id);
          if (activeSection === 'cart') {
            setCartHighlightIndex(prev => Math.max(0, prev - 1));
          }
        }
      }

      // 6. Keep F-keys shortcuts for power users (but remove Alt payment method shortcuts)
      if (e.key === 'F1') {
        if (cart.length > 0) completeSale('print', 'cash');
      } else if (e.key === 'F2') {
        if (cart.length > 0) completeSale('print', selectedPayment || 'cash');
      } else if (e.key === 'F3') {
        if (cart.length > 0) printKOTOnly();
      } else if (e.key === 'F6') {
        if (cart.length > 0) completeSale('kot', selectedPayment || 'cash');
      } else if (e.key === 'F9') {
        setCurrentOrderType('delivery');
      } else if (e.key === 'F11') {
        setCurrentOrderType('dine-in');
      } else if (e.key === 'F12') {
        setCurrentOrderType('takeaway');
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const activeEl = e.target as HTMLElement;
      if (!activeEl) return;

      if (activeEl.id === 'search-product-input' || activeEl.closest('.menu-item')) {
        setActiveSection('products');
        if (activeEl.closest('.menu-item')) {
          const menuItemsList = Array.from(document.querySelectorAll('.menu-item'));
          const index = menuItemsList.indexOf(activeEl.closest('.menu-item')!);
          if (index !== -1) {
            setHighlightedIndex(index);
          }
        }
      } else if (activeEl.closest('#payments-section')) {
        setActiveSection('payments');
        const paymentBtns = Array.from(document.querySelectorAll('#payments-section button'));
        const index = paymentBtns.indexOf(activeEl);
        if (index !== -1) {
          setPaymentHighlightIndex(index);
        }
      } else if (activeEl.closest('#actions-section')) {
        setActiveSection('actions');
        const actionBtns = Array.from(document.querySelectorAll('#actions-section button'));
        const index = actionBtns.indexOf(activeEl);
        if (index !== -1) {
          setActionHighlightIndex(index);
        }
      } else if (activeEl.closest('#right-billing-panel')) {
        setActiveSection('cart');
        const cartItemEl = activeEl.closest('.cart-item') as HTMLElement;
        if (cartItemEl && cartItemEl.dataset.cartIndex !== undefined) {
          setCartHighlightIndex(Number(cartItemEl.dataset.cartIndex));
        }
      } else if (activeEl.closest('#categories-sidebar') || activeEl.closest('#order-type-tabs') || activeEl.closest('header') || activeEl.closest('aside')) {
        setActiveSection('products');
      } else if (activeEl.id === 'show-details-btn' || activeEl.closest('#complimentary-paid-container') || activeEl.closest('#table-select-container') || activeEl.closest('#cart-header-actions')) {
        setActiveSection('cart');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focusin', handleFocusIn);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [
    filteredItems,
    highlightedIndex,
    cart,
    cartHighlightIndex,
    paymentHighlightIndex,
    actionHighlightIndex,
    sheetPaymentHighlightIndex,
    selectedPayment,
    currentOrderType,
    uiConfig.layout.menuGridCols,
    completeSale,
    updateCartQuantity,
    removeFromCart,
    setCurrentOrderType,
    setSelectedPayment,
    handleHoldBill,
    t,
    setShowPartPaymentDialog,
    activeSection,
    showMorePayments,
    menuItems,
    searchQuery,
    actionButtons,
    getButtonActions,
    printKOTOnly
  ]);

  // Show simplified mobile layout on phones - AFTER all hooks
  if (isMobile) {
    return <MobilePOSPage />;
  }

  return (
    <>
    {/* Edit Mode Toolbar */}
    <EditModeToolbar
      isEditMode={editMode.isEditMode}
      onSave={() => {
        editMode.exitEditMode();
        sonnerToast.success('Layout saved successfully!');
      }}
      onCancel={() => {
        const snapshot = editMode.getSnapshot();
        if (snapshot) {
          updateConfig(snapshot);
        }
        editMode.exitEditMode();
        sonnerToast.info('Changes cancelled');
      }}
      onReset={() => {
        resetToDefault();
        editMode.markChanged();
        sonnerToast.success('Reset to default layout');
      }}
      onToggleEditMode={() => {
        if (editMode.isEditMode) {
          editMode.exitEditMode();
        } else {
          editMode.enterEditMode(uiConfig);
        }
      }}
      hasChanges={editMode.hasChanges}
    />

    {/* Edit Mode Inline Layout Panel */}
    {editMode.isEditMode && (
      <div className="fixed top-12 left-0 right-0 z-[99] bg-card border-b border-border shadow-md">
        <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-xs font-semibold text-muted-foreground">Menu:</span>
            <select
              value={uiConfig.layout.menuPosition}
              onChange={(e) => { updateLayout({ menuPosition: e.target.value as 'left' | 'right' }); editMode.markChanged(); }}
              className="h-7 text-xs rounded border border-border bg-background px-2"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-xs font-semibold text-muted-foreground">Order Panel:</span>
            <select
              value={uiConfig.layout.orderPanelPosition}
              onChange={(e) => { updateLayout({ orderPanelPosition: e.target.value as 'left' | 'right' }); editMode.markChanged(); }}
              className="h-7 text-xs rounded border border-border bg-background px-2"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-xs font-semibold text-muted-foreground">Grid:</span>
            <select
              value={String(uiConfig.layout.menuGridCols)}
              onChange={(e) => { updateLayout({ menuGridCols: Number(e.target.value) }); editMode.markChanged(); }}
              className="h-7 text-xs rounded border border-border bg-background px-2"
            >
              <option value="3">3 cols</option>
              <option value="4">4 cols</option>
              <option value="5">5 cols</option>
              <option value="6">6 cols</option>
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-xs font-semibold text-muted-foreground">Categories:</span>
            <select
              value={uiConfig.layout.categoryPosition}
              onChange={(e) => { updateLayout({ categoryPosition: e.target.value as 'left' | 'top' }); editMode.markChanged(); }}
              className="h-7 text-xs rounded border border-border bg-background px-2"
            >
              <option value="left">Left Sidebar</option>
              <option value="top">Top Bar</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 min-w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={uiConfig.layout.showImages}
              onChange={(e) => { updateLayout({ showImages: e.target.checked }); editMode.markChanged(); }}
              className="w-3.5 h-3.5 rounded accent-primary"
            />
            <span className="text-xs font-semibold text-muted-foreground">Images</span>
          </label>
        </div>
      </div>
    )}

    <div className={cn("h-[calc(100vh-56px)] flex overflow-hidden", editMode.isEditMode && "mt-[88px] h-[calc(100vh-56px-88px)]")}>
      {/* Left Panel - Categories (Vertical) */}
      <div id="categories-sidebar" className="w-24 bg-card border-r border-border flex flex-col overflow-hidden">
        <div className="p-2 flex-1 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'w-full p-3 rounded-xl text-center text-xs font-medium mb-2 transition-all',
              activeCategory === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary hover:bg-muted'
            )}
          >
            {t('common.all')}
          </button>
          {activeCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'w-full p-3 rounded-xl text-center mb-2 transition-all',
                activeCategory === cat.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-muted'
              )}
            >
              <span className="text-lg block mb-1">{cat.icon}</span>
              <span className="text-xs font-medium block truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center Panel - Menu Items */}
      <div className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-200", activeSection === 'products' && "ring-2 ring-primary ring-inset bg-primary/[0.005]")}>
        {/* Order Type & Search */}
        <div className="p-3 bg-card border-b border-border space-y-3">
          {/* Order Type Tabs */}
          <div id="order-type-tabs" className="flex gap-2">
            {orderTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setCurrentOrderType(type.id)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                  currentOrderType === type.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                )}
              >
                {type.label}
              </button>
            ))}
            
            {selectedTable && (
              <div className="ml-auto px-3 py-2 bg-success/10 text-success rounded-lg text-sm font-medium">
                {t('common.table')} {selectedTable.number}
              </div>
            )}
          </div>

          {/* Search with Barcode Scanner */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search-product-input"
                placeholder="Search Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setActiveSection('products')}
                className="pl-10 h-10"
              />
            </div>
            {/* Barcode Scanner Button - hidden for basic plan */}
            {canAccess('barcodeScanner') && (
              <BarcodeButton size="default" className="h-10 px-3" showLabel />
            )}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-auto p-3">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${uiConfig.layout.menuGridCols}, minmax(0, 1fr))`,
            }}
          >
            {filteredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setHighlightedIndex(idx);
                  handleItemClick(item);
                }}
                className={cn(
                  'menu-item text-left relative rounded-2xl bg-card overflow-hidden ring-1 ring-border transition-all duration-150 p-0',
                  idx === highlightedIndex
                    ? 'ring-4 ring-primary border-primary bg-primary/5 scale-[1.02] shadow-md z-10'
                    : item.id.startsWith('others-')
                      ? 'ring-2 ring-dashed ring-primary/30 hover:ring-primary p-3'
                      : 'text-foreground shadow-sm hover:ring-primary hover:shadow-md'
                )}
              >
                {item.id.startsWith('others-') ? (
                  <div className="flex h-full min-h-[60px] flex-col items-center justify-center gap-1 text-center">
                    <PackagePlus className="w-6 h-6 text-primary" />
                    <h4 className="font-medium text-xs">Others</h4>
                    <p className="text-[10px] text-muted-foreground">Custom item</p>
                  </div>
                ) : (
                  <>
                    {/* Variation indicator */}
                    {item.variations && item.variations.length > 0 && (
                      <div className="absolute top-1.5 right-1.5 z-10 rounded-full bg-primary p-1 text-primary-foreground">
                        <Layers className="w-2.5 h-2.5" />
                      </div>
                    )}
                    {/* Image area - square, full width */}
                    <div className="w-full aspect-square bg-muted/80 flex items-center justify-center relative">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
                      )}
                      {/* Add button */}
                      <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    {/* Name & price */}
                    <div className="p-2.5">
                      <h4 className="font-semibold text-xs leading-snug break-words whitespace-normal text-foreground">{item.name}</h4>
                      {item.variations && item.variations.length > 0 ? (
                        <p className="text-sm font-bold text-primary mt-1">
                          {formatCurrency(Math.min(item.price || Infinity, ...item.variations.map(v => v.price)))}+
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-primary mt-1">{formatCurrency(item.price)}</p>
                      )}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('common.noItemsFound')}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart & Billing */}
      <div id="right-billing-panel" className="w-[600px] flex-shrink-0 overflow-hidden border-l border-border bg-card flex flex-col">
        {/* Cart Header with Table Select */}
        <div className="p-2 border-b border-border space-y-2">
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-semibold text-sm whitespace-nowrap">{t('common.currentOrder')}</h2>
            <TooltipProvider delayDuration={300}>
               <div id="cart-header-actions" className="flex items-center gap-1 flex-nowrap">
                {isButtonVisible('customer') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 flex-shrink-0"
                      onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                    >
                      <User className="w-[22px] h-[22px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>{customer.name || t('common.contact') || 'Contact'}</p></TooltipContent>
                </Tooltip>
                )}
                {isButtonVisible('heldBills') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 flex-shrink-0 relative"
                      onClick={() => setShowHeldBills(!showHeldBills)}
                    >
                      <Play className="w-[22px] h-[22px]" />
                      {heldBills.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                          {heldBills.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>{t('common.recall')}</p></TooltipContent>
                </Tooltip>
                )}
                {isButtonVisible('qrMenu') && canAccess('qrMenuOrdering') && <QRMenuGenerator className="h-12 w-12" iconClassName="w-[22px] h-[22px]" />}
                {isButtonVisible('qrOrders') && canAccess('qrMenuOrdering') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 flex-shrink-0"
                        onClick={() => setShowQROrders(true)}
                      >
                        <QrCode className="w-[22px] h-[22px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Orders</p></TooltipContent>
                  </Tooltip>
                )}
                {/* UI Customization - Edit Mode Toggle + Settings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={editMode.isEditMode ? "default" : "ghost"}
                      size="icon"
                      className={cn("h-12 w-12 flex-shrink-0", editMode.isEditMode && "animate-pulse")}
                      onClick={() => {
                        if (editMode.isEditMode) {
                          editMode.exitEditMode();
                        } else {
                          editMode.enterEditMode(uiConfig);
                        }
                      }}
                    >
                      <Pencil className="w-[22px] h-[22px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>{editMode.isEditMode ? 'Exit Edit Mode' : 'Edit UI Layout'}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 flex-shrink-0"
                      onClick={() => navigate('/ui-customization')}
                    >
                      <Settings className="w-[22px] h-[22px] text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>All Settings</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Table Selection */}
          {canAccess('tableManagement') && currentOrderType === 'dine-in' && (
            <div id="table-select-container" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedTableId || ''} onValueChange={handleTableChange}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder={t('tables.selectTable')} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {tables.map(table => (
                    <SelectItem 
                      key={table.id} 
                      value={table.id}
                      disabled={table.status === 'occupied' && table.id !== selectedTableId}
                    >
                      {t('common.table')} {table.number} ({table.capacity} {t('common.seats')}) - {table.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Customer Details */}
        <CustomerDetails 
          customer={customer} 
          onChange={setCustomer}
          orderType={currentOrderType}
          isOpen={showCustomerDetails}
          onToggle={() => setShowCustomerDetails(false)}
        />

        {/* Held Bills Dropdown */}
        {showHeldBills && heldBills.length > 0 && (
          <div className="p-3 bg-secondary/50 border-b border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('common.heldBills').toUpperCase()}</p>
            {heldBills.map(bill => (
              <button
                key={bill.id}
                onClick={() => {
                  recallBill(bill.id);
                  setShowHeldBills(false);
                }}
                className="w-full text-left p-2 bg-card rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="flex justify-between text-sm">
                  <span>{bill.tableNumber ? `${t('common.table')} ${bill.tableNumber}` : t('pos.takeaway')}</span>
                  <span className="font-medium">{bill.items.length} {t('common.items')}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cart Items */}
        <div className={cn("flex-1 min-h-[100px] overflow-y-auto p-3 space-y-2 transition-all duration-200", activeSection === 'cart' && "ring-2 ring-primary ring-inset bg-primary/[0.005]")}>
          {cart.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-center text-muted-foreground text-sm">
              {t('pos.emptyCart')}
            </div>
          ) : (
            cart.map((item, index) => {
              const isHighlighted = activeSection === 'cart' && cartHighlightIndex === index;
              return (
                <div
                  key={item.cartItemId || item.id}
                  data-cart-index={index}
                  className={cn(
                    "cart-item flex items-center gap-2 rounded-lg border bg-card p-2 text-foreground transition-all duration-200",
                    isHighlighted ? "border-primary ring-2 ring-primary/40 bg-primary/5 scale-[1.01]" : "border-border"
                  )}
                >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs leading-tight break-words text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-medium text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.cartItemId || item.id)}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-destructive hover:bg-muted"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border bg-card">
        {/* Billing Summary Swipe Up */}
        <div>
          {/* Toggle Button */}
          <button
            id="show-details-btn"
            onClick={() => setShowBillingSummary(!showBillingSummary)}
            className="w-full p-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            {showBillingSummary ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {showBillingSummary ? t('common.hideDetails') : t('common.showDetails')}
          </button>

          {/* Expandable Summary */}
          {showBillingSummary && (
            <div className="space-y-1.5 border-t border-border bg-secondary/30 p-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('common.subtotal')}</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <button 
                  onClick={() => setShowDiscountDialog(true)}
                  className="text-muted-foreground flex items-center gap-1 hover:text-foreground"
                >
                  <Percent className="w-3 h-3" />
                  {t('common.discount')}
                  <span className="text-xs bg-primary/10 text-primary px-1 rounded">{t('common.more')}</span>
                </button>
                <span className="text-destructive">-{formatCurrency(discount)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('pos.deliveryCharge')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDeliveryCharge(Math.max(0, deliveryCharge - 10))} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center">{formatCurrency(deliveryCharge)}</span>
                  <button onClick={() => setDeliveryCharge(deliveryCharge + 10)} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('pos.containerCharge')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setContainerCharge(Math.max(0, containerCharge - 5))} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center">{formatCurrency(containerCharge)}</span>
                  <button onClick={() => setContainerCharge(containerCharge + 5)} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <button 
                  onClick={() => setShowTaxDialog(true)}
                  className="text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Receipt className="w-3 h-3" />
                  Tax ({taxPercent}%)
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20">Edit</span>
                </button>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      const newTax = Math.max(0, calculatedTax - 10);
                      setCustomTax(newTax);
                    }} 
                    className="w-5 h-5 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-14 text-center">{formatCurrency(calculatedTax)}</span>
                  <button 
                    onClick={() => {
                      const newTax = calculatedTax + 10;
                      setCustomTax(newTax);
                    }} 
                    className="w-5 h-5 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('common.roundOff')}</span>
                <span>{roundOff >= 0 ? '+' : ''}{formatCurrency(roundOff)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('pos.tip')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTip(Math.max(0, tip - 10))} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center">{formatCurrency(tip)}</span>
                  <button onClick={() => setTip(tip + 10)} className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Complimentary & Total */}
          <div className="space-y-2 border-t border-border p-2">
            <div className="flex items-center justify-between gap-4">
              <div id="complimentary-paid-container" className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isComplimentary}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowComplimentaryDialog(true);
                      } else {
                        setIsComplimentary(false);
                        setComplimentaryNote('');
                      }
                    }}
                    className="w-4 h-4 rounded border-border accent-primary" 
                  />
                  <span className="text-xs font-medium text-foreground">{t('common.complimentary')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer border-l border-border pl-4">
                  <input 
                    type="checkbox" 
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary" 
                  />
                  <span className="text-xs font-medium text-foreground">Paid</span>
                </label>
              </div>

              {isComplimentary && complimentaryNote && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded truncate max-w-[150px]">
                  {complimentaryNote}
                </span>
              )}
            </div>
            
            {/* Total */}
            <div className="flex justify-between text-sm font-bold">
              <span>{t('common.total')}</span>
              <span className={cn("text-primary", isComplimentary && "line-through text-muted-foreground")}>
                {formatCurrency(Math.round(isComplimentary ? cartTotal : finalTotal))}
              </span>
            </div>
            {isComplimentary && (
              <div className="flex justify-between text-sm font-bold text-success">
                <span>{t('common.complimentaryTotal')}</span>
                <span>₹0</span>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div id="payments-section" className={cn("border-t border-border p-2 transition-all duration-200", activeSection === 'payments' && "ring-2 ring-primary ring-inset bg-primary/[0.005]")}>
            <p className="text-xs text-muted-foreground mb-2">{t('common.selectPayment').toUpperCase()}</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handlePaymentSelect('cash')}
                disabled={cart.length === 0}
                className={cn(
                  'h-11 rounded-xl flex items-center justify-center gap-2 border shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-xs md:text-sm font-semibold border-border',
                  selectedPayment === 'cash' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'hover:border-primary/50',
                  activeSection === 'payments' && paymentHighlightIndex === 0 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                  cart.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                  <Banknote className="w-4 h-4" />
                  <span>{t('pos.cash')}</span>
              </button>
              <button
                onClick={() => handlePaymentSelect('card')}
                disabled={cart.length === 0}
                className={cn(
                  'h-11 rounded-xl flex items-center justify-center gap-2 border shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-xs md:text-sm font-semibold border-border',
                  selectedPayment === 'card' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'hover:border-primary/50',
                  activeSection === 'payments' && paymentHighlightIndex === 1 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                  cart.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('pos.card')}</span>
              </button>
              <button
                onClick={() => handlePaymentSelect('upi')}
                disabled={cart.length === 0}
                className={cn(
                  'h-11 rounded-xl flex items-center justify-center gap-2 border shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-xs md:text-sm font-semibold border-border',
                  selectedPayment === 'upi' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'hover:border-primary/50',
                  activeSection === 'payments' && paymentHighlightIndex === 2 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                  cart.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('pos.upi')}</span>
              </button>
              <button
                onClick={() => setShowMorePayments(true)}
                className={cn(
                  'h-11 rounded-xl flex items-center justify-center gap-2 border shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-xs md:text-sm font-semibold border-border',
                  ['due', 'part', 'wallet', 'credit', 'access'].includes(selectedPayment || '')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:border-primary/50',
                  activeSection === 'payments' && paymentHighlightIndex === 3 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]'
                )}
              >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>{t('common.more')}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons - Drag & Drop in Edit Mode */}
          <div id="actions-section" className={cn("border-t border-border p-2.5", editMode.isEditMode && "ring-2 ring-primary/30 ring-inset bg-primary/5 relative")}>
            {editMode.isEditMode && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">⚡ Action Buttons — Drag to reorder</div>
            )}
            <DraggableButtonGrid
              buttons={actionButtons}
              isEditMode={editMode.isEditMode}
              onReorder={(from, to) => {
                const fromBtn = actionButtons[from];
                const toBtn = actionButtons[to];
                const allCartButtons = getGroupButtons('cart_actions');
                const fromIndex = allCartButtons.findIndex(b => b.id === fromBtn.id);
                const toIndex = allCartButtons.findIndex(b => b.id === toBtn.id);
                if (fromIndex !== -1 && toIndex !== -1) {
                  reorderButtons('cart_actions', fromIndex, toIndex);
                  editMode.markChanged();
                }
              }}
              onToggleVisibility={(id) => {
                toggleButton(id);
                editMode.markChanged();
              }}
              renderButton={(btn, idx) => {
                const buttonActions: Record<string, () => void> = {
                  split: () => setShowSplitDialog(true),
                  print: () => {
                    if (cart.length === 0) { toast({ title: t('msg.emptyCart'), description: t('msg.addItemsFirst'), variant: 'destructive' }); return; }
                    if (!selectedPayment) { toast({ title: t('common.selectPayment'), description: t('msg.selectPaymentFirst'), variant: 'destructive' }); return; }
                    preparedPrintWindowRef.current?.close();
                    preparedPrintWindowRef.current = preparePrintWindow();
                    if (!preparedPrintWindowRef.current) return;
                    const printWindow = preparedPrintWindowRef.current;
                    preparedPrintWindowRef.current = null;
                    completeSale('print', selectedPayment || 'cash', printWindow);
                  },
                  kot: () => completeSale('kot'),
                  kotPrint: () => printKOTOnly(),
                  hold: () => handleHoldBill(),
                  discount: () => setShowDiscountDialog(true),
                };
                const iconMap: Record<string, React.ReactNode> = {
                  split: <Scissors className="w-4 h-4" />,
                  print: <Printer className="w-4 h-4" />,
                  kot: <FileText className="w-4 h-4" />,
                  kotPrint: <Receipt className="w-4 h-4" />,
                  hold: <Pause className="w-4 h-4" />,
                  discount: <Percent className="w-4 h-4" />,
                };
                const isActionBtn = ['print', 'kot', 'kotPrint'].includes(btn.id);
                const isHighlighted = activeSection === 'actions' && actionHighlightIndex === idx;
                return (
                  <Button
                    variant={isActionBtn && selectedPayment ? "default" : "outline"}
                    size="default"
                    onClick={buttonActions[btn.id] || (() => {})}
                    disabled={cart.length === 0 || isProcessingSale}
                    className={cn(
                      "h-11 w-full gap-2 px-3 text-xs md:text-sm font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] rounded-xl border border-border",
                      isHighlighted && "ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]"
                    )}
                  >
                    {iconMap[btn.id]}
                    {btn.label}
                  </Button>
                );
              }}
            />
          </div>
          </div>
        </div>
        </div>
      </div>

      {/* Split Bill Dialog */}
      <SplitBillDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        totalAmount={Math.round(finalTotal)}
        onConfirm={handleSplitConfirm}
      />

      {/* Discount Dialog */}
      <DiscountDialog
        open={showDiscountDialog}
        onOpenChange={setShowDiscountDialog}
        subtotal={cartSubtotal}
        currentDiscount={discount}
        onApplyDiscount={handleApplyDiscount}
      />

      <CustomItemDialog
        open={showCustomItemDialog}
        onOpenChange={setShowCustomItemDialog}
        onAdd={handleAddCustomItem}
        categoryId={activeCategory}
      />

      {/* Variation Selector Sheet */}
      <VariationSelectorSheet
        item={selectedItemForVariation}
        isOpen={variationSheetOpen}
        onClose={() => {
          setVariationSheetOpen(false);
          setSelectedItemForVariation(null);
        }}
        onSelect={handleVariationSelect}
      />

      {/* More Payment Methods Sheet */}
      <Sheet open={showMorePayments} onOpenChange={setShowMorePayments}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>{t('common.paymentOptions')}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-3 pb-4">
            {/* Cash */}
            <button
              onClick={() => {
                handlePaymentSelect('cash');
                setShowMorePayments(false);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'cash' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 0 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-sm font-medium">{t('pos.cash')}</span>
            </button>
            
            {/* UPI */}
            <button
              onClick={() => {
                handlePaymentSelect('upi');
                setShowMorePayments(false);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'upi' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 1 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-medium">{t('pos.upi')}</span>
            </button>
            
            {/* Card */}
            <button
              onClick={() => {
                handlePaymentSelect('card');
                setShowMorePayments(false);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'card' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 2 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-sm font-medium">{t('pos.card')}</span>
            </button>
            
            {/* Due removed as it is duplicate of Credit */}

            {/* Part Payment */}
            <button
              onClick={() => {
                setShowMorePayments(false);
                setShowPartPaymentDialog(true);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'part' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 4 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <SplitSquareHorizontal className="w-5 h-5" />
              <span className="text-sm font-medium">{t('common.partPayment')}</span>
            </button>

            {/* Wallet */}
            <button
              onClick={() => {
                handlePaymentSelect('wallet');
                setShowMorePayments(false);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'wallet' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 5 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Wallet className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">{t('common.wallet')}</span>
            </button>
            
            {/* Credit */}
            <button
              onClick={() => {
                handlePaymentSelect('credit');
                setShowMorePayments(false);
              }}
              disabled={cart.length === 0}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'credit' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 6 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]',
                cart.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Receipt className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium">{t('common.credit')}</span>
            </button>

            {/* Access Payment - counts in sales like cash */}
            <button
              onClick={() => {
                setShowMorePayments(false);
                setShowAccessPaymentDialog(true);
              }}
              className={cn(
                'h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
                selectedPayment === 'access'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50',
                activeSection === 'payments' && showMorePayments && sheetPaymentHighlightIndex === 7 && 'ring-2 ring-primary ring-offset-1 border-primary scale-[1.02]'
              )}
            >
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Access Pay</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Part Payment Dialog */}
      <PartPaymentDialog
        open={showPartPaymentDialog}
        onOpenChange={setShowPartPaymentDialog}
        totalAmount={Math.round(finalTotal)}
        onConfirm={(payments) => {
          setPartPaymentDetails(payments);
          handlePaymentSelect('part');
          toast({
            title: t('common.partPayment'),
            description: payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(', '),
          });
        }}
      />

      {/* Access Payment Dialog */}
      <AccessPaymentDialog
        open={showAccessPaymentDialog}
        onOpenChange={setShowAccessPaymentDialog}
        defaultAmount={cart.length > 0 ? finalTotal : 0}
        onConfirm={handleAccessPaymentConfirm}
      />

      {/* It's Paid Confirmation Dialog */}


      {/* Complimentary Dialog */}
      {showComplimentaryDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-[90%] max-w-md shadow-2xl animate-scale-in">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{t('common.complimentary')}</h3>
              <p className="text-sm text-muted-foreground">{t('common.enterReasonComplimentary')}</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">{t('common.reason')} *</label>
                <input
                  type="text"
                  value={complimentaryNote}
                  onChange={(e) => setComplimentaryNote(e.target.value)}
                  placeholder="e.g., VIP Guest, Birthday, Manager Approval"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-base"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowComplimentaryDialog(false);
                  setComplimentaryNote('');
                }}
                className="py-3 rounded-xl bg-secondary text-foreground font-bold text-base hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (complimentaryNote.trim()) {
                    setIsComplimentary(true);
                    setShowComplimentaryDialog(false);
                    toast({ title: t('msg.complimentaryEnabled'), description: `${t('common.reason')}: ${complimentaryNote}` });
                  } else {
                    toast({ title: t('common.required'), description: t('common.enterReason'), variant: 'destructive' });
                  }
                }}
                className="py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Settings Dialog */}
      {showTaxDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-[90%] max-w-md shadow-2xl animate-scale-in">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{t('settings.taxes')}</h3>
              <p className="text-sm text-muted-foreground">{t('msg.adjustTax') || 'Adjust tax percentage or set custom amount'}</p>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Tax Percentage Presets */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t('common.tax')} %</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 5, 12, 18, 28].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        setTaxPercent(percent);
                        setCustomTax(null);
                      }}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all border-2",
                        taxPercent === percent && customTax === null
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Tax Amount */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t('msg.customTaxAmount') || 'Or Enter Custom Tax Amount'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={customTax !== null ? customTax : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCustomTax(null);
                      } else {
                        setCustomTax(Number(val) || 0);
                      }
                    }}
                    placeholder={`Auto: ${formatCurrency(cartSubtotal * taxPercent / 100)}`}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-lg"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('msg.leaveEmptyForAuto') || `Leave empty to use ${taxPercent}% of subtotal`} ({formatCurrency(cartSubtotal * taxPercent / 100)})
                </p>
              </div>
              
              {/* No Tax Option */}
              <button
                onClick={() => {
                  setTaxPercent(0);
                  setCustomTax(0);
                }}
                className="w-full py-2 rounded-lg border-2 border-border text-sm font-medium hover:border-destructive hover:text-destructive transition-colors"
              >
                {t('msg.removeAllTax') || 'Remove All Tax'} ({formatCurrency(0)})
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowTaxDialog(false)}
                className="py-3 rounded-xl bg-secondary text-foreground font-bold text-base hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowTaxDialog(false);
                  toast({ title: t('msg.taxUpdated'), description: `${t('msg.taxSetTo')} ${formatCurrency(calculatedTax)}` });
                }}
                className="py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Link Barcode Dialog */}
    <LinkBarcodeDialog scannedCode={unmatchedCode} onClose={clearUnmatchedCode} />
    
    {/* QR Orders Sheet */}
    <Sheet open={showQROrders} onOpenChange={setShowQROrders}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle>QR Menu Orders</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <QROrdersPanel />
        </div>
      </SheetContent>
    </Sheet>
    {/* Sales Reset Warning Dialog */}
    <SalesResetWarningDialog
      isOpen={showSalesResetWarning}
      timeUntilReset={timeUntilReset}
      resetTimeLabel={formattedResetTime}
      onResetNow={handleResetNow}
      onExtend={handleExtendTime}
      onDismiss={dismissSalesResetWarning}
    />

    {/* Prompt Price & Weight Dialog */}
    <PromptPriceWeightDialog
      open={!!promptItem}
      onOpenChange={(open) => !open && setPromptItem(null)}
      item={promptItem}
      onAdd={(item, price, weight) => addToCart(item, price, weight)}
    />
    </>
  );
};

export default POSBillingPage;
