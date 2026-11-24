import type { PaymentStatus } from '@/lib/api'

/**
 * Single source of truth for how a PaymentStatus is worded and coloured.
 * Merchant and admin views both import from here so they never drift apart.
 */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  detected: 'Incoming',
  verified: 'Confirming',
  confirmed: 'Paid',
  failed: 'Failed',
}

export type PaymentStatusVariant = 'default' | 'secondary' | 'destructive'

export function paymentStatusVariant(status: PaymentStatus): PaymentStatusVariant {
  if (status === 'confirmed') return 'default'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABEL[status] ?? status
}
