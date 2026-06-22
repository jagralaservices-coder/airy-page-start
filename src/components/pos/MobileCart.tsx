import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { smartPrint, getPrintSettings } from '@/lib/printUtils';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  ChevronUp,
  ChevronDown,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Clock,
  Printer,
  FileText,
  Split,
  Wallet,
  Receipt,
  MoreHorizontal,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PartPaymentDialog } from './PartPaymentDialog';
import { SplitBillDialog } from './SplitBillDialog';
import { usePaymentSound } from '@/hooks/usePaymentSound';
import { useSubscription } from '@/hooks/useSubscription';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface MobileCartProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MobileCart: React.FC<MobileCartProps> = ({ isOpen: controlledIsOpen, onOpenChange: controlledOnOpenChange }) => {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : localIsOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange : setLocalIsOpen;

  const {
    cart,
    updateCartQuantity,
    updateCartItem,
    removeFromCart,
    clearCart,
    cartSubtotal,
    currentOrderType,
    setCurrentOrderType,
    directBillPrint,
    taxPercent,
    setTaxPercent,
    customTax,
    setCustomTax,
    discount,
    setDiscount,
  } = usePOS();

  const [showPayment, setShowPayment] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'due' | 'wallet' | 'credit'>('cash');
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [complimentaryNote, setComplimentaryNote] = useState('');
  const [showComplimentaryDialog, setShowComplimentaryDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showMorePaymentSheet, setShowMorePaymentSheet] = useState(false);
  const [showPartPaymentDialog, setShowPartPaymentDialog] = useState(false);
  const [showSplitBillDialog, setShowSplitBillDialog] = useState(false);
  const [showBillingSummary, setShowBillingSummary] = useState(false);
  const { playSuccessSound } = usePaymentSound();
  const { canAccess } = useSubscription();

  const { getSetting } = useStoreSettings();
  const isEditingEnabled = getSetting('billingSystemSettings')?.enableCartItemEditing ?? false;

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
  
  // Additional charges state
  const [deliveryCharge, setDeliveryCharge] = useState(currentOrderType === 'delivery' ? 40 : 0);
  const [containerCharge, setContainerCharge] = useState(currentOrderType !== 'dine-in' ? 10 : 0);
  const [tip, setTip] = useState(0);
  const [customerPaid, setCustomerPaid] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Calculate custom tax
  const calculatedTax = customTax !== null ? customTax : (cartSubtotal * taxPercent / 100);
  
  // Calculate totals with all charges
  const totalBeforeRounding = cartSubtotal + calculatedTax + deliveryCharge + containerCharge + tip - discount;
  const roundOff = Math.round(totalBeforeRounding) - totalBeforeRounding;
  const grandTotal = Math.round(totalBeforeRounding);
  const returnToCustomer = customerPaid > grandTotal ? customerPaid - grandTotal : 0;

  const allOrderTypes = [
    { id: 'dine-in' as const, label: 'Dine In', icon: UtensilsCrossed },
    { id: 'takeaway' as const, label: 'Pickup', icon: ShoppingBag },
    { id: 'delivery' as const, label: 'Delivery', icon: Truck },
  ];

  const orderTypes = allOrderTypes.filter(t => {
    if (t.id === 'dine-in' && !canAccess('dineIn')) return false;
    if (t.id === 'takeaway' && !canAccess('takeaway')) return false;
    if (t.id === 'delivery' && !canAccess('delivery')) return false;
    return true;
  });



  const handlePayment = (method: 'cash' | 'card' | 'upi' | 'due' | 'wallet' | 'credit') => {
    setSelectedPaymentMethod(method);
    setShowMorePaymentSheet(false);
  };

  const handlePartPaymentConfirm = async (payments: { method: string; amount: number }[]) => {
    const order = await directBillPrint('part', undefined, payments);
    if (order) {
      const paymentDetails = payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(', ');
      toast.success('Part Payment completed!', {
        description: `Bill #${order.billNumber || order.id.slice(-6).toUpperCase()} - ${paymentDetails}`
      });
      setShowPayment(false);
      setIsOpen(false);
    }
  };

  const handleSplitBillConfirm = async (splits: { id: string; name: string; amount: number; paymentMethod: string }[]) => {
    const order = await directBillPrint('cash'); // Split payment recorded
    if (order) {
      toast.success('Split Bill completed!', {
        description: `Bill #${order.billNumber || order.id.slice(-6).toUpperCase()} split between ${splits.length} people`
      });
      setShowPayment(false);
      setIsOpen(false);
    }
  };

  const handlePrintClick = () => {
    // Show paid confirmation popup
    setShowPaidConfirm(true);
  };

  const handleConfirmPrint = async (isPaid: boolean) => {
    if (selectedPaymentMethod === 'credit' && (!customerName.trim() || !customerPhone.trim())) {
      toast.error('Customer details required!', {
        description: 'Please add Customer Name and Phone Number for credit (Khata) bills.'
      });
      return;
    }
    setShowPaidConfirm(false);
    const order = await directBillPrint(
      selectedPaymentMethod,
      selectedPaymentMethod === 'credit' ? { name: customerName, phone: customerPhone } : undefined
    );
    if (order) {
      toast.success(isPaid ? 'Bill printed - Paid!' : 'Bill printed - Payment pending', {
        description: `Bill #${order.billNumber || order.id.slice(-6).toUpperCase()}`
      });
      setShowPayment(false);
      setIsOpen(false);
    }
  };

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Cart Button */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        {!isControlled && (
          <DrawerTrigger asChild>
            <button className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                </div>
                <span className="font-semibold text-lg">View Cart</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl">{formatCurrency(grandTotal)}</span>
                <ChevronUp className="w-5 h-5" />
              </div>
            </button>
          </DrawerTrigger>
        )}

        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-border pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-bold">Your Order</DrawerTitle>
              <button
                onClick={() => {
                  clearCart();
                  setIsOpen(false);
                }}
                className="text-destructive text-sm font-medium"
              >
                Clear All
              </button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto pb-safe">
            <div className="p-4">
            {/* Order Type */}
            <div className="flex gap-2 mb-4">
              {orderTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCurrentOrderType(type.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium transition-all',
                    currentOrderType === type.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  <type.icon className="w-5 h-5" />
                  {type.label}
                </button>
              ))}
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartItemId || item.id}
                  className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      '🍽️'
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{item.name}</h4>
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
                          className="w-20 h-5 px-1 py-0.5 mt-0.5 text-xs border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 cursor-pointer group/price text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
                          onClick={() => {
                            setEditingPriceId(item.cartItemId || item.id);
                            setTempPrice(String(item.price));
                          }}
                        >
                          <span>{formatCurrency(item.price)}</span>
                          <span className="text-[9px] bg-primary/10 px-1 py-0.2 rounded text-primary">Edit</span>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                    )}
                    <p className="text-primary font-bold text-sm mt-0.5">{formatCurrency(item.price * item.quantity)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity - 1)}
                      className="w-9 h-9 rounded-lg bg-background flex items-center justify-center"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
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
                          className="w-16 h-9 text-center font-bold border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          min="0.001"
                          step="any"
                        />
                      ) : (
                        <span 
                          className="min-w-8 px-1 text-center font-bold cursor-pointer hover:text-primary hover:underline"
                          onClick={() => {
                            setEditingQtyId(item.cartItemId || item.id);
                            setTempQty(String(item.quantity));
                          }}
                        >
                          {item.quantity}
                        </span>
                      )
                    ) : (
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                    )}
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity + 1)}
                      className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="border-t border-border p-4 space-y-4 bg-card">
            {!showPayment ? (
            <>
                {/* Bill Summary Toggle Button */}
                <button
                  onClick={() => setShowBillingSummary(!showBillingSummary)}
                  className="w-full flex items-center justify-between p-2 bg-secondary rounded-xl mb-2"
                >
                  <span className="text-sm font-medium">Bill Summary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{formatCurrency(grandTotal)}</span>
                    {showBillingSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Bill Summary */}
                {showBillingSummary && (
                  <div className="space-y-2 p-3 bg-secondary/50 rounded-xl mb-3">
                    {/* Subtotal */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>

                    {/* Discount */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDiscount(Math.max(0, discount - 10))}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={cn("w-14 text-center font-medium", discount > 0 && "text-green-600")}>
                          {discount > 0 ? `-₹${discount}` : '₹0'}
                        </span>
                        <button
                          onClick={() => setDiscount(discount + 10)}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Delivery Charge - only for delivery orders */}
                    {currentOrderType === 'delivery' && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Delivery Charge</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeliveryCharge(Math.max(0, deliveryCharge - 10))}
                            className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-14 text-center font-medium">₹{deliveryCharge}</span>
                          <button
                            onClick={() => setDeliveryCharge(deliveryCharge + 10)}
                            className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Container Charge - for takeaway and delivery */}
                    {currentOrderType !== 'dine-in' && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Container Charge</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setContainerCharge(Math.max(0, containerCharge - 5))}
                            className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-14 text-center font-medium">₹{containerCharge}</span>
                          <button
                            onClick={() => setContainerCharge(containerCharge + 5)}
                            className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tax with Edit */}
                    <div className="flex justify-between items-center text-sm">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTaxDialog(true);
                        }}
                        className="text-muted-foreground flex items-center gap-1 touch-manipulation"
                      >
                        Tax ({taxPercent}%)
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Edit</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCustomTax(Math.max(0, calculatedTax - 5));
                          }}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-14 text-center font-medium">{formatCurrency(calculatedTax)}</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCustomTax(calculatedTax + 5);
                          }}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Tip */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Tip</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTip(Math.max(0, tip - 10))}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-14 text-center font-medium">₹{tip}</span>
                        <button
                          onClick={() => setTip(tip + 10)}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center touch-manipulation"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Round Off */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Round Off</span>
                      <span className={cn("font-medium", roundOff < 0 && "text-green-600")}>
                        {roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border my-2" />

                    {/* Grand Total */}
                    <div className="flex justify-between items-center font-bold">
                      <span>Grand Total</span>
                      <span className="text-lg text-primary">{formatCurrency(grandTotal)}</span>
                    </div>

                    {/* Customer Paid */}
                    <div className="flex justify-between items-center text-sm pt-2">
                      <span className="text-muted-foreground">Customer Paid</span>
                      <input
                        type="number"
                        value={customerPaid || ''}
                        onChange={(e) => setCustomerPaid(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-20 text-right border border-border rounded-lg py-1.5 px-2 text-sm bg-background"
                      />
                    </div>

                    {/* Return to Customer */}
                    {returnToCustomer > 0 && (
                      <div className="flex justify-between items-center py-2 bg-green-500/10 px-2 rounded-lg mt-2">
                        <span className="text-green-600 font-medium text-sm">Return</span>
                        <span className="text-green-600 font-bold">{formatCurrency(returnToCustomer)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsed view - just show totals */}
                {!showBillingSummary && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                      <span>{formatCurrency(calculatedTax)}</span>
                    </div>
                  </div>
                )}
                  
                {/* Complimentary Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-border mb-3">
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
                      className="w-4 h-4 rounded border-border accent-green-500" 
                    />
                    <span className="text-sm font-medium text-foreground">Complimentary</span>
                  </label>
                  {isComplimentary && (
                    <span className="text-xs text-green-600 font-medium">FREE</span>
                  )}
                </div>
                {isComplimentary && complimentaryNote && (
                  <p className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded mb-3">
                    Reason: {complimentaryNote}
                  </p>
                )}

                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform"
                >
                  Pay {formatCurrency(isComplimentary ? 0 : grandTotal)}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-center mb-2">Select Payment Method</h3>
                
                {/* Payment Method Grid - 2x2 for easy touch targets */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => handlePayment('cash')}
                    className={cn(
                      "flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                      selectedPaymentMethod === 'cash' 
                        ? "border-success bg-success/10 text-success font-bold" 
                        : "border-border bg-secondary text-foreground"
                    )}
                  >
                    <Banknote className="w-6 h-6 text-success" />
                    <span className="text-sm font-medium">Cash</span>
                    {selectedPaymentMethod === 'cash' && <Check className="w-4 h-4 text-success ml-auto" />}
                  </button>
                  <button
                    onClick={() => handlePayment('card')}
                    className={cn(
                      "flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                      selectedPaymentMethod === 'card' 
                        ? "border-primary bg-primary/10 text-primary font-bold" 
                        : "border-border bg-secondary text-foreground"
                    )}
                  >
                    <CreditCard className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium">Card</span>
                    {selectedPaymentMethod === 'card' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                  <button
                    onClick={() => handlePayment('upi')}
                    className={cn(
                      "flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                      selectedPaymentMethod === 'upi' 
                        ? "border-purple-500 bg-purple-500/10 text-purple-500 font-bold" 
                        : "border-border bg-secondary text-foreground"
                    )}
                  >
                    <Smartphone className="w-6 h-6 text-purple-500" />
                    <span className="text-sm font-medium">UPI</span>
                    {selectedPaymentMethod === 'upi' && <Check className="w-4 h-4 text-purple-500 ml-auto" />}
                  </button>
                  <button
                    onClick={() => handlePayment('due')}
                    className={cn(
                      "flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                      selectedPaymentMethod === 'due' 
                        ? "border-orange-500 bg-orange-500/10 text-orange-500 font-bold" 
                        : "border-border bg-secondary text-foreground"
                    )}
                  >
                    <Clock className="w-6 h-6 text-orange-500" />
                    <span className="text-sm font-medium">Due</span>
                    {selectedPaymentMethod === 'due' && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                  </button>
                </div>
                
                {/* Full Width More Button */}
                <button
                  onClick={() => setShowMorePaymentSheet(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-xl border border-border bg-secondary transition-all hover:bg-muted font-semibold text-sm active:scale-[0.98]"
                >
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  <span>More Payment Options</span>
                </button>

                {selectedPaymentMethod === 'credit' && (
                  <div className="space-y-3 p-3 bg-amber-500/10 rounded-xl mb-4 border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-600">Credit (Khata) Customer Details Required</p>
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Customer Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* It's Paid Confirmation Popup */}
                {showPaidConfirm ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">It's Paid?</h3>
                      <p className="text-sm text-muted-foreground">Has the customer paid for this order?</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleConfirmPrint(false)}
                        className="py-4 rounded-xl bg-secondary text-foreground font-bold text-lg active:scale-[0.98] transition-transform"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleConfirmPrint(true)}
                        className="py-4 rounded-xl bg-success text-white font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Yes, Paid
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Print Button */}
                    <button
                      onClick={handlePrintClick}
                      className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Print Bill
                    </button>

                    <button
                      onClick={() => setShowPayment(false)}
                      className="w-full py-3 text-muted-foreground font-medium mt-2"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DrawerContent>
      </Drawer>

      {/* Complimentary Dialog */}
      {showComplimentaryDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-card rounded-2xl p-5 w-[90%] max-w-sm shadow-2xl animate-scale-in mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Complimentary Order</h3>
              <p className="text-xs text-muted-foreground">Provide a reason for this free order</p>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={complimentaryNote}
                onChange={(e) => setComplimentaryNote(e.target.value)}
                placeholder="e.g., VIP Guest, Birthday..."
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-base"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowComplimentaryDialog(false);
                  setComplimentaryNote('');
                }}
                className="py-3 rounded-xl bg-secondary text-foreground font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (complimentaryNote.trim()) {
                    setIsComplimentary(true);
                    setShowComplimentaryDialog(false);
                    toast.success('Complimentary enabled', { description: complimentaryNote });
                  } else {
                    toast.error('Please enter a reason');
                  }
                }}
                className="py-3 rounded-xl bg-green-500 text-white font-bold text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Settings Dialog - Fixed z-index and touch */}
      {showTaxDialog && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaxDialog(false);
            }
          }}
        >
          <div 
            className="bg-card rounded-2xl p-5 w-[90%] max-w-sm shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Tax Settings</h3>
              <p className="text-xs text-muted-foreground">Adjust tax percentage or amount</p>
            </div>
            
            <div className="space-y-4 mb-4">
              {/* Tax Percentage Presets */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Tax Percentage</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 5, 12, 18, 28].map((percent) => (
                    <button
                      key={percent}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTaxPercent(percent);
                        setCustomTax(null);
                      }}
                      className={cn(
                        "py-3 rounded-lg text-sm font-medium transition-all border-2 touch-manipulation",
                        taxPercent === percent && customTax === null
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border"
                      )}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Tax Amount */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Tax Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    value={customTax !== null ? customTax : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomTax(val === '' ? null : (Number(val) || 0));
                    }}
                    placeholder={`Auto: ₹${(cartSubtotal * taxPercent / 100).toFixed(0)}`}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-base"
                  />
                </div>
              </div>
              
              {/* No Tax */}
              <button
                onClick={() => {
                  setTaxPercent(0);
                  setCustomTax(0);
                }}
                className="w-full py-2 rounded-lg border border-border text-sm font-medium hover:border-destructive hover:text-destructive transition-colors"
              >
                No Tax (₹0)
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowTaxDialog(false)}
                className="py-2.5 rounded-xl bg-secondary text-foreground font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowTaxDialog(false);
                  toast.success(`Tax: ${formatCurrency(calculatedTax)}`);
                }}
                className="py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Payment Options Sheet */}
      <Sheet open={showMorePaymentSheet} onOpenChange={setShowMorePaymentSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold text-center">More Payment Options</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 pb-6">
            {/* Payment Options Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handlePayment('cash')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Banknote className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              <button
                onClick={() => handlePayment('card')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Card</span>
              </button>
              <button
                onClick={() => handlePayment('upi')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Smartphone className="w-6 h-6 text-purple-500" />
                <span className="text-sm font-medium">UPI</span>
              </button>
              <button
                onClick={() => handlePayment('due')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Clock className="w-6 h-6 text-orange-500" />
                <span className="text-sm font-medium">Due</span>
              </button>
              <button
                onClick={() => {
                  setShowMorePaymentSheet(false);
                  setShowPartPaymentDialog(true);
                }}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Split className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium">Part Pay</span>
              </button>
              <button
                onClick={() => {
                  setShowMorePaymentSheet(false);
                  setShowSplitBillDialog(true);
                }}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-6 h-6 text-indigo-500" />
                <span className="text-sm font-medium">Split Bill</span>
              </button>
              <button
                onClick={() => handlePayment('wallet')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Wallet className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium">Wallet</span>
              </button>
              <button
                onClick={() => handlePayment('credit')}
                className="h-20 rounded-xl border border-border bg-card hover:bg-muted flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Receipt className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-medium">Credit</span>
              </button>
            </div>

            <button
              onClick={() => setShowMorePaymentSheet(false)}
              className="w-full py-3 text-muted-foreground font-medium"
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Part Payment Dialog */}
      <PartPaymentDialog
        open={showPartPaymentDialog}
        onOpenChange={setShowPartPaymentDialog}
        totalAmount={grandTotal}
        onConfirm={handlePartPaymentConfirm}
      />

      {/* Split Bill Dialog */}
      <SplitBillDialog
        open={showSplitBillDialog}
        onOpenChange={setShowSplitBillDialog}
        totalAmount={grandTotal}
        onConfirm={handleSplitBillConfirm}
      />


    </>
  );
};
