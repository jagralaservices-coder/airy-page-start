import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Plus, Minus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { DiscountDialog } from './DiscountDialog';
import { usePOS } from '@/contexts/POSContext';

interface BillingSummaryProps {
  subtotal: number;
  tax: number;
  discount: number;
  onDiscountChange: (amount: number) => void;
  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'online';
}

export const BillingSummary: React.FC<BillingSummaryProps> = ({
  subtotal,
  tax,
  discount,
  onDiscountChange,
  orderType
}) => {
  const { taxPercent, activeStore } = usePOS();
  const taxType = activeStore?.taxType || 'GST';
  const { t, formatCurrency } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  
  // Additional charges state
  const [deliveryCharge, setDeliveryCharge] = useState(orderType === 'delivery' ? 40 : 0);
  const [containerCharge, setContainerCharge] = useState(orderType !== 'dine-in' ? 10 : 0);
  const [customerPaid, setCustomerPaid] = useState(0);
  const [tip, setTip] = useState(0);

  // Calculate values
  const totalBeforeRounding = subtotal + tax + deliveryCharge + containerCharge + tip - discount;
  const roundOff = Math.round(totalBeforeRounding) - totalBeforeRounding;
  const grandTotal = Math.round(totalBeforeRounding);
  const returnToCustomer = customerPaid > grandTotal ? customerPaid - grandTotal : 0;

  const handleApplyDiscount = (amount: number, reason: string) => {
    onDiscountChange(amount);
  };

  return (
    <>
      <DiscountDialog
        open={showDiscountDialog}
        onOpenChange={setShowDiscountDialog}
        subtotal={subtotal}
        currentDiscount={discount}
        onApplyDiscount={handleApplyDiscount}
      />

      <div className="border-t border-border">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{t('common.subtotal')}</span>
            <span className="text-[10px] text-muted-foreground">
              ({formatCurrency(grandTotal)})
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Drop-up Content */}
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-2 pb-2 space-y-1 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">{t('common.subtotal')}</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount with More button */}
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('common.discount')}</span>
                <button
                  onClick={() => setShowDiscountDialog(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <MoreHorizontal className="w-3 h-3" />
                  more
                </button>
              </div>
              <div className="flex items-center gap-2">
                {discount > 0 && (
                  <span className="text-success font-medium">-{formatCurrency(discount)}</span>
                )}
                {discount === 0 && (
                  <span className="text-muted-foreground">{formatCurrency(0)}</span>
                )}
              </div>
            </div>

            {/* Delivery Charge */}
            {(orderType === 'delivery' || deliveryCharge > 0) && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">{t('pos.deliveryCharge')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveryCharge(Math.max(0, deliveryCharge - 10))}
                    className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center font-medium">{formatCurrency(deliveryCharge)}</span>
                  <button
                    onClick={() => setDeliveryCharge(deliveryCharge + 10)}
                    className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Container Charge */}
            {(orderType !== 'dine-in' || containerCharge > 0) && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">{t('pos.containerCharge')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setContainerCharge(Math.max(0, containerCharge - 5))}
                    className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center font-medium">{formatCurrency(containerCharge)}</span>
                  <button
                    onClick={() => setContainerCharge(containerCharge + 5)}
                    className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Tax with More button */}
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('common.tax')} ({taxType} {taxPercent}%)</span>
                <button
                  onClick={() => setShowTaxDetails(!showTaxDetails)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <MoreHorizontal className="w-3 h-3" />
                  more
                </button>
              </div>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>

            {/* Tax Details */}
            {showTaxDetails && (
              <div className="ml-4 p-2 bg-secondary/50 rounded-lg text-xs space-y-1">
                {taxType.toUpperCase() === 'GST' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('pos.cgst')} ({(taxPercent / 2).toFixed(1)}%)</span>
                      <span>{formatCurrency(tax / 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('pos.sgst')} ({(taxPercent / 2).toFixed(1)}%)</span>
                      <span>{formatCurrency(tax / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{taxType} ({taxPercent}%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Round Off */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Round Off</span>
              <span className={cn(
                "font-medium",
                roundOff >= 0 ? "text-foreground" : "text-success"
              )}>
                {roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}
              </span>
            </div>

            {/* Tip */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">{t('pos.tip')}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTip(Math.max(0, tip - 10))}
                  className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-12 text-center font-medium">{formatCurrency(tip)}</span>
                <button
                  onClick={() => setTip(tip + 10)}
                  className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-2" />

            {/* Grand Total */}
            <div className="flex justify-between items-center py-1 text-sm font-bold">
              <span className="text-foreground">{t('pos.grandTotal')}</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>

            {/* Customer Paid */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">{t('pos.received')}</span>
              <input
                type="number"
                value={customerPaid || ''}
                onChange={(e) => setCustomerPaid(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 text-right border border-border rounded-lg py-1 px-2 text-sm bg-background"
              />
            </div>

            {/* Return to Customer */}
            {returnToCustomer > 0 && (
              <div className="flex justify-between items-center py-1 bg-success/10 px-2 rounded-lg">
                <span className="text-success font-medium">{t('pos.change')}</span>
                <span className="text-success font-bold">{formatCurrency(returnToCustomer)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
