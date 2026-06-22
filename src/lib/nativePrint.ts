/**
 * Native Print Utility for Capacitor Apps
 * Uses native printing APIs for silent/direct printing on mobile devices
 */

import { Capacitor } from '@capacitor/core';
import { autoConnectAndPrint, hasConfiguredPrinter, isBluetoothPrintAvailable } from './bluetoothPrinter';

/**
 * Check if running in native app context
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Native print using platform-specific methods
 * Priority: Bluetooth thermal printer > WebView print > Web fallback
 */
export const nativePrint = async (htmlContent: string): Promise<boolean> => {
  const platform = getPlatform();
  
  if (platform === 'web') {
    return webPrint(htmlContent);
  }
  
  // Try Bluetooth thermal printer first (true silent print)
  if (isBluetoothPrintAvailable() && hasConfiguredPrinter()) {
    try {
      console.log('[NativePrint] Attempting Bluetooth thermal print...');
      const btSuccess = await autoConnectAndPrint(htmlContent);
      if (btSuccess) {
        console.log('[NativePrint] Bluetooth print successful');
        return true;
      }
      console.warn('[NativePrint] Bluetooth print failed, falling back to WebView');
    } catch (e) {
      console.warn('[NativePrint] Bluetooth error, falling back:', e);
    }
  }
  
  try {
    if (platform === 'android') {
      return await androidPrint(htmlContent);
    } else if (platform === 'ios') {
      return await iosPrint(htmlContent);
    }
    return false;
  } catch (error) {
    console.error('Native print error:', error);
    return webPrint(htmlContent);
  }
};

/**
 * Android native print using WebView
 */
const androidPrint = async (htmlContent: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Create a hidden iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.cssText = 'position:absolute;left:-9999px;top:0;width:80mm;height:auto;';
      document.body.appendChild(printFrame);
      
      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        
        // Wait for content to load
        setTimeout(() => {
          try {
            printFrame.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(printFrame);
              resolve(true);
            }, 1000);
          } catch (e) {
            document.body.removeChild(printFrame);
            resolve(false);
          }
        }, 500);
      } else {
        resolve(false);
      }
    } catch (error) {
      console.error('Android print error:', error);
      resolve(false);
    }
  });
};

/**
 * iOS native print using UIPrintInteractionController via WebView
 */
const iosPrint = async (htmlContent: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // iOS WebView print
      const printFrame = document.createElement('iframe');
      printFrame.style.cssText = 'position:absolute;left:-9999px;top:0;width:80mm;height:auto;';
      document.body.appendChild(printFrame);
      
      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        
        setTimeout(() => {
          try {
            printFrame.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(printFrame);
              resolve(true);
            }, 1000);
          } catch (e) {
            document.body.removeChild(printFrame);
            resolve(false);
          }
        }, 500);
      } else {
        resolve(false);
      }
    } catch (error) {
      console.error('iOS print error:', error);
      resolve(false);
    }
  });
};

/**
 * Web fallback print using iframe (prevents Chrome redirect on Android)
 */
const webPrint = (htmlContent: string): boolean => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:350px;height:700px;border:none;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 500);
        } catch (e) {
          document.body.removeChild(iframe);
        }
      }, 300);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Web print error:', error);
    return false;
  }
};

/**
 * Bluetooth Thermal Printer Support (for future implementation)
 * This requires additional Capacitor plugins for Bluetooth
 */
export interface ThermalPrinter {
  name: string;
  address: string;
  type: 'bluetooth' | 'usb' | 'network';
}

/**
 * Scan for available thermal printers (placeholder for future)
 */
export const scanPrinters = async (): Promise<ThermalPrinter[]> => {
  // This would require a Capacitor Bluetooth plugin
  // Placeholder for future implementation
  console.log('Printer scanning not yet implemented for native');
  return [];
};

/**
 * Print to specific thermal printer (placeholder for future)
 */
export const printToThermal = async (printer: ThermalPrinter, content: string): Promise<boolean> => {
  // This would require a Capacitor Bluetooth/ESC-POS plugin
  // Placeholder for future implementation
  console.log('Direct thermal printing not yet implemented');
  return nativePrint(content);
};
