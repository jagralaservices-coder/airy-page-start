import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    const pressedKey = typeof e.key === 'string' ? e.key : '';

    if (!pressedKey) {
      return;
    }

    if (location.pathname === '/pos') {
      return;
    }

    const shortcuts: ShortcutAction[] = [
      // F-key shortcuts
      { key: 'F1', description: 'Save Order', action: () => toast.info('Save Order triggered') },
      { key: 'F2', description: 'Save & Print Order', action: () => toast.info('Save & Print Order triggered') },
      { key: 'F3', description: 'Generate KOT without Print', action: () => toast.info('Generate KOT without Print triggered') },
      { key: 'F4', description: 'Focus on Add New Item', action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        else toast.info('Focus on Add New Item triggered');
      }},
      { key: 'F5', description: 'New Order', action: () => {
        e.preventDefault();
        navigate('/pos');
        toast.info('New Order - Navigated to POS');
      }},
      { key: 'F6', description: 'Generate KOT with Print', action: () => toast.info('Generate KOT with Print triggered') },
      { key: 'F7', description: 'Search using Table no.', action: () => {
        navigate('/tables');
        toast.info('Table Management opened');
      }},
      { key: 'F8', description: 'Save & eBill Order', action: () => toast.info('Save & eBill Order triggered') },
      { key: 'F9', description: 'Select Delivery', action: () => toast.info('Delivery mode selected') },
      { key: 'F11', description: 'Select Dine In', action: () => toast.info('Dine In mode selected') },
      { key: 'F12', description: 'Select Pick Up', action: () => toast.info('Pick Up mode selected') },
    ];

    const ctrlShortcuts: ShortcutAction[] = [
      { key: 'a', ctrl: true, description: 'Accept online order', action: () => {
        navigate('/online-orders');
        toast.info('Online Orders opened');
      }},
      { key: 'd', ctrl: true, description: 'Calculate Distance', action: () => toast.info('Calculate Distance triggered') },
      { key: 'e', ctrl: true, description: 'Focus on Bill No search', action: () => {
        const billInput = document.querySelector('input[placeholder*="Bill"]') as HTMLInputElement;
        if (billInput) billInput.focus();
        else toast.info('Focus on Bill No search triggered');
      }},
      { key: 'h', ctrl: true, description: 'Help Text', action: () => {
        navigate('/support');
        toast.info('Help page opened');
      }},
      { key: 'i', ctrl: true, description: 'Item Report', action: () => {
        navigate('/reports/item');
        toast.info('Item Report opened');
      }},
      { key: 'k', ctrl: true, description: 'Kot Listing', action: () => {
        navigate('/kitchen');
        toast.info('KOT Listing opened');
      }},
      { key: 'l', ctrl: true, description: 'Logout', action: () => {
        toast.info('Logout triggered - Use logout button for security');
      }},
      { key: 'm', ctrl: true, description: 'Manual Sync', action: () => toast.info('Manual Sync triggered') },
      { key: 'n', ctrl: true, description: 'Notifications', action: () => toast.info('Notifications opened') },
      { key: 'o', ctrl: true, description: 'Order Listing', action: () => {
        navigate('/orders');
        toast.info('Order Listing opened');
      }},
      { key: 'p', ctrl: true, description: 'Online Order Listing', action: () => {
        e.preventDefault();
        navigate('/online-orders');
        toast.info('Online Orders opened');
      }},
      { key: 'r', ctrl: true, description: 'Order Report', action: () => {
        e.preventDefault();
        navigate('/reports/order');
        toast.info('Order Report opened');
      }},
      { key: 's', ctrl: true, description: 'Sales Report', action: () => {
        e.preventDefault();
        navigate('/reports/sales');
        toast.info('Sales Report opened');
      }},
      { key: 't', ctrl: true, description: 'Table Management', action: () => {
        e.preventDefault();
        navigate('/tables');
        toast.info('Table Management opened');
      }},
      { key: 'z', ctrl: true, description: 'On Hold', action: () => {
        e.preventDefault();
        toast.info('On Hold triggered');
      }},
    ];

    const ctrlShiftShortcuts: ShortcutAction[] = [
      { key: 'K', ctrl: true, shift: true, description: 'Kot Live View', action: () => {
        navigate('/kitchen');
        toast.info('KOT Live View opened');
      }},
      { key: 'O', ctrl: true, shift: true, description: 'Orders', action: () => {
        navigate('/orders');
        toast.info('Orders opened');
      }},
    ];

    // Check for Ctrl+Backspace
    if (e.ctrlKey && pressedKey === 'Backspace') {
      e.preventDefault();
      window.history.back();
      toast.info('Navigated back');
      return;
    }

    // Check for End key
    if (pressedKey === 'End') {
      e.preventDefault();
      toast.info('Generate bill from KOT items triggered');
      return;
    }

    // Check Ctrl+Shift shortcuts first
    if (e.ctrlKey && e.shiftKey) {
      const shortcut = ctrlShiftShortcuts.find(s => s.key.toLowerCase() === pressedKey.toLowerCase());
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }

    // Check Ctrl shortcuts
    if (e.ctrlKey && !e.shiftKey) {
      const shortcut = ctrlShortcuts.find(s => s.key.toLowerCase() === pressedKey.toLowerCase());
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }

    // Check F-key shortcuts
    if (pressedKey.startsWith('F') && !e.ctrlKey && !e.shiftKey) {
      const shortcut = shortcuts.find(s => s.key === pressedKey);
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleShortcut]);
};
