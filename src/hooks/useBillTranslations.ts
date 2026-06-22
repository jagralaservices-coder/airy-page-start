import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation, LanguageCode } from '@/lib/i18n';

/**
 * Hook to get bill-specific translations
 * Returns a function that can be used in bill templates
 */
export const useBillTranslations = () => {
  const { language, formatCurrency } = useLocale();
  
  const t = (key: string): string => {
    return getTranslation(key, language);
  };
  
  return { t, formatCurrency, language };
};

/**
 * Static function for bill generation outside React components
 * Takes language as a parameter for use in bill template generation
 */
export const getBillTranslation = (key: string, language: LanguageCode): string => {
  return getTranslation(key, language);
};

/**
 * Get all bill-related translations for a specific language
 * Useful for generating bills with proper translations
 */
export const getBillLabels = (language: LanguageCode) => {
  const t = (key: string) => getTranslation(key, language);
  
  return {
    // Bill header
    taxInvoice: t('bill.taxInvoice'),
    token: t('bill.token'),
    
    // Order info
    billNo: t('bill.billNo'),
    date: t('bill.dateTime'),
    table: t('bill.tableNo'),
    type: t('bill.orderType'),
    time: t('bill.time'),
    
    // Customer
    customer: t('bill.customer'),
    phone: t('bill.phone'),
    email: t('common.email'),
    address: t('bill.address'),
    
    // Items table
    item: t('bill.item'),
    qty: t('bill.qty'),
    rate: t('bill.rate'),
    amt: t('bill.amt'),
    
    // Totals
    subtotal: t('bill.subtotal'),
    gst: t('bill.gst'),
    discount: t('bill.discount'),
    delivery: t('bill.delivery'),
    container: t('bill.container'),
    tip: t('bill.tip'),
    grandTotal: t('bill.grandTotal'),
    
    // Payment
    paidBy: t('bill.paidBy'),
    
    // Footer
    thankYou: t('bill.thankYou'),
    poweredBy: t('common.poweredBy'),
    
    // KOT
    kot: t('bill.kot'),
    kotNo: t('bill.kotNo'),
    kitchenCopy: t('bill.kitchenCopy'),
    
    // Store info
    gstin: t('bill.gstin'),
    fssai: t('bill.fssai'),
    tel: t('bill.tel'),
  };
};

export type BillLabels = ReturnType<typeof getBillLabels>;
