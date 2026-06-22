import { Order } from '@/lib/store';

export type PaymentMethodKey = 'cash' | 'card' | 'upi' | 'credit';

export interface PaymentMethodAmounts {
  cash: number;
  card: number;
  upi: number;
  credit: number;
}

export interface PaymentMethodCounts {
  cash: number;
  card: number;
  upi: number;
  credit: number;
}

export interface PaymentBreakdownSummary {
  amounts: PaymentMethodAmounts;
  counts: PaymentMethodCounts;
}

const createEmptyAmounts = (): PaymentMethodAmounts => ({ cash: 0, card: 0, upi: 0, credit: 0 });
const createEmptyCounts = (): PaymentMethodCounts => ({ cash: 0, card: 0, upi: 0, credit: 0 });

const parsePaymentBreakdown = (breakdown: any): Record<string, number> => {
  if (!breakdown) return {};
  if (typeof breakdown === 'string') {
    try {
      breakdown = JSON.parse(breakdown);
    } catch {
      return {};
    }
  }

  if (Array.isArray(breakdown)) {
    return breakdown.reduce<Record<string, number>>((acc, item) => {
      if (!item || typeof item !== 'object') return acc;
      const method = String(item.method || '').toLowerCase().trim();
      const amount = Number(item.amount || 0);
      if (!method || amount <= 0) return acc;
      acc[method] = (acc[method] || 0) + amount;
      return acc;
    }, {});
  }

  if (typeof breakdown === 'object') {
    return Object.entries(breakdown).reduce<Record<string, number>>((acc, [key, value]) => {
      const method = String(key || '').toLowerCase().trim();
      const amount = Number(value || 0);
      if (!method || amount <= 0) return acc;
      acc[method] = (acc[method] || 0) + amount;
      return acc;
    }, {});
  }

  return {};
};

const normalizePaymentMethod = (method: string): PaymentMethodKey | null => {
  if (!method) return null;
  const normalized = method.toLowerCase().trim();
  if (normalized === 'due' || normalized === 'credit') return 'credit';
  if (normalized === 'cash') return 'cash';
  if (normalized === 'card') return 'card';
  if (normalized === 'upi') return 'upi';
  return null;
};

export const getPaymentBreakdownSummary = (order: Order): PaymentBreakdownSummary => {
  const amounts = createEmptyAmounts();
  const counts = createEmptyCounts();
  const method = String(order.paymentMethod || '').toLowerCase().trim();

  if (method === 'part' || method === 'access') {
    let rawBreakdown = order.paymentBreakdown || (order as any).payment_breakdown || (order as any).payment_details || (order as any).paymentDetails;
    
    // Parse stringified JSON if needed
    if (typeof rawBreakdown === 'string') {
      try {
        rawBreakdown = JSON.parse(rawBreakdown);
      } catch {
        // ignore
      }
    }

    // Unwrap nested breakdown object (e.g. { breakdown: { cash: 50 } })
    if (rawBreakdown && typeof rawBreakdown === 'object' && 'breakdown' in rawBreakdown) {
      rawBreakdown = (rawBreakdown as any).breakdown;
    }

    if (rawBreakdown) {
      const breakdown = parsePaymentBreakdown(rawBreakdown);
      
      // Check if the breakdown actually contains parsed payments
      const hasPayments = Object.values(breakdown).some(val => val > 0);
      
      if (hasPayments) {
        Object.entries(breakdown).forEach(([key, amount]) => {
          const paymentMethod = normalizePaymentMethod(key);
          if (!paymentMethod) return;
          amounts[paymentMethod] += (amount ?? 0);
          counts[paymentMethod] += 1;
        });
        return { amounts, counts };
      }
    }

    // Legacy or missing breakdown part payments should not be reported as a separate part bucket.
    amounts.credit += (order.total ?? 0);
    counts.credit += 1;
    return { amounts, counts };
  }

  const paymentMethod = normalizePaymentMethod(method);
  if (paymentMethod) {
    amounts[paymentMethod] += (order.total ?? 0);
    counts[paymentMethod] += 1;
  }

  return { amounts, counts };
};

export const getPaymentAmountTotals = (order: Order): PaymentMethodAmounts => {
  return getPaymentBreakdownSummary(order).amounts;
};

export const parseOrderPaymentBreakdown = (dbOrder: any): Record<string, number> | undefined => {
  if (!dbOrder) return undefined;
  
  // 1. Try payment_breakdown
  let pb = dbOrder.payment_breakdown || dbOrder.paymentBreakdown;
  if (pb) {
    if (typeof pb === 'string') {
      try {
        pb = JSON.parse(pb);
      } catch {}
    }
    // If it's a nested object with "breakdown" key
    if (pb && typeof pb === 'object' && 'breakdown' in pb) {
      pb = pb.breakdown;
    }
    const parsed = parsePaymentBreakdown(pb);
    if (Object.keys(parsed).length > 0) return parsed;
  }

  // 2. Try payment_details
  let pd = dbOrder.payment_details || dbOrder.paymentDetails;
  if (pd) {
    if (typeof pd === 'string') {
      try {
        pd = JSON.parse(pd);
      } catch {}
    }
    // If it's a nested object with "breakdown" key
    if (pd && typeof pd === 'object' && 'breakdown' in pd) {
      pd = pd.breakdown;
    }
    const parsed = parsePaymentBreakdown(pd);
    if (Object.keys(parsed).length > 0) return parsed;
  }

  return undefined;
};
