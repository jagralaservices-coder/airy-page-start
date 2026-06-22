import { useState, forwardRef } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CartItem } from '@/lib/store';
import { cn } from '@/lib/utils';
import { smartPrint, getPrintSettings } from '@/lib/printUtils';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { autoShareBillAfterPrint } from '@/lib/billShareUtils';
import { autoSendPaymentReceipt } from './PaymentReceiptGenerator';
import { 
  Minus, 
  Plus, 
  Trash2, 
  Pause, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Split,
  Printer,
  ShoppingBag,
  Users,
  Check,
  UtensilsCrossed,
  Truck,
  Clock,
  ChevronUp,
  ChevronDown,
  Send,
  Wallet,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { CustomerDetails } from './CustomerDetails';
import { OrderItemNotes } from './OrderItemNotes';
import { BillingSummary } from './BillingSummary';
import { PartPaymentDialog } from './PartPaymentDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePaymentSound } from '@/hooks/usePaymentSound';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useSubscription } from '@/hooks/useSubscription';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';

interface CompletedOrder {
  id: string;
  billNumber?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  tableNumber?: number;
  orderType: string;
  createdAt: Date;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export const Cart = forwardRef<HTMLDivElement>((_, ref) => {
  const {
    cart,
    updateCartQuantity,
    updateCartItem,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTax,
    cartTotal,
    discount,
    setDiscount,
    currentOrderType,
    setCurrentOrderType,
    selectedTable,
    holdBill,
    heldBills,
    recallBill,
    createKOTOrder,
    directBillPrint
  } = usePOS();
  
  const { t, formatCurrency } = useLocale();

  const [showPayment, setShowPayment] = useState(false);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' });
  const [cartItemNotes, setCartItemNotes] = useState<Record<string, string>>({});
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitPersons, setSplitPersons] = useState(2);
  const [showPartPaymentDialog, setShowPartPaymentDialog] = useState(false);
  const [partPaymentBreakdown, setPartPaymentBreakdown] = useState<{ method: string; amount: number }[]>([]);
  const [showMorePaymentSheet, setShowMorePaymentSheet] = useState(false);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [complimentaryNote, setComplimentaryNote] = useState('');
  const [showComplimentaryDialog, setShowComplimentaryDialog] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showPaidConfirmDialog, setShowPaidConfirmDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'due' | 'wallet' | 'credit' | null>('cash');

  const { playSuccessSound } = usePaymentSound();
  const { toggles: featureToggles } = useFeatureToggles();
  const { canAccess } = useSubscription();

  const { getSetting } = useStoreSettings();
  const isEditingEnabled = getSetting('billingSystemSettings')?.enableCartItemEditing ?? false;
  const { settings: paymentSettings } = usePaymentSettings();

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [tempQty, setTempQty] = useState('');

  const handleSavePrice = (itemId: string) => {
    const newPrice = Number(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateCartItem(itemId, { price: newPrice });
    }
    setEditingPriceId(null);
  };

  const handleSaveQty = (itemId: string) => {
    const newQty = Number(tempQty);
    if (!isNaN(newQty) && newQty > 0) {
      updateCartItem(itemId, { quantity: newQty });
    } else if (newQty === 0) {
      removeFromCart(itemId);
    }
    setEditingQtyId(null);
  };

  const allOrderTypes = [
    { id: 'dine-in' as const, labelKey: 'pos.dineIn', icon: UtensilsCrossed },
    { id: 'takeaway' as const, labelKey: 'pos.takeaway', icon: ShoppingBag },
    { id: 'delivery' as const, labelKey: 'pos.delivery', icon: Truck },
  ];

  const orderTypes = allOrderTypes.filter(t => {
    // Check subscription-level access first
    if (t.id === 'dine-in' && !canAccess('dineIn')) return false;
    if (t.id === 'takeaway' && !canAccess('takeaway')) return false;
    if (t.id === 'delivery' && !canAccess('delivery')) return false;
    // Then check store-level feature toggles
    if (t.id === 'dine-in' && !featureToggles.dineInEnabled) return false;
    if (t.id === 'takeaway' && !featureToggles.takeawayEnabled) return false;
    if (t.id === 'delivery' && !featureToggles.deliveryEnabled) return false;
    return true;
  });

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setCartItemNotes(prev => ({ ...prev, [itemId]: notes }));
  };

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


  const getStoreName = (): string => {
    try {
      const storeData = localStorage.getItem('pos_active_store_data');
      if (storeData) return JSON.parse(storeData)?.storeName || 'Store';
    } catch {}
    return 'Store';
  };


  const handlePayment = (method: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part') => {
    if (method === 'split') {
      setShowSplitDialog(true);
      setShowPayment(false);
      setShowMorePaymentSheet(false);
      return;
    }
    if (method === 'part') {
      setShowPartPaymentDialog(true);
      setShowPayment(false);
      setShowMorePaymentSheet(false);
      return;
    }
    // UPI → process directly like other payment methods
    if (method === 'upi') {
      setShowMorePaymentSheet(false);
      processPayment(method);
      return;
    }
    setShowMorePaymentSheet(false);
    processPayment(method);
  };

  const processPayment = async (method: 'cash' | 'card' | 'upi' | 'split' | 'due' | 'part' | 'wallet' | 'credit', paymentBreakdown?: { method: string; amount: number }[]) => {
    // Direct bill print - adds to sales, doesn't show in orders
    const order = await directBillPrint(method, {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
    }, paymentBreakdown);
    if (order) {
      const completedOrderData = {
        id: order.id,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentMethod: method,
        paymentBreakdown: order.paymentBreakdown,
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        createdAt: new Date(),
        customerName: customer.name,
        customerPhone: customer.phone,
        billNumber: order.billNumber
      };
      
      setShowPayment(false);
      setCustomer({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '' });
      setCartItemNotes({});
      setShowSplitDialog(false);
      setSplitPersons(2);
      setPartPaymentBreakdown([]);
      
      // Check if auto-print is enabled
      const printSettings = getPrintSettings();
      if (printSettings.autoPrintOnComplete) {
        // Auto-print immediately without showing dialog
        const billSettings = JSON.parse(localStorage.getItem('pos_bill_settings') || '{}');
        const printContent = generateBillContent(completedOrderData, billSettings);
        smartPrint(printContent, () => {
          toast.success('Bill printed automatically!');
        });
        setCompletedOrder(null);
      } else {
        // Show print dialog as usual
        setCompletedOrder(completedOrderData);
        setShowPrintDialog(true);
      }
    }
  };

  const handleSplitPaymentConfirm = () => {
    processPayment('split', undefined);
  };

  const handlePartPaymentConfirm = (payments: { method: string; amount: number }[]) => {
    // Store the breakdown and process as part payment
    setPartPaymentBreakdown(payments);
    processPayment('part', payments);
  };

  const handleSaveBill = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    holdBill();
    toast.success('Bill saved successfully');
  };

  const handlePrintBill = () => {
    if (completedOrder) {
      const billSettings = JSON.parse(localStorage.getItem('pos_bill_settings') || '{}');
      const printContent = generateBillContent(completedOrder, billSettings);
      
      // Use smart print (direct or dialog based on settings)
      smartPrint(printContent, () => {
        toast.success('Bill printed successfully!');
        // Auto-send via WhatsApp/email if customer phone available
        if (completedOrder.customerPhone || completedOrder.customerEmail) {
          autoShareBillAfterPrint({
            customerName: completedOrder.customerName,
            customerPhone: completedOrder.customerPhone,
            customerEmail: completedOrder.customerEmail,
            billNumber: completedOrder.billNumber || completedOrder.id.slice(-6).toUpperCase(),
            total: completedOrder.total,
            items: completedOrder.items,
            subtotal: completedOrder.subtotal,
            tax: completedOrder.tax,
            discount: completedOrder.discount,
          });
        }
      });
    }
    setShowPrintDialog(false);
    setCompletedOrder(null);
  };

  const handleEBill = () => {
    if (completedOrder && customer.phone) {
      toast.success('E-Bill sent to ' + customer.phone);
    } else {
      toast.info('E-Bill feature requires customer phone number');
    }
    setShowPrintDialog(false);
    setCompletedOrder(null);
  };

  const handleSkipPrint = () => {
    toast.success('Order completed!', {
      description: `Order #${completedOrder?.id.slice(-6).toUpperCase()}`
    });
    setShowPrintDialog(false);
    setCompletedOrder(null);
  };

  const generateBillContent = (order: CompletedOrder, _settings: any) => {
    // Use the centralized professional bill template
    return generateProfessionalBill({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
      tableNumber: order.tableNumber ? String(order.tableNumber) : undefined
    });
  };

  const handleHoldBill = () => {
    holdBill();
    toast.info('Bill held successfully');
  };

  const handlePrintKOT = async () => {
    if (cart.length === 0) return;
    // Create KOT order - shows in orders, no sales added
    const order = await createKOTOrder();
    if (order) {
      toast.success(`KOT ${order.kotNumber} sent to kitchen!`);
    }
  };

  const handleKOTAndPrint = () => {
    handlePrintKOT();
    // Also print customer copy
    setTimeout(() => {
      toast.success('Customer copy printed');
    }, 500);
  };

  return (
    <div ref={ref} className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* Print Dialog */}
      {showPrintDialog && completedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-96 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{t('common.paymentSuccessful')}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {t('common.orderNo')} #{completedOrder.id.slice(-6).toUpperCase()}
              </p>
              {completedOrder.tableNumber && (
                <p className="text-primary text-sm mt-1">{t('common.table')} {completedOrder.tableNumber}</p>
              )}
              <p className="text-2xl font-bold text-primary mt-2">
                {formatCurrency(completedOrder.total)}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handlePrintBill}
                className="w-full pos-btn-primary py-3 flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                {t('common.printBill')}
              </button>
              <button
                onClick={handleEBill}
                className="w-full pos-btn-secondary py-3 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {t('common.sendEBill')}
              </button>
              <button
                onClick={handleSkipPrint}
                className="w-full pos-btn-ghost py-3"
              >
                {t('common.skipPrint')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Dialog */}
      {showSplitDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-96 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{t('common.splitBillTitle')}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {t('common.divideTotal')}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-muted-foreground mb-2">{t('common.numberOfPersons')}</label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  onClick={() => setSplitPersons(Math.max(2, splitPersons - 1))}
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <span className="text-4xl font-bold text-primary w-16 text-center">{splitPersons}</span>
                <button
                  onClick={() => setSplitPersons(splitPersons + 1)}
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{t('common.total')}</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>{t('common.perPerson')}</span>
                <span className="text-primary">{formatCurrency(Math.ceil(cartTotal / splitPersons))}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleSplitPaymentConfirm}
                className="w-full pos-btn-success py-3 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {t('common.confirmSplitPayment')}
              </button>
              <button
                onClick={() => {
                  setShowSplitDialog(false);
                  setShowPayment(true);
                }}
                className="w-full pos-btn-ghost py-3"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part Payment Dialog */}
      <PartPaymentDialog
        open={showPartPaymentDialog}
        onOpenChange={setShowPartPaymentDialog}
        totalAmount={cartTotal}
        onConfirm={handlePartPaymentConfirm}
      />


      <div className="p-2 border-b border-border">
        <div className="flex gap-1.5">
          {orderTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setCurrentOrderType(type.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                currentOrderType === type.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              )}
            >
              <type.icon className="w-3.5 h-3.5" />
              {t(type.labelKey)}
            </button>
          ))}
        </div>
        
        {canAccess('tableManagement') && selectedTable && currentOrderType === 'dine-in' && (
          <div className="mt-1.5 px-2 py-1.5 bg-primary/10 rounded-md border border-primary/20 flex items-center justify-between">
            <span className="text-xs text-primary font-medium">{t('common.table')} {selectedTable.number}</span>
            <span className="text-[10px] text-muted-foreground">{selectedTable.capacity} {t('common.seats')}</span>
          </div>
        )}
      </div>

      {/* Customer Details */}
      <CustomerDetails 
        customer={customer} 
        onChange={setCustomer}
        orderType={currentOrderType}
      />

      {/* Held Bills Button */}
      {heldBills.length > 0 && (
        <button
          onClick={() => setShowHeldBills(!showHeldBills)}
          className="mx-3 mt-3 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm font-medium flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Pause className="w-4 h-4" />
            {heldBills.length} {t('common.heldBills')}
          </span>
          <span>{t('common.view')}</span>
        </button>
      )}

      {/* Held Bills List */}
      {showHeldBills && heldBills.length > 0 && (
        <div className="mx-3 mt-2 p-2 bg-secondary rounded-lg space-y-2 max-h-32 overflow-y-auto">
          {heldBills.map((bill) => (
            <button
              key={bill.id}
              onClick={() => {
                recallBill(bill.id);
                setShowHeldBills(false);
                toast.success('Bill recalled');
              }}
              className="w-full px-3 py-2 bg-card rounded-lg text-left hover:bg-muted transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {bill.tableNumber ? `${t('common.table')} ${bill.tableNumber}` : t('pos.takeaway')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {bill.items.length} {t('common.items')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t('pos.emptyCart')}</p>
            <p className="text-xs">{t('pos.addItems')}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.cartItemId || item.id}
              className="bg-secondary rounded-md p-2 animate-scale-in"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-xs leading-tight">{item.name}</h4>
                  {(isEditingEnabled || item.preparationTime === 999 || item.preparationTime === 998) ? (
                    editingPriceId === (item.cartItemId || item.id) ? (
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={() => handleSavePrice(item.cartItemId || item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePrice(item.cartItemId || item.id);
                          if (e.key === 'Escape') setEditingPriceId(null);
                        }}
                        className="w-20 h-5 px-1 py-0.5 mt-0.5 text-[10px] border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div 
                        className="flex items-center gap-1 cursor-pointer group/price text-[10px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
                        onClick={() => {
                          setEditingPriceId(item.cartItemId || item.id);
                          setTempPrice(String(item.price));
                        }}
                      >
                        <span>{formatCurrency(item.price)}</span>
                        <span className="opacity-0 group-hover/price:opacity-100 text-[8px] bg-primary/10 px-1 py-0.2 rounded text-primary">Edit</span>
                      </div>
                    )
                  ) : (
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(item.price)}</p>
                  )}
                </div>
                <button
                  onClick={() => removeFromCart(item.cartItemId || item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  {(isEditingEnabled || item.preparationTime === 999 || item.preparationTime === 998) ? (
                    editingQtyId === (item.cartItemId || item.id) ? (
                      <input
                        type="number"
                        value={tempQty}
                        onChange={(e) => setTempQty(e.target.value)}
                        onBlur={() => handleSaveQty(item.cartItemId || item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveQty(item.cartItemId || item.id);
                          if (e.key === 'Escape') setEditingQtyId(null);
                        }}
                        className="w-16 h-6 text-center font-semibold text-xs border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        min="0.001"
                        step="any"
                      />
                    ) : (
                      <span 
                        className="min-w-6 px-1 text-center font-semibold text-xs cursor-pointer hover:text-primary hover:underline"
                        onClick={() => {
                          setEditingQtyId(item.cartItemId || item.id);
                          setTempQty(String(item.quantity));
                        }}
                      >
                        {item.quantity}
                      </span>
                    )
                  ) : (
                    <span className="w-6 text-center font-semibold text-xs">{item.quantity}</span>
                  )}
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-semibold text-foreground text-xs">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
              {/* Item Notes */}
              <OrderItemNotes
                itemId={item.id}
                itemName={item.name}
                notes={cartItemNotes[item.id] || ''}
                onSave={handleUpdateItemNotes}
              />
            </div>
          ))
        )}
      </div>

      {/* Billing Summary Drop-up */}
      {cart.length > 0 && (
        <BillingSummary
          subtotal={cartSubtotal}
          tax={cartTax}
          discount={discount}
          onDiscountChange={setDiscount}
          orderType={currentOrderType}
        />
      )}

      {/* Cart Actions - Matching Reference Design */}
      {cart.length > 0 && (
        <div className="p-2 border-t border-border space-y-1.5 bg-card">
          {/* Row 1: Split, Complimentary, Total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePayment('split')}
                className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded"
              >
                {t('pos.split')}
              </button>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
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
                  className="w-4 h-4 rounded border-border" 
                />
                <span className="text-foreground">{t('common.complimentary')}</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-destructive rounded flex items-center justify-center">
                <ShoppingBag className="w-3 h-3 text-destructive-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t('common.total')}</span>
              <span className="text-sm font-bold text-foreground">{isComplimentary ? '0' : formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Row 2: Payment Methods */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {paymentSettings.enableCash && (
            <button
              onClick={() => setSelectedPaymentMethod('cash')}
              className={cn(
                "flex items-center gap-1 px-2 py-1 border rounded text-xs transition-colors",
                selectedPaymentMethod === 'cash' 
                  ? "border-primary bg-primary/10" 
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <Banknote className="w-3.5 h-3.5 text-green-600" />
              <span className="font-medium">{t('pos.cash')}</span>
              {selectedPaymentMethod === 'cash' && <Check className="w-3 h-3 text-green-600" />}
            </button>
            )}
            {paymentSettings.enableCard && (
            <button
              onClick={() => setSelectedPaymentMethod('card')}
              className={cn(
                "flex items-center gap-1 px-2 py-1 border rounded text-xs transition-colors",
                selectedPaymentMethod === 'card' 
                  ? "border-primary bg-primary/10" 
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">{t('pos.card')}</span>
              {selectedPaymentMethod === 'card' && <Check className="w-3 h-3 text-primary" />}
            </button>
            )}
            <button
              onClick={() => setSelectedPaymentMethod('upi')}
              className={cn(
                "flex items-center gap-1 px-2 py-1 border rounded text-xs transition-colors",
                selectedPaymentMethod === 'upi' 
                  ? "border-primary bg-primary/10" 
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-medium">{t('pos.upi')}</span>
              {selectedPaymentMethod === 'upi' && <Check className="w-3 h-3 text-purple-500" />}
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('due')}
              className={cn(
                "flex items-center gap-1 px-2 py-1 border rounded text-xs transition-colors",
                selectedPaymentMethod === 'due' 
                  ? "border-primary bg-primary/10" 
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-medium">{t('common.due')}</span>
              {selectedPaymentMethod === 'due' && <Check className="w-3 h-3 text-primary" />}
            </button>
            <Collapsible open={isOtherExpanded} onOpenChange={setIsOtherExpanded} className="inline-flex">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 border border-border rounded text-xs hover:bg-muted transition-colors bg-card">
                  <span className="font-medium">{t('common.other')}</span>
                  {isOtherExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => {
                    setSelectedPaymentMethod('wallet');
                    setIsOtherExpanded(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm transition-colors",
                    selectedPaymentMethod === 'wallet' 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{t('common.wallet')}</span>
                  {selectedPaymentMethod === 'wallet' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
                <button
                  onClick={() => {
                    setSelectedPaymentMethod('credit');
                    setIsOtherExpanded(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm transition-colors",
                    selectedPaymentMethod === 'credit' 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{t('common.credit')}</span>
                  {selectedPaymentMethod === 'credit' && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </button>
              </CollapsibleContent>
            </Collapsible>
            <button
              onClick={() => setShowMorePaymentSheet(true)}
              className="flex items-center gap-1 px-2 py-1 border border-border rounded text-xs hover:bg-muted transition-colors bg-card"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="font-medium">{t('common.more')}</span>
            </button>
          </div>

          {/* Row 3: It's Paid Checkbox - Centered */}
          <div className="flex items-center justify-center">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={isPaid}
                onChange={(e) => {
                  setIsPaid(e.target.checked);
                  if (e.target.checked) {
                    toast.success(t('common.orderMarkedPaid'));
                  }
                }}
                className="w-4 h-4 rounded border-border" 
              />
              <span className="text-foreground">{t('common.itsPaid')}</span>
            </label>
          </div>

          {/* Row 4: Action Buttons */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <button
              onClick={handleSaveBill}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => {
                if (cart.length > 0) {
                  setShowPaidConfirmDialog(true);
                }
              }}
              className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded transition-colors"
            >
              {t('pos.printBill')}
            </button>
            {featureToggles.kotEnabled && canAccess('kot') && (
              <button
                onClick={handlePrintKOT}
                className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded transition-colors"
              >
                KOT
              </button>
            )}
            {featureToggles.kotEnabled && canAccess('kot') && (
              <button
                onClick={handleKOTAndPrint}
                className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded transition-colors"
              >
                {t('common.kotAndPrint')}
              </button>
            )}
            <button
              onClick={handleHoldBill}
              className="px-3 py-1 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded transition-colors bg-card"
            >
              {t('pos.holdBill')}
            </button>
          </div>
        </div>
      )}

      {/* More Payment Methods Sheet - Slides from Bottom */}
      <Sheet open={showMorePaymentSheet} onOpenChange={setShowMorePaymentSheet}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold text-center">{t('common.morePaymentOptions')}</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-3 pb-4">
            {/* Payment Options Grid */}
            <div className="grid grid-cols-3 gap-3">
              {paymentSettings.enableCash && (
              <button
                onClick={() => handlePayment('cash')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <Banknote className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">{t('pos.cash')}</span>
              </button>
              )}
              {paymentSettings.enableCard && (
              <button
                onClick={() => handlePayment('card')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-sm font-medium">{t('pos.card')}</span>
              </button>
              )}
              <button
                onClick={() => handlePayment('upi')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-medium">{t('pos.upi')}</span>
              </button>
              <button
                onClick={() => handlePayment('due')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">{t('common.due')}</span>
              </button>
              {paymentSettings.enablePartialPayment && (
              <button
                onClick={() => handlePayment('part')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <Split className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">{t('common.partPayment')}</span>
              </button>
              )}
              {paymentSettings.enableSplitPayment && (
              <button
                onClick={() => handlePayment('split')}
                className="h-16 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">{t('common.split')}</span>
              </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Complimentary Notes Dialog */}
      <Sheet open={showComplimentaryDialog} onOpenChange={setShowComplimentaryDialog}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold text-center">Complimentary Order</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground text-center">
              Please provide a reason for this complimentary order.
            </p>
            <textarea
              value={complimentaryNote}
              onChange={(e) => setComplimentaryNote(e.target.value)}
              placeholder="Enter reason (e.g., VIP customer, promotional offer, manager approval...)"
              className="w-full h-24 p-3 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setShowComplimentaryDialog(false);
                  setComplimentaryNote('');
                }}
                className="px-6 py-2 border border-border rounded text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (complimentaryNote.trim()) {
                    setIsComplimentary(true);
                    setShowComplimentaryDialog(false);
                    toast.success('Complimentary order enabled', {
                      description: `Reason: ${complimentaryNote}`
                    });
                  } else {
                    toast.error('Please provide a reason for the complimentary order');
                  }
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* It's Paid Confirmation Dialog */}
      {showPaidConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">It's Paid?</h3>
              <p className="text-sm text-muted-foreground">Has the customer paid for this order?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowPaidConfirmDialog(false);
                  setIsPaid(false);
                  processPayment(selectedPaymentMethod || 'cash');
                }}
                className="py-3 rounded-xl bg-secondary text-foreground font-bold text-base hover:bg-muted transition-colors"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowPaidConfirmDialog(false);
                  setIsPaid(true);
                  // Process payment directly
                  processPayment(selectedPaymentMethod || 'cash');
                }}
                className="py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Yes, Paid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

Cart.displayName = 'Cart';
