import { useEffect, useState } from 'react';

export interface PaymentSettings {
  enableCash: boolean;
  enableCard: boolean;
  enableUPI: boolean;
  enableWallet: boolean;
  enableDue: boolean;
  enableCredit: boolean;
  enablePartialPayment: boolean;
  enableSplitPayment: boolean;
  enableQR: boolean;
  businessDateResetTime: string;
}

const DEFAULTS: PaymentSettings = {
  enableCash: true,
  enableCard: true,
  enableUPI: true,
  enableWallet: true,
  enableDue: true,
  enableCredit: true,
  enablePartialPayment: true,
  enableSplitPayment: true,
  enableQR: true,
  businessDateResetTime: '06:00',
};

const STORAGE_KEY = 'pos_payment_settings';

function read(): PaymentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(() => read());
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = (patch: Partial<PaymentSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return { settings, loaded, update };
}
