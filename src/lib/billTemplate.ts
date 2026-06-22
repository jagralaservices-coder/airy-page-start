// Professional Bill Template Generator
// Centralized bill generation for consistent formatting across all POS screens
import { getBillLabels, BillLabels } from '@/hooks/useBillTranslations';
import { getStoredLanguage, LanguageCode } from '@/lib/i18n';

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface BillOrder {
  id: string;
  billNumber?: string;
  kotNumber?: string;
  createdAt: string;
  orderType: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  discount: number;
  deliveryCharge?: number;
  containerCharge?: number;
  tip?: number;
  total: number;
  paymentMethod: string;
  paymentBreakdown?: Record<string, number>;
}

interface BillSettings {
  showHeader?: boolean;
  showFooter?: boolean;
  showGST?: boolean;
  showItemDetails?: boolean;
  showPaymentMethod?: boolean;
  showDateTime?: boolean;
  showOrderNumber?: boolean;
  showTableNumber?: boolean;
  showQRCode?: boolean;
  footerText?: string;
  language?: LanguageCode;
}

interface StoreConfig {
  businessName: string;
  tagline?: string;
  address?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  fssai?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  upiId?: string;
}

/**
 * Get store configuration from localStorage
 */
export const getStoreConfig = (): StoreConfig => {
  const billConfig = JSON.parse(localStorage.getItem('pos_bill_config') || '{}');
  const storeDetails = JSON.parse(localStorage.getItem('pos_store_details') || '{}');
  const activeStoreData = JSON.parse(localStorage.getItem('pos_active_store_data') || '{}');
  
  return {
    businessName: billConfig.businessName || activeStoreData.name || storeDetails.name || 'MAXORA',
    tagline: billConfig.tagline || storeDetails.tagline || '',
    address: billConfig.address || activeStoreData.address || storeDetails.address || '',
    city: billConfig.city || storeDetails.city || '',
    pincode: billConfig.pincode || storeDetails.pincode || '',
    phone: billConfig.phone || activeStoreData.phone || storeDetails.phone || '',
    email: billConfig.email || storeDetails.email || '',
    gstin: billConfig.gstin || storeDetails.gstin || '',
    fssai: billConfig.fssai || storeDetails.fssai || '',
    logoUrl: billConfig.logoUrl || '',
    logoWidth: billConfig.logoWidth || 160,
    logoHeight: billConfig.logoHeight || 80,
    upiId: billConfig.upiId || '',
  };
};

/**
 * Get bill settings from localStorage
 */
export const getBillSettings = (): BillSettings => {
  const settings = JSON.parse(localStorage.getItem('pos_bill_settings') || '{}');
  const currentLanguage = getStoredLanguage();
  const labels = getBillLabels(currentLanguage);
  
  return {
    showHeader: settings.showHeader !== false,
    showFooter: settings.showFooter !== false,
    showGST: settings.showGST !== false,
    showItemDetails: settings.showItemDetails !== false,
    showPaymentMethod: settings.showPaymentMethod !== false,
    showDateTime: settings.showDateTime !== false,
    showOrderNumber: settings.showOrderNumber !== false,
    showTableNumber: settings.showTableNumber !== false,
    showQRCode: settings.showQRCode === true,
    footerText: settings.footerText || labels.thankYou,
    language: currentLanguage,
  };
};

/**
 * Generate professional bill HTML content with translations
 */
export const generateProfessionalBill = (order: BillOrder, customSettings?: Partial<BillSettings>): string => {
  const store = getStoreConfig();
  const settings = { ...getBillSettings(), ...customSettings };
  const language = settings.language || getStoredLanguage();
  const labels = getBillLabels(language);
  
  const billDate = new Date(order.createdAt).toLocaleString(language === 'en' ? 'en-IN' : language, {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format full address
  const fullAddress = [store.address, store.city, store.pincode].filter(Boolean).join(', ');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: auto; margin: 2mm; }
        @media print {
          html, body { 
            width: 100% !important;
            max-width: 100% !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          table { width: 100% !important; table-layout: auto !important; }
          img { max-width: 100% !important; height: auto !important; }
          * { overflow-wrap: break-word !important; word-wrap: break-word !important; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Arial Black', Arial, Helvetica, sans-serif;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 10px 8px;
          font-size: 16px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          font-weight: 600;
        }
        
        /* Header Section */
        .header { 
          text-align: center; 
          padding-bottom: 12px; 
          border-bottom: 3px dashed #000; 
          margin-bottom: 10px; 
        }
        .logo-container { 
          margin-bottom: 10px; 
          text-align: center;
          page-break-inside: avoid;
        }
        .logo-container img { 
          max-width: ${store.logoWidth || 160}px; 
          max-height: ${store.logoHeight || 80}px; 
          width: auto;
          height: auto;
          object-fit: contain;
          display: block !important;
          margin: 0 auto !important;
          visibility: visible !important;
          opacity: 1 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          filter: grayscale(100%) contrast(1.5) !important;
          -webkit-filter: grayscale(100%) contrast(1.5) !important;
        }
        .store-name { 
          font-size: 28px; 
          font-weight: 900; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
          margin-bottom: 6px; 
        }
        .store-tagline { 
          font-size: 14px; 
          font-style: italic; 
          font-weight: 600;
          margin-bottom: 8px; 
        }
        .store-info { 
          font-size: 14px; 
          line-height: 1.5;
          font-weight: 600;
        }
        .store-info div { margin: 3px 0; }
        .gst-info { 
          font-size: 13px; 
          font-weight: 800;
          margin-top: 8px; 
          padding-top: 8px; 
          border-top: 2px dotted #000; 
        }
        
        
        /* Order Info */
        .order-info { 
          font-size: 16px; 
          padding: 10px 0; 
          border-bottom: 2px dashed #000; 
          margin-bottom: 10px; 
          font-weight: 600;
        }
        .order-info-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 6px 0; 
        }
        .order-info-label { font-weight: 600; }
        .order-info-value { font-weight: 800; }
        
        /* Customer Box */
        .customer-box { 
          font-size: 14px; 
          padding: 10px; 
          border: 2px solid #000; 
          margin-bottom: 10px;
          font-weight: 600;
        }
        .customer-box div { margin: 4px 0; }
        
        /* Items Section */
        .items-section { margin: 10px 0; }
        .items-header { 
          display: flex; 
          font-size: 16px; 
          font-weight: 900; 
          border-top: 3px solid #000; 
          border-bottom: 3px solid #000; 
          padding: 8px 0; 
          background: #f0f0f0;
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
        }
        .items-header .col-item { flex: 1; padding-left: 2px; }
        .items-header .col-qty { width: 40px; text-align: center; }
        .items-header .col-rate { width: 55px; text-align: right; }
        .items-header .col-amt { width: 65px; text-align: right; padding-right: 2px; }
        
        .item-row { 
          display: flex; 
          font-size: 15px; 
          padding: 8px 0; 
          border-bottom: 2px dotted #666;
          font-weight: 600;
        }
        .item-row:last-child { border-bottom: none; }
        .item-row .col-item { flex: 1; padding-left: 2px; font-weight: 700; }
        .item-row .col-qty { width: 40px; text-align: center; font-weight: 900; font-size: 16px; }
        .item-row .col-rate { width: 55px; text-align: right; font-weight: 700; }
        .item-row .col-amt { width: 65px; text-align: right; font-weight: 900; padding-right: 2px; }
        
        .item-notes { 
          font-size: 13px; 
          color: #222; 
          font-style: italic; 
          padding-left: 12px; 
          margin: 3px 0 5px 0;
          font-weight: 600;
        }
        
        /* Totals Section */
        .totals-section { 
          border-top: 3px solid #000; 
          padding-top: 10px; 
          margin-top: 10px; 
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          font-size: 16px; 
          padding: 6px 0;
          font-weight: 700;
        }
        .total-row.subtotal { 
          padding-bottom: 8px; 
          font-weight: 800;
          font-size: 17px;
        }
        .grand-total { 
          display: flex; 
          justify-content: space-between; 
          font-size: 26px; 
          font-weight: 900; 
          border-top: 4px double #000; 
          border-bottom: 4px double #000; 
          padding: 14px 0; 
          margin-top: 8px; 
        }
        
        /* Payment Box */
        .payment-box { 
          text-align: center; 
          font-size: 12px; 
          font-weight: 600; 
          padding: 2px 0; 
          margin: 4px 0; 
        }
        
        /* Footer */
        .footer { 
          text-align: center; 
          padding-top: 12px; 
          border-top: 3px dashed #000; 
          margin-top: 10px; 
        }
        .footer-thanks { 
          font-size: 18px; 
          font-weight: 900; 
          margin-bottom: 6px; 
        }
        .footer-powered { 
          font-size: 12px; 
          color: #444; 
          margin-top: 6px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      ${settings.showHeader ? `
      <div class="header">
        ${store.logoUrl ? `
        <div class="logo-container">
          <img src="${store.logoUrl}" alt="Logo" style="max-width:${store.logoWidth || 160}px;max-height:${store.logoHeight || 80}px;width:auto;height:auto;object-fit:contain;display:block!important;margin:0 auto!important;visibility:visible!important;opacity:1!important;filter:grayscale(100%) contrast(1.5);-webkit-filter:grayscale(100%) contrast(1.5);-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;" />
        </div>
        ` : ''}
        <div class="store-name">${store.businessName}</div>
        ${store.tagline ? `<div class="store-tagline">${store.tagline}</div>` : ''}
        <div class="store-info">
          ${fullAddress ? `<div>${fullAddress}</div>` : ''}
          ${store.phone ? `<div>${labels.tel}: ${store.phone}</div>` : ''}
          ${store.email ? `<div>${store.email}</div>` : ''}
        </div>
        ${settings.showGST && store.gstin ? `
        <div class="gst-info">
          ${labels.gstin}: ${store.gstin}
          ${store.fssai ? `<br/>${labels.fssai}: ${store.fssai}` : ''}
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="order-info">
        ${settings.showOrderNumber ? `
        <div class="order-info-row">
          <span class="order-info-label">${labels.billNo}:</span>
          <span class="order-info-value">${order.billNumber || order.id.slice(-6).toUpperCase()}</span>
        </div>
        ` : ''}
        ${settings.showDateTime ? `
        <div class="order-info-row">
          <span class="order-info-label">${labels.date}:</span>
          <span class="order-info-value">${billDate}</span>
        </div>
        ` : ''}
        ${settings.showTableNumber && order.tableNumber ? `
        <div class="order-info-row">
          <span class="order-info-label">${labels.table}:</span>
          <span class="order-info-value">${order.tableNumber}</span>
        </div>
        ` : ''}
        <div class="order-info-row">
          <span class="order-info-label">${labels.type}:</span>
          <span class="order-info-value">${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}</span>
        </div>
      </div>
      
      ${order.customerName || order.customerPhone || order.customerEmail ? `
      <div class="customer-box">
        ${order.customerName ? `<div><strong>${labels.customer}:</strong> ${order.customerName}</div>` : ''}
        ${order.customerPhone ? `<div><strong>${labels.phone}:</strong> ${order.customerPhone}</div>` : ''}
        ${order.customerEmail ? `<div><strong>${labels.email || 'Email'}:</strong> ${order.customerEmail}</div>` : ''}
        ${order.customerAddress ? `<div><strong>${labels.address}:</strong> ${order.customerAddress}</div>` : ''}
      </div>
      ` : ''}
      
      ${settings.showItemDetails ? `
      <div class="items-section">
        <div class="items-header">
          <span class="col-item">${labels.item}</span>
          <span class="col-qty">${labels.qty}</span>
          <span class="col-rate">${labels.rate}</span>
          <span class="col-amt">${labels.amt}</span>
        </div>
        ${order.items.map(item => `
          <div class="item-row">
            <span class="col-item">${item.name}</span>
            <span class="col-qty">${item.quantity}</span>
            <span class="col-rate">₹${item.price.toFixed(0)}</span>
            <span class="col-amt">₹${(item.price * item.quantity).toFixed(0)}</span>
          </div>
          ${item.notes ? `<div class="item-notes">→ ${item.notes}</div>` : ''}
        `).join('')}
      </div>
      ` : ''}
      
      <div class="totals-section">
        <div class="total-row subtotal">
          <span>${labels.subtotal}</span>
          <span>₹${order.subtotal.toFixed(2)}</span>
        </div>
        ${settings.showGST && order.tax > 0 ? `
        <div class="total-row">
          <span>${labels.gst}</span>
          <span>₹${order.tax.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.discount > 0 ? `
        <div class="total-row">
          <span>${labels.discount}</span>
          <span>-₹${order.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.deliveryCharge && order.deliveryCharge > 0 ? `
        <div class="total-row">
          <span>${labels.delivery}</span>
          <span>₹${order.deliveryCharge.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.containerCharge && order.containerCharge > 0 ? `
        <div class="total-row">
          <span>${labels.container}</span>
          <span>₹${order.containerCharge.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.tip && order.tip > 0 ? `
        <div class="total-row">
          <span>${labels.tip}</span>
          <span>₹${order.tip.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="grand-total">
          <span>${labels.grandTotal}</span>
          <span>₹${order.total.toFixed(2)}</span>
        </div>
      </div>
      
      ${settings.showPaymentMethod ? `
      <div class="payment-box">
        ${order.paymentMethod === 'part' && order.paymentBreakdown ? `
          <div style="font-weight: 800; text-align: left; border-top: 1px dotted #000; padding-top: 4px; margin-top: 4px; width: 100%;">
            <div style="text-align: center; font-size: 14px; margin-bottom: 4px; font-weight: 900;">-- ${labels.paidBy.toUpperCase()} (PART) --</div>
            ${Object.entries(order.paymentBreakdown)
              .filter(([_, amount]) => amount > 0)
              .map(([method, amount]) => `
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin: 2px 0;">
                  <span>• ${method.toUpperCase()}</span>
                  <span>₹${amount.toFixed(2)}</span>
                </div>
              `).join('')}
          </div>
        ` : `
          <span style="font-weight: 950; font-size: 16px;">${labels.paidBy}: ${order.paymentMethod.toUpperCase()}</span>
        `}
      </div>
      ` : ''}
      
      ${settings.showQRCode && store.upiId ? `
      <div style="text-align:center;padding:10px 0;border-top:2px dashed #000;margin-top:8px;">
        <p style="font-size:14px;font-weight:800;margin-bottom:6px;">Scan & Pay via UPI</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${store.upiId}&pn=${encodeURIComponent(store.businessName)}&am=${order.total.toFixed(2)}&cu=INR`)}" 
          alt="UPI QR" 
          style="width:160px;height:160px;margin:0 auto;display:block;image-rendering:pixelated;" />
        <p style="font-size:11px;margin-top:4px;font-weight:600;">${store.upiId}</p>
        <p style="font-size:12px;font-weight:800;margin-top:2px;">₹${order.total.toFixed(2)}</p>
      </div>
      ` : ''}
      
      ${settings.showFooter ? `
      <div class="footer">
        <div class="footer-thanks">${settings.footerText}</div>
        <div class="footer-powered">${labels.poweredBy} MAXORA</div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
};

/**
 * Generate KOT (Kitchen Order Ticket) HTML content with translations
 */
export const generateKOTContent = (order: BillOrder): string => {
  const store = getStoreConfig();
  const language = getStoredLanguage();
  const labels = getBillLabels(language);
  const kotTime = new Date().toLocaleTimeString(language === 'en' ? 'en-IN' : language, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Courier New', monospace;
          padding: 8px;
          max-width: 80mm;
          margin: 0 auto;
          font-size: 12px;
        }
        .kot-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .kot-title {
          font-size: 18px;
          font-weight: bold;
        }
        .kot-store {
          font-size: 10px;
        }
        .kot-info {
          font-size: 11px;
          padding: 6px 0;
          border-bottom: 1px dashed #000;
        }
        .kot-info div {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .kot-items {
          padding: 8px 0;
        }
        .kot-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px dotted #ccc;
        }
        .kot-item-name {
          flex: 1;
          font-weight: bold;
        }
        .kot-item-qty {
          font-size: 16px;
          font-weight: bold;
          width: 50px;
          text-align: right;
        }
        .kot-item-notes {
          font-size: 10px;
          color: #666;
          font-style: italic;
          padding-left: 8px;
        }
        .kot-footer {
          text-align: center;
          border-top: 2px solid #000;
          padding-top: 6px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="kot-header">
        <div class="kot-title">*** ${labels.kot} ***</div>
        <div class="kot-store">${store.businessName}</div>
      </div>
      
      <div class="kot-info">
        <div>
          <span>${labels.kotNo}:</span>
          <span><strong>${order.kotNumber || order.id.slice(-6).toUpperCase()}</strong></span>
        </div>
        <div>
          <span>${labels.time}:</span>
          <span><strong>${kotTime}</strong></span>
        </div>
        ${order.tableNumber ? `
        <div>
          <span>${labels.table}:</span>
          <span><strong>${order.tableNumber}</strong></span>
        </div>
        ` : ''}
        <div>
          <span>${labels.type}:</span>
          <span><strong>${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}</strong></span>
        </div>
      </div>
      
      <div class="kot-items">
        ${order.items.map(item => `
          <div class="kot-item">
            <span class="kot-item-name">${item.name}</span>
            <span class="kot-item-qty">x${item.quantity}</span>
          </div>
          ${item.notes ? `<div class="kot-item-notes">→ ${item.notes}</div>` : ''}
        `).join('')}
      </div>
      
      <div class="kot-footer">
        ${labels.kitchenCopy}
      </div>
    </body>
    </html>
  `;
};

export type { BillItem, BillOrder, BillSettings, StoreConfig };
