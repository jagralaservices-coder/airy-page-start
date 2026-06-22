// Print utility functions - window.open based printing
import { toast } from 'sonner';
import { isNativeApp, nativePrint } from './nativePrint';

interface PrintSettings {
  enableDirectPrint: boolean;
  printDelay: number;
  autoPrintOnComplete: boolean;
  selectedPrinter?: string;
}

export const getPrintSettings = (): PrintSettings => {
  const saved = localStorage.getItem('pos_print_settings');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    enableDirectPrint: true,
    printDelay: 300,
    autoPrintOnComplete: false
  };
};

/**
 * Thermal printer optimized styles
 */
const getThermalPrintStyles = () => `
  @page {
    size: auto;
    margin: 2mm;
  }
  @media print {
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 5mm !important;
      font-family: 'Arial Black', Arial, Helvetica, sans-serif !important;
      font-size: 16px !important;
      line-height: 1.4 !important;
      color: #000 !important;
      background: #fff !important;
      font-weight: 700 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    * {
      box-sizing: border-box !important;
      color: #000 !important;
      font-weight: inherit !important;
    }
    .store-name {
      font-size: 28px !important;
      font-weight: 900 !important;
      letter-spacing: 2px !important;
    }
    .grand-total {
      font-size: 26px !important;
      font-weight: 900 !important;
    }
    .payment-box {
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 2px 0 !important;
    }
    .logo-container {
      text-align: center !important;
      margin-bottom: 10px !important;
    }
    .logo-container img,
    img {
      display: inline-block !important;
      visibility: visible !important;
      opacity: 1 !important;
      max-width: none !important;
      max-height: none !important;
      height: auto !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .items-header {
      font-size: 16px !important;
      font-weight: 900 !important;
      border-width: 3px !important;
    }
    .item-row {
      font-size: 15px !important;
      font-weight: 700 !important;
      padding: 8px 0 !important;
    }
    .item-row .col-qty {
      font-size: 16px !important;
      font-weight: 900 !important;
    }
    .item-row .col-amt {
      font-weight: 900 !important;
    }
    .order-info {
      font-size: 16px !important;
      font-weight: 700 !important;
    }
    .order-info-value {
      font-weight: 800 !important;
    }
    .total-row {
      font-size: 16px !important;
      font-weight: 700 !important;
    }
    .total-row.subtotal {
      font-size: 17px !important;
      font-weight: 800 !important;
    }
    .footer-thanks {
      font-size: 18px !important;
      font-weight: 900 !important;
    }
    table {
      width: 100% !important;
      table-layout: auto !important;
      word-break: break-word !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    * {
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
    }
  }
`;

/**
 * Inject thermal styles into bill HTML (only once)
 */
const injectThermalStyles = (content: string): string => {
  if (content.includes('<style>')) {
    return content.replace('<style>', `<style>${getThermalPrintStyles()}`);
  }
  return content.replace('</head>', `<style>${getThermalPrintStyles()}</style></head>`);
};

/**
 * Wait for all images in a document to load
 */
const waitForImages = (doc: Document, timeout = 3000): Promise<void> => {
  return new Promise((resolve) => {
    const images = Array.from(doc.images);
    const pending = images.filter(img => !img.complete);
    
    if (pending.length === 0) {
      resolve();
      return;
    }

    let done = false;
    let loaded = 0;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    pending.forEach(img => {
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= pending.length) finish();
      };
    });

    setTimeout(finish, timeout);
  });
};

/**
 * Silent print using hidden iframe — avoids opening a visible window/dialog.
 * Falls back to window.open if iframe printing is not supported.
 */
export const silentIframePrint = (content: string, onComplete?: () => void) => {
  const styledContent = injectThermalStyles(content);

  console.log('[Print] Silent iframe print...');

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:600px;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const iframeWin = iframe.contentWindow;
  const iframeDoc = iframeWin?.document;
  if (!iframeDoc || !iframeWin) {
    console.warn('[Print] Iframe not available, falling back to window.open');
    document.body.removeChild(iframe);
    windowPrint(styledContent, onComplete);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(styledContent);
  iframeDoc.close();

  const triggerPrint = () => {
    try {
      iframeWin.focus();
      console.log('[Print] Triggering silent print');
      iframeWin.print();
    } catch (e) {
      console.error('[Print] Silent print failed:', e);
    }
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
      onComplete?.();
    }, 1000);
  };

  const images = Array.from(iframeDoc.images);
  const pending = images.filter(img => !img.complete);

  if (pending.length === 0) {
    setTimeout(triggerPrint, 300);
  } else {
    console.log(`[Print] Waiting for ${pending.length} image(s)...`);
    let loaded = 0;
    let triggered = false;
    const onImageReady = () => {
      loaded++;
      if (!triggered && loaded >= pending.length) {
        triggered = true;
        setTimeout(triggerPrint, 100);
      }
    };
    pending.forEach(img => {
      img.onload = onImageReady;
      img.onerror = onImageReady;
    });
    setTimeout(() => {
      if (!triggered) {
        triggered = true;
        triggerPrint();
      }
    }, 3000);
  }
};

/**
 * Primary print method using window.open — reliable across all browsers
 * IMPORTANT: This must be called synchronously from a click handler to avoid popup blocking.
 */
const windowPrint = (content: string, onComplete?: () => void, existingWindow?: Window | null) => {
  const styledContent = injectThermalStyles(content);

  console.log('[Print] Opening print window...');
  console.log('[Print] Bill HTML length:', styledContent.length);

  const printWindow = existingWindow ?? window.open('', '_blank', 'width=420,height=800,menubar=no,toolbar=no,location=no,status=no');

  if (!printWindow) {
    console.warn('[Print] Popup blocked, falling back to iframe');
    alert('Please allow popups for printing');
    silentIframePrint(content, onComplete);
    return;
  }

  console.log(existingWindow ? '[Print] Reusing pre-opened print window' : '[Print] Window opened successfully');

  const doc = printWindow.document;
  doc.open();
  doc.write(styledContent);
  doc.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      console.log('[Print] Triggering print dialog');
      printWindow.print();
    } catch (e) {
      console.error('[Print] Print failed:', e);
    }
    setTimeout(() => {
      onComplete?.();
    }, 1000);
  };

  const images = Array.from(doc.images);
  const pending = images.filter(img => !img.complete);

  if (pending.length === 0) {
    setTimeout(triggerPrint, 300);
  } else {
    console.log(`[Print] Waiting for ${pending.length} image(s) to load...`);
    let loaded = 0;
    let triggered = false;
    const onImageReady = () => {
      loaded++;
      if (!triggered && loaded >= pending.length) {
        triggered = true;
        setTimeout(triggerPrint, 100);
      }
    };
    pending.forEach(img => {
      img.onload = onImageReady;
      img.onerror = onImageReady;
    });
    setTimeout(() => {
      if (!triggered) {
        triggered = true;
        console.warn('[Print] Image load timeout, printing anyway');
        triggerPrint();
      }
    }, 3000);
  }
};

/**
 * Last-resort iframe fallback (only if popup is blocked)
 */
const iframeFallbackPrint = (content: string, onComplete?: () => void) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:600px;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    onComplete?.();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(content);
  iframeDoc.close();

  setTimeout(async () => {
    await waitForImages(iframeDoc);
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('[Print] Iframe print failed:', e);
    }
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
      onComplete?.();
    }, 500);
  }, 500);
};

/**
 * Direct print — native for Capacitor apps, window.open for browsers
 * IMPORTANT: This is SYNCHRONOUS to preserve user gesture for window.open().
 * Do NOT make this async or call it after an await.
 */
export const directPrint = (content: string, onComplete?: () => void, existingWindow?: Window | null) => {
  console.log('[Print] directPrint called');

  if (!content?.trim()) {
    console.error('[Print] Empty bill content');
    alert('Bill is empty');
    existingWindow?.close();
    onComplete?.();
    return;
  }

  // Check if running in Electron environment for silent printing
  if ((window as any).electronAPI?.isElectron) {
    console.log('[Print] Electron environment detected, using silent print');
    const styledContent = injectThermalStyles(content);
    (window as any).electronAPI.print(styledContent);
    existingWindow?.close();
    onComplete?.();
    return;
  }

  if (isNativeApp()) {
    const styledContent = injectThermalStyles(content);
    nativePrint(styledContent).then(success => {
      if (success) {
        onComplete?.();
      } else {
        windowPrint(content, onComplete, existingWindow);
      }
    });
    return;
  }

  // Check if user has enabled direct/silent print mode
  const printSettings = getPrintSettings();
  if (printSettings.enableDirectPrint && !existingWindow) {
    // Use hidden iframe for silent printing (no visible window)
    silentIframePrint(content, onComplete);
  } else {
    windowPrint(content, onComplete, existingWindow);
  }
};

/**
 * Fallback print method (legacy export, now uses same window.open approach)
 */
export const fallbackPrint = (content: string, onComplete?: () => void) => {
  directPrint(content, onComplete);
};

/**
 * Smart print - unified entry point
 */
export const smartPrint = (content: string, onComplete?: () => void) => {
  directPrint(content, onComplete);
};

/**
 * Test print function
 */
export const testPrint = (printerName?: string) => {
  const testContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Print</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          text-align: center;
          padding: 10px;
        }
        h1 { font-size: 16px; margin-bottom: 10px; }
        p { font-size: 12px; margin: 5px 0; }
        .line { border-top: 1px dashed #000; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>✓ PRINTER TEST</h1>
      <div class="line"></div>
      <p>Printer: ${printerName || 'Default'}</p>
      <p>Time: ${new Date().toLocaleString()}</p>
      <div class="line"></div>
      <p>If you can see this,</p>
      <p>your printer is working!</p>
      <div class="line"></div>
      <p>★ ★ ★ ★ ★</p>
    </body>
    </html>
  `;
  
  smartPrint(testContent, () => {
    toast.success('Test print sent!');
  });
};
