/**
 * Bluetooth Thermal Printer Service
 * Uses capacitor-thermal-printer for native Bluetooth ESC/POS printing
 * Provides true silent printing without any system dialog
 */

import { Capacitor } from '@capacitor/core';

// Dynamic import to avoid errors on web
let CapacitorThermalPrinter: any = null;

const loadPlugin = async () => {
  if (CapacitorThermalPrinter) return CapacitorThermalPrinter;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('capacitor-thermal-printer');
    CapacitorThermalPrinter = mod.CapacitorThermalPrinter;
    return CapacitorThermalPrinter;
  } catch (e) {
    console.warn('[BTPrinter] Plugin not available:', e);
    return null;
  }
};

export interface BluetoothDevice {
  name: string;
  address: string;
}

// ─── Saved printer ───────────────────────────────────────
const BT_PRINTER_KEY = 'bt_thermal_printer';

export const getSavedPrinter = (): BluetoothDevice | null => {
  try {
    const raw = localStorage.getItem(BT_PRINTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const savePrinter = (device: BluetoothDevice) => {
  localStorage.setItem(BT_PRINTER_KEY, JSON.stringify(device));
};

export const clearSavedPrinter = () => {
  localStorage.removeItem(BT_PRINTER_KEY);
};

// ─── Scanning ────────────────────────────────────────────
export const scanForPrinters = (
  onDeviceFound: (devices: BluetoothDevice[]) => void,
  timeoutMs = 10000
): (() => void) => {
  let stopped = false;

  (async () => {
    const plugin = await loadPlugin();
    if (!plugin) {
      console.warn('[BTPrinter] Not available on this platform');
      return;
    }

    // Listen for discovered devices
    const listener = await plugin.addListener(
      'discoverDevices',
      (result: { devices: BluetoothDevice[] }) => {
        if (!stopped) {
          onDeviceFound(result.devices);
        }
      }
    );

    try {
      await plugin.startScan();
    } catch (e) {
      console.error('[BTPrinter] Scan error:', e);
    }

    // Auto-stop after timeout
    setTimeout(() => {
      if (!stopped) {
        stopped = true;
        plugin.stopScan().catch(() => {});
        listener.remove();
      }
    }, timeoutMs);
  })();

  // Return cleanup function
  return () => {
    stopped = true;
    loadPlugin().then(p => {
      if (p) {
        p.stopScan().catch(() => {});
      }
    });
  };
};

// ─── Connection ──────────────────────────────────────────
export const connectToPrinter = async (address: string): Promise<boolean> => {
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    await plugin.connect({ address });
    console.log('[BTPrinter] Connected to', address);
    return true;
  } catch (e) {
    console.error('[BTPrinter] Connection failed:', e);
    return false;
  }
};

export const disconnectPrinter = async (): Promise<void> => {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.disconnect();
  } catch {
    // ignore
  }
};

// ─── Printing ────────────────────────────────────────────

/**
 * Convert HTML bill content to plain-text receipt lines for ESC/POS.
 * This is a simplified parser — handles common bill elements.
 */
const htmlToReceiptText = (html: string): string => {
  // Create a temp DOM to parse
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // Extract text content with line breaks
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').trim();
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    let result = '';

    // Block elements get line breaks
    const isBlock = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'tr', 'li', 'hr', 'br'].includes(tag);

    if (tag === 'hr') return '\n' + '-'.repeat(32) + '\n';
    if (tag === 'br') return '\n';

    const childTexts: string[] = [];
    node.childNodes.forEach(child => {
      const t = walk(child);
      if (t) childTexts.push(t);
    });

    if (tag === 'tr') {
      // Table row — join cells with spacing
      result = childTexts.join('  ');
    } else if (tag === 'td' || tag === 'th') {
      result = childTexts.join(' ');
    } else {
      result = childTexts.join(isBlock ? '\n' : ' ');
    }

    if (isBlock && result) {
      result = '\n' + result + '\n';
    }

    return result;
  };

  let text = walk(body);
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

/**
 * Print bill HTML content to connected Bluetooth thermal printer.
 * Uses ESC/POS encoding via capacitor-thermal-printer.
 */
export const bluetoothPrint = async (htmlContent: string): Promise<boolean> => {
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    const receiptText = htmlToReceiptText(htmlContent);
    const lines = receiptText.split('\n');

    // Begin ESC/POS document
    const encoder = await plugin.begin();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        encoder.newLine();
        continue;
      }

      // Separator lines
      if (/^[-=_]{4,}$/.test(trimmed)) {
        encoder.align('center').text('-'.repeat(32)).newLine();
        continue;
      }

      // Simple heuristic: centered short text (store name, thank you, etc.)
      if (trimmed.length < 30) {
        encoder.align('center').text(trimmed).newLine();
      } else {
        encoder.align('left').text(trimmed).newLine();
      }
    }

    // Feed paper and cut
    encoder.newLine().newLine().newLine().cut();

    // Execute print
    await encoder.print();

    console.log('[BTPrinter] Print successful');
    return true;
  } catch (e) {
    console.error('[BTPrinter] Print error:', e);
    return false;
  }
};

/**
 * Auto-connect to saved printer and print
 */
export const autoConnectAndPrint = async (htmlContent: string): Promise<boolean> => {
  const saved = getSavedPrinter();
  if (!saved) {
    console.warn('[BTPrinter] No saved printer');
    return false;
  }

  const connected = await connectToPrinter(saved.address);
  if (!connected) {
    console.warn('[BTPrinter] Could not connect to saved printer');
    return false;
  }

  return await bluetoothPrint(htmlContent);
};

/**
 * Check if Bluetooth printing is available on this platform
 */
export const isBluetoothPrintAvailable = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if a printer is saved and configured
 */
export const hasConfiguredPrinter = (): boolean => {
  return getSavedPrinter() !== null;
};
