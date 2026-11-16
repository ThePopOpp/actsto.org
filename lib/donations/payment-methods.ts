/**
 * How a donation was paid. Stored in donations.payment_provider (existing rows
 * are all "paypal"). Add a method here and in the migration's CHECK constraint
 * together. Client-safe.
 */

export const PAYMENT_METHODS = ["paypal", "check", "cashiers_check", "money_order"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Methods a Super Admin can record by hand. */
export const OFFLINE_PAYMENT_METHODS = ["check", "cashiers_check", "money_order"] as const;
export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  paypal: "PayPal",
  check: "Check",
  cashiers_check: "Cashier's check",
  money_order: "Money order",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isOfflinePaymentMethod(value: unknown): value is OfflinePaymentMethod {
  return typeof value === "string" && (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentMethodLabel(value: string | null | undefined): string {
  return isPaymentMethod(value) ? PAYMENT_METHOD_LABEL[value] : value || "PayPal";
}

/** A check number is required for these (a money order has a serial, but it's optional). */
export function checkNumberRequired(method: OfflinePaymentMethod): boolean {
  return method === "check" || method === "cashiers_check";
}

/**
 * What to show where the PayPal order id would be: "Check #1234",
 * "Money order", or the PayPal capture/order id.
 */
export function paymentReference(d: {
  paymentProvider: string | null | undefined;
  checkNumber?: string | null;
  paymentProviderCaptureId?: string | null;
  paymentProviderOrderId?: string | null;
}): string {
  if (d.paymentProvider && d.paymentProvider !== "paypal") {
    const label = paymentMethodLabel(d.paymentProvider);
    return d.checkNumber ? `${label} #${d.checkNumber}` : label;
  }
  return d.paymentProviderCaptureId ?? d.paymentProviderOrderId ?? "";
}
