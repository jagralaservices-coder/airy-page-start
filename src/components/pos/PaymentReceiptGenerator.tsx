// Stub for PaymentReceiptGenerator. Original module was missing from the
// uploaded source. This no-op keeps imports resolving until the real
// implementation is restored.

export interface PaymentReceiptPayload {
  orderId?: string;
  customerPhone?: string;
  customerEmail?: string;
  total?: number;
  paymentMethod?: string;
  [key: string]: unknown;
}

export async function autoSendPaymentReceipt(
  _payload: PaymentReceiptPayload
): Promise<{ sent: boolean }> {
  // No-op until the receipt-sender is restored.
  return { sent: false };
}

export default autoSendPaymentReceipt;
