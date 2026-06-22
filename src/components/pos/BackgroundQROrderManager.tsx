import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { smartPrint } from '@/lib/printUtils';
import { generateProfessionalBill } from '@/lib/billTemplate';
import { sendQROrderStatusWhatsApp } from '@/lib/billShareUtils';
import { toast } from 'sonner';

export interface QRAutomationSettings {
  autoAcceptEnabled: boolean;
  autoAcceptDelay: number;
  autoSilentPrintEnabled: boolean;
  autoPrintKOTEnabled: boolean;
  autoPrintBillEnabled: boolean;
  qrTableSelectionEnabled: boolean;
  activeQRTables: number;
  selectedPrinter: string;
  alarmEnabled: boolean;
  alarmVolume: number;
  customAlarmSound: string | null;
  customerNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
}

export const DEFAULT_QR_SETTINGS: QRAutomationSettings = {
  autoAcceptEnabled: true,
  autoAcceptDelay: 5,
  autoSilentPrintEnabled: true,
  autoPrintKOTEnabled: true,
  autoPrintBillEnabled: true,
  qrTableSelectionEnabled: true,
  activeQRTables: 10,
  selectedPrinter: '',
  alarmEnabled: true,
  alarmVolume: 1.0,
  customAlarmSound: null,
  customerNotificationsEnabled: true,
  whatsappNotificationsEnabled: true,
};

// Generate KOT HTML for background thermal printing
const generateKOT = (order: any, storeName: string): string => {
  const now = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = (order.items || []).map((item: any) =>
    `<tr><td style="font-size:18px;font-weight:900;padding:6px 0;">${item.name}</td><td style="font-size:20px;font-weight:900;text-align:right;padding:6px 0;">×${item.quantity}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    @page{size:80mm auto;margin:2mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial Black',Arial,sans-serif;width:80mm;max-width:80mm;margin:0 auto;padding:10px 8px;color:#000;background:#fff}
  </style></head><body>
    <div style="text-align:center;border-bottom:3px dashed #000;padding-bottom:10px;margin-bottom:10px">
      <div style="font-size:28px;font-weight:900;letter-spacing:2px">🍳 KOT</div>
      <div style="font-size:14px;font-weight:700;margin-top:4px">${storeName}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:8px">
      <span>Order #${order.order_number}</span>
      <span>QR ORDER</span>
    </div>
    <div style="font-size:12px;margin-bottom:8px">${now}</div>
    ${order.customer_name ? `<div style="font-size:13px;font-weight:700;margin-bottom:4px">Customer: ${order.customer_name}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;border-top:2px solid #000;border-bottom:2px solid #000;margin:8px 0">${itemsHtml}</table>
    ${order.notes ? `<div style="font-size:12px;font-weight:600;border:1px dashed #000;padding:6px;margin-top:8px;border-radius:4px">📝 ${order.notes}</div>` : ''}
    <div style="text-align:center;margin-top:12px;font-size:11px;color:#666">--- QR Menu Order ---</div>
  </body></html>`;
};

export const BackgroundQROrderManager: React.FC = () => {
  const { activeStore } = usePOS();
  const [settings, setSettings] = useState<QRAutomationSettings>(DEFAULT_QR_SETTINGS);
  // Ref mirror of settings so the realtime channel effect doesn't re-subscribe
  // every time a setting toggles (fix #8: duplicate qr_orders subscription).
  const settingsRef = useRef<QRAutomationSettings>(DEFAULT_QR_SETTINGS);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  // Track active pending orders to know when alarm should ring
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // Local print cache to avoid duplicates
  const printedOrders = useRef<Set<string>>(new Set());

  // Local status cache to robustly handle realtime updates
  const orderStatusCache = useRef<Map<string, string>>(new Map());

  // Web Audio Context alarm variables
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  const storeId = activeStore?.id;
  const storeName = activeStore?.name || 'Store';

  // Load configuration safely from localStorage
  const loadSettings = () => {
    if (!storeId) return;
    try {
      const saved = localStorage.getItem(`qr_automation_settings_${storeId}`);
      if (saved) {
        setSettings(JSON.parse(saved));
      } else {
        setSettings(DEFAULT_QR_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_QR_SETTINGS);
    }
  };

  useEffect(() => {
    loadSettings();
    window.addEventListener('qr-settings-updated', loadSettings);
    return () => window.removeEventListener('qr-settings-updated', loadSettings);
  }, [storeId]);

  // Request browser desktop notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // NOTE: initial fetch is now sequenced inside the realtime effect below
  // (fix #13: select-then-subscribe race). Keeping this stub for diff clarity.

  // Auto-Accept Timer Map to track delays
  const autoAcceptTimers = useRef<Map<string, any>>(new Map());

  // Customer Auto Save into database
  const autoSaveCustomer = async (order: any) => {
    if (!order.customer_phone || !storeId) return;
    const phone = order.customer_phone.trim();
    const name = order.customer_name?.trim() || 'Valued Guest';
    let address = '';

    // Extract address if encoded in notes
    if (order.notes && order.notes.includes('Address:')) {
      const parts = order.notes.split('Address:');
      if (parts.length > 1) {
        address = parts[1].trim();
      }
    }

    try {
      // Check if duplicate exists
      const { data: existing } = await supabase
        .from('pos_customers')
        .select('*')
        .eq('store_id', storeId)
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        const updateData: any = {};
        if (!existing.name || existing.name === 'Valued Guest') {
          updateData.name = name;
        }
        if (!existing.address && address) {
          updateData.address = address;
        }
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('pos_customers')
            .update(updateData)
            .eq('id', existing.id);
        }
      } else {
        await supabase
          .from('pos_customers')
          .insert({
            store_id: storeId,
            name: name,
            phone: phone,
            address: address || null,
          });
      }

      // Sync localStorage pos_customers cache
      const cached = localStorage.getItem('pos_customers');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const updated = parsed.filter((c: any) => c.phone !== phone);
          updated.unshift({ name, phone, address });
          localStorage.setItem('pos_customers', JSON.stringify(updated.slice(0, 500)));
          window.dispatchEvent(new Event('pos-customers-updated'));
        } catch {}
      }
    } catch (err) {
      console.error('[QROrderManager] Auto save customer failed:', err);
    }
  };

  // Process printing in the background silently
  const handleAutoSilentPrint = (order: any) => {
    if (printedOrders.current.has(order.id)) return;
    printedOrders.current.add(order.id);

    try {
      console.log(`[QROrderManager] Silent Print triggered for QR-${order.order_number}`);
      
      const printBill = () => {
        if (!settings.autoPrintBillEnabled) return;
        const billHtml = generateProfessionalBill({
          id: order.id,
          billNumber: `QR-${order.order_number}`,
          createdAt: order.created_at,
          orderType: 'QR Order',
          customerName: order.customer_name || undefined,
          customerPhone: order.customer_phone || undefined,
          items: (order.items || []).map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          discount: 0,
          total: order.total,
          paymentMethod: 'Pending',
        });
        smartPrint(billHtml);
      };

      // 1. Print Kitchen Ticket (KOT)
      if (settings.autoPrintKOTEnabled) {
        const kotHtml = generateKOT(order, storeName);
        smartPrint(kotHtml, () => {
          // 2. Print Customer Bill after KOT completes
          printBill();
        });
      } else {
        // Print Customer Bill directly
        printBill();
      }
    } catch (e) {
      console.error('[QROrderManager] Silent printing failed:', e);
    }
  };

  // Perform order auto-accept in database
  const executeAutoAccept = async (order: any) => {
    if (!storeId) return;
    try {
      const { error } = await supabase
        .from('qr_orders')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) {
        console.error('[QROrderManager] Auto accept failed database update:', error.message);
        toast.error(`Auto Accept Failed for Order #${order.order_number}: ${error.message}`);
        return;
      }

      console.log(`[QROrderManager] Order #${order.order_number} auto accepted!`);
      toast.success(`Auto Accepted QR Order #${order.order_number}`);

      // Notify customer of acceptance via WhatsApp
      if (settings.whatsappNotificationsEnabled && order.customer_phone) {
        sendQROrderStatusWhatsApp(
          storeId,
          order.customer_phone,
          order.customer_name || 'Valued Guest',
          storeName,
          order.order_number,
          'accepted',
          order.total
        ).catch(e => console.error('[QROrderManager] WhatsApp dispatch error on auto-accept:', e));
      }
    } catch (e) {
      console.error('[QROrderManager] Auto accept exception:', e);
    }
  };

  // Real-time events processing
  const handleNewQROrder = (order: any) => {
    // 1. Add order to pending lists to trigger audio buzzer
    setPendingOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, order];
    });

    // Cache initial pending status
    orderStatusCache.current.set(order.id, order.status || 'pending');

    // 2. Browser standard desktop popup push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 New QR Order #${order.order_number}`, {
        body: `${order.customer_name || 'Guest'} placed order for ${order.items?.length || 0} items (${storeName})`,
        icon: '/favicon.png',
      });
    }

    // 3. Customer Auto-Save
    autoSaveCustomer(order);

    // 4. Send Initial WhatsApp Pending update
    if (settings.whatsappNotificationsEnabled && order.customer_phone) {
      sendQROrderStatusWhatsApp(
        storeId!,
        order.customer_phone,
        order.customer_name || 'Valued Guest',
        storeName,
        order.order_number,
        'pending',
        order.total
      ).catch(e => console.error('[QROrderManager] WhatsApp dispatch error on insert:', e));
    }

    // 5. Initialize Auto Accept Timer
    if (settings.autoAcceptEnabled) {
      const delay = (settings.autoAcceptDelay || 5) * 1000;
      console.log(`[QROrderManager] Scheduling Auto-Accept in ${delay}ms for Order #${order.order_number}`);
      const timer = setTimeout(() => {
        executeAutoAccept(order);
        autoAcceptTimers.current.delete(order.id);
      }, delay);
      autoAcceptTimers.current.set(order.id, timer);
    }
  };

  const handleUpdateQROrder = (oldOrder: any, newOrder: any) => {
    // If order transitions away from pending, remove from tracking lists
    if (newOrder.status !== 'pending') {
      setPendingOrders(prev => prev.filter(o => o.id !== newOrder.id));
      
      // Cancel pending auto-accept timers if accepted manually
      const timer = autoAcceptTimers.current.get(newOrder.id);
      if (timer) {
        clearTimeout(timer);
        autoAcceptTimers.current.delete(newOrder.id);
      }
    }

    const prevStatusValue = orderStatusCache.current.get(newOrder.id) || oldOrder?.status;
    orderStatusCache.current.set(newOrder.id, newOrder.status);

    // Auto Silent Print on accept transitions
    const hasTransitionedToAccepted = newOrder.status === 'accepted' && prevStatusValue !== 'accepted';
    if (hasTransitionedToAccepted) {
      if (settings.autoSilentPrintEnabled) {
        handleAutoSilentPrint(newOrder);
      }
    }

    // Automatically send WhatsApp order status notification to customer when status transitions
    const hasStatusChanged = prevStatusValue && newOrder.status !== prevStatusValue;
    if (settings.whatsappNotificationsEnabled && newOrder.customer_phone && hasStatusChanged) {
      console.log(`[QROrderManager] Status transition WhatsApp trigger for Order #${newOrder.order_number} to status: ${newOrder.status}`);
      sendQROrderStatusWhatsApp(
        storeId!,
        newOrder.customer_phone,
        newOrder.customer_name || 'Valued Guest',
        storeName,
        newOrder.order_number,
        newOrder.status,
        newOrder.total
      ).catch(e => console.error('[QROrderManager] WhatsApp status transition error:', e));
    }
  };

  // Set up real-time table listener
  // Sequence: await initial fetch FIRST, then subscribe — prevents realtime
  // INSERT firing into an empty cache before fetch resolves (fix #13). Deps
  // intentionally exclude `settings` so toggles don't re-subscribe (fix #8);
  // settings are read live via settingsRef inside handlers.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('qr_orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .gte('created_at', today.toISOString());

      if (cancelled) return;

      if (!error && data) {
        setPendingOrders(data);
        data.forEach((o: any) => {
          orderStatusCache.current.set(o.id, o.status);
        });
      }

      channel = supabase
        .channel(`bg-qr-orders-${storeId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'qr_orders',
          filter: `store_id=eq.${storeId}`,
        }, (payload) => {
          console.log('[QROrderManager] Realtime Background INSERT received:', payload.new);
          handleNewQROrder(payload.new);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_orders',
          filter: `store_id=eq.${storeId}`,
        }, (payload) => {
          console.log('[QROrderManager] Realtime Background UPDATE received:', payload.new);
          handleUpdateQROrder(payload.old, payload.new);
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      autoAcceptTimers.current.forEach(timer => clearTimeout(timer));
      autoAcceptTimers.current.clear();
    };
  }, [storeId]);

  // Alert Sound Engine effect - Loops audio when pendingOrders.length > 0
  useEffect(() => {
    const startAlarm = () => {
      if (!settings.alarmEnabled || pendingOrders.length === 0) {
        stopAlarm();
        return;
      }

      const volume = settings.alarmVolume ?? 1.0;

      // Handle custom uploaded audio
      if (settings.customAlarmSound) {
        stopBuzzer();
        if (!customAudioRef.current) {
          customAudioRef.current = new Audio(settings.customAlarmSound);
          customAudioRef.current.loop = true;
        } else if (customAudioRef.current.src !== settings.customAlarmSound) {
          customAudioRef.current.src = settings.customAlarmSound;
        }
        customAudioRef.current.volume = volume;
        customAudioRef.current.play().catch(e => console.warn('[QRAlarm] Custom audio blocked:', e));
      } else {
        // Alternating loud buzzer tones via browser Web Audio API
        if (customAudioRef.current) {
          customAudioRef.current.pause();
          customAudioRef.current = null;
        }

        if (audioIntervalRef.current) return; // Already running

        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }

          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }

          let toggle = false;
          audioIntervalRef.current = setInterval(() => {
            const ctx = audioCtxRef.current;
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(toggle ? 920 : 1050, ctx.currentTime);
            
            gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.4);

            toggle = !toggle;
          }, 450);
        } catch (err) {
          console.warn('[QRAlarm] Web Audio initialization blocked:', err);
        }
      }
    };

    const stopAlarm = () => {
      stopBuzzer();
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current = null;
      }
    };

    const stopBuzzer = () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };

    // Unlock browser audio context on first screen click
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    startAlarm();

    return () => {
      stopAlarm();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [pendingOrders, settings.alarmEnabled, settings.alarmVolume, settings.customAlarmSound]);

  // Global listener custom trigger for alarm testing settings page
  useEffect(() => {
    const handleTestAlarm = (e: any) => {
      const vol = e.detail?.volume ?? 1.0;
      const sound = e.detail?.sound ?? null;

      // Temporary play
      try {
        if (sound) {
          const snd = new Audio(sound);
          snd.volume = vol;
          snd.play();
        } else {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(950, ctx.currentTime);
          gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch {}
    };

    window.addEventListener('qr-test-alarm', handleTestAlarm);
    return () => window.removeEventListener('qr-test-alarm', handleTestAlarm);
  }, []);

  return null; // Silent background manager, renders no visible layout elements
};
